import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { PhotoRecognizer } from 'react-native-vision-camera-ocr-plus';
import { useSharedValue } from 'react-native-reanimated';
import { Worklets } from 'react-native-worklets-core';
import { GS1Parser, GS1ParseResult } from '@/src/shared/lib/gs1Parser';
import * as FileSystem from 'expo-file-system/legacy';
import { Logger } from '@/utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UseCameraPipelineProps {
    scanMode: 'barcode' | 'text';
    onRequestTextMode: (gtin: string, reason: 'unlinked' | 'missing_expiry') => void;
    onPidFoundNatively: () => void;
    onHandoffToJS: (data: { pid: string; nativeSN: string | null; validLines: string[], gs1Data?: GS1ParseResult }) => void;
    onDuplicateFoundNatively: (sn: string) => void;
    gtinMap?: Map<string, any>;
    checkGlobalDuplicateSN: (sn: string) => Promise<boolean>;
}

export function useCameraPipeline({ scanMode, onRequestTextMode, onPidFoundNatively, onHandoffToJS, onDuplicateFoundNatively, gtinMap, checkGlobalDuplicateSN }: UseCameraPipelineProps) {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();

    // ─── React state managed from the JS thread ────────────────────────────────
    const [warningText, setWarningText] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    // ─── Container Dimensions (responsive to UI layout) ────────────────────────
    const [containerLayout, setContainerLayout] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    const cw = useSharedValue(SCREEN_WIDTH);
    const ch = useSharedValue(SCREEN_HEIGHT);

    const onCameraLayout = useCallback((e: any) => {
        const { width, height } = e.nativeEvent.layout;
        setContainerLayout({ width, height });
        cw.value = width;
        ch.value = height;
    }, []);

    // ─── UI ROI math (driven by JS state) ──────────────────────────────────────
    const ROI_WIDTH = containerLayout.width * 0.90;
    const ROI_HEIGHT = 340; // Expanded height to catch SN and weights below PID
    const ROI_X = (containerLayout.width - ROI_WIDTH) / 2;
    const ROI_Y = (containerLayout.height - ROI_HEIGHT) / 2;

    // ─── Worklet shared values (writable from within the frame processor) ──────
    const latestBarcodeSN = useSharedValue<string | null>(null);
    const lockScanning = useSharedValue(false);
    const lastScannedGS1 = useSharedValue<string>('');

    // ─── Dedup guard: prevent re-processing the same barcode that is still in
    //     the camera's field of view after we finished handling it (e.g. after
    //     the duplicate-SN toast timeout unlocks scanning). The value is only
    //     cleared when a *different* barcode enters the frame.
    const lastProcessedBarcode = useRef<string | null>(null);

    // ─── Always-current ref for gtinMap so handleBarcodeOnJS never has a stale ──
    // closure. useCodeScanner freezes its onCodeScanned on the native side, so  ──
    // we can't rely on React re-renders to update the callback.                 ──
    const gtinMapRef = useRef(gtinMap);
    useEffect(() => {
        gtinMapRef.current = gtinMap;
        console.log(`[CameraPipeline] 🔄 gtinMapRef updated — ${gtinMap?.size ?? 0} GTINs tracked: [${Array.from(gtinMap?.keys() ?? []).join(', ')}]`);
    }, [gtinMap]);

    // ─────────────────────────────────────────────────────────────────────────
    // Worklets.createRunOnJS — safe JS thread callbacks
    // ─────────────────────────────────────────────────────────────────────────
    const _notifyPidFound = useCallback(() => {
        setIsLocked(true);
        onPidFoundNatively();
    }, [onPidFoundNatively]);

    const jsNotifyPidFound = useMemo(() => Worklets.createRunOnJS(_notifyPidFound), [_notifyPidFound]);

    // ─── GS1 Barcode handler — runs on JS thread via onCodeScanned ───────────
    // NOTE: gtinMap is intentionally read from gtinMapRef.current (not the closure)
    // so this callback stays stable and useCodeScanner's native-frozen onCodeScanned
    // always sees the latest GTIN mapping without needing to be re-registered.
    const handleBarcodeOnJS = useCallback(async (value: string) => {
        // ── Dedup: skip if this is the exact same barcode string that is still
        //    sitting in the camera view from the last scan we already handled.
        if (value === lastProcessedBarcode.current) {
            console.log(`[BARCODE] ⏩ Skipping — same barcode still in view: ${value.substring(0, 30)}…`);
            return;
        }

        // Lock immediately since this is now an async evaluation
        lockScanning.value = true;
        lastProcessedBarcode.current = value;

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`[BARCODE] Raw scanned value: ${value}`);

        const gs1 = GS1Parser.parse(value);
        console.log(`[BARCODE] GS1 → GTIN: ${gs1.gtin ?? 'none'} | Expiry: ${gs1.expiryDate ? new Date(gs1.expiryDate).toDateString() : 'none'}`);

        latestBarcodeSN.value = value;
        lastScannedGS1.value = JSON.stringify(gs1);

        if (!gs1.gtin) {
            console.log(`[BARCODE] No GTIN found — will use OCR to confirm PID`);
            lockScanning.value = false;
            return;
        }

        // ⭐ PREEMPTIVE DUPLICATE CHECK ⭐
        if (gs1.sn) {
            const isDup = await checkGlobalDuplicateSN(gs1.sn);
            if (isDup) {
                console.log(`[BARCODE] ⚠️ Preemptive duplicate SN block: ${gs1.sn}`);
                onDuplicateFoundNatively(gs1.sn);
                return; // Keep locked
            }
        }

        // Always read from ref so we get the latest map even if this callback
        // was frozen by useCodeScanner on its first render.
        const currentGtinMap = gtinMapRef.current;
        console.log(`[BARCODE] 🗺️ gtinMapRef has ${currentGtinMap?.size ?? 0} entries at scan time`);
        const knownProduct = currentGtinMap?.get(gs1.gtin!);
        console.log(`[BARCODE] GTIN ${gs1.gtin} lookup → ${knownProduct ? `✅ ${knownProduct.name}` : '❌ not found'}`);

        // If the product has a known shelf life stored in the DB, we can compute
        // bestBefore = productionDate + shelfLifeDays without OCR.
        // This covers: Maple Leaf (pre-seeded 11d) and any previously-learned product.
        const hasKnownShelfLife = (knownProduct?.shelfLifeDays ?? 0) > 0;
        const isChickenProduct = knownProduct && (
            knownProduct.name.toLowerCase().includes('prime') ||
            knownProduct.name.toLowerCase().includes('chicken') ||
            knownProduct.type.toLowerCase().includes('chicken') ||
            knownProduct.type.toLowerCase().includes('halal')
        );
        // Requires OCR snap only when: known product + no barcode expiry + chicken type + no shelf life on record
        const productRequiresOCRForExpiry = knownProduct && !gs1.expiryDate && isChickenProduct && !hasKnownShelfLife;

        if (knownProduct && !productRequiresOCRForExpiry) {
            console.log(`[BARCODE] ✅ GTIN ${gs1.gtin} matched → FAST-TRACK for ${knownProduct.name} (PID: ${knownProduct.pid})`);
            _notifyPidFound();
            onHandoffToJS({ pid: knownProduct.pid.toString(), nativeSN: value, validLines: [], gs1Data: gs1 });
        } else {
            if (onRequestTextMode) {
                const reason = !knownProduct ? 'unlinked' : 'missing_expiry';
                onRequestTextMode(gs1.gtin, reason);
            }
        }
    }, [_notifyPidFound, onHandoffToJS, onRequestTextMode, onDuplicateFoundNatively, checkGlobalDuplicateSN]);

    // ─── Code Scanner (Barcode) — runs on JS thread already ──────────────────
    const codeScanner = useCodeScanner({
        codeTypes: ['code-128', 'ean-13', 'upc-a'],
        onCodeScanned: (codes) => {
            if (lockScanning.value || scanMode !== 'barcode') return;
            if (codes.length > 0 && codes[0].value && codes[0].value.length >= 20) {
                handleBarcodeOnJS(codes[0].value);
            }
        }
    });

    // NOTE: No frameProcessor needed. The no-op stub was creating a second
    // ImageAnalysis surface, pushing CameraX above its 3-use-case limit
    // (Preview + CodeScanner + ImageCapture + FrameProcessor = 4 → crash).
    // codeScanner already handles barcode detection; text mode uses photo capture.

    // ─── Static Image OCR Processor (Tap-to-Snap) ────────────────────────────
    const processStaticImageOCR = useCallback(async (imagePath: string) => {
        try {
            console.log(`[STATIC-OCR] 📸 Processing high-res static image at: ${imagePath}`);
            const uri = `file://${imagePath}`;

            const data = await PhotoRecognizer({ uri });

            if (!data || !data.blocks || data.blocks.length === 0) {
                console.log(`[STATIC-OCR] ❌ No text located in photo.`);
                setWarningText('No text found in photo. Please try again.');
                return false;
            }

            const validLines: string[] = [];

            // Simple exact matching for the static pass
            const PID_EXPLICIT_RE = /\bPID[:\s]+(\d{7,8})\b/i;
            const PID_BARE_RE = /(?:^|\s)(\d{7,8})(?:\s|$)/;
            let foundPID: string | null = null;

            for (let b = 0; b < data.blocks.length; b++) {
                const block = data.blocks[b];
                const lines = (block as any).lines as any[];

                for (let l = 0; l < lines.length; l++) {
                    const lineVal = lines[l].lineText;
                    validLines.push(lineVal);

                    // Check for PID
                    const explicitMatch = lineVal.match(PID_EXPLICIT_RE);
                    if (explicitMatch) {
                        foundPID = explicitMatch[1].trim();
                        break;
                    }

                    const strippedSpaces = lineVal.replace(/\s+/g, '');
                    const bareMatch = lineVal.match(PID_BARE_RE) ?? strippedSpaces.match(/^\d{7,8}$/);
                    if (bareMatch && !lineVal.includes('-') && !lineVal.includes('/')) {
                        const matchedPid = bareMatch[1] ?? strippedSpaces;
                        if (matchedPid.length >= 7 && matchedPid.length <= 8) foundPID = matchedPid;
                    }
                }
                if (foundPID) break;
            }

            if (!foundPID) {
                console.log(`[STATIC-OCR] ❌ Failed to find 7-8 digit PID in captured image.`);
                setWarningText('Could not find PID. Make sure it is clear and focused.');
                return false;
            }

            // Normalize PID (e.g. remove any accidentally extracted leading 0s mathematically)
            foundPID = parseInt(foundPID, 10).toString();

            let gs1Data: GS1ParseResult | undefined;
            if (lastScannedGS1.value) {
                try { gs1Data = JSON.parse(lastScannedGS1.value); } catch (_) { }
            }

            setIsLocked(true);
            console.log(`[STATIC-OCR] 🎯 Extracted PID: ${foundPID}`);

            onHandoffToJS({
                pid: foundPID,
                nativeSN: latestBarcodeSN.value,
                validLines: validLines,
                gs1Data: gs1Data
            });

            return true;
        } catch (e) {
            Logger.error('CameraPipeline', 'Static OCR Error', e);
            setWarningText('Error processing image. Please try again.');
            return false;
        } finally {
            // CRITICAL: Clean up the file so we do not bloat storage natively on the phone!
            try {
                // Using the specific imported legacy method to avoid the warning thrown by the proxy
                await FileSystem.deleteAsync(imagePath, { idempotent: true });
                console.log(`[STATIC-OCR] 🗑️ Cleaned up image file from cache.`);
            } catch (err) {
                Logger.error('CameraPipeline', 'Failed to delete temp image', err);
            }
        }
    }, [containerLayout, lastScannedGS1, latestBarcodeSN, onHandoffToJS]);


    const resumeScanning = () => {
        lockScanning.value = false;
        latestBarcodeSN.value = null;   // clear stale SN so it never leaks into the next scan
        lastScannedGS1.value = '';
        // NOTE: lastProcessedBarcode is intentionally NOT cleared here.
        // It is only reset when the camera actually sees a *different* barcode value,
        // preventing the infinite duplicate-toast loop that occurs when resumeScanning
        // unlocks the pipeline while the same barcode is still in the camera's FOV.
        setIsLocked(false);
        setWarningText('');
        console.log(`[SCANNER] 🔄 Scanner resumed — ready for next scan`);
    };

    const roiBorderColor = isLocked ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.5)';

    return {
        device,
        hasPermission,
        requestPermission,
        isCameraActive,
        setIsCameraActive,
        frameProcessor: undefined,
        codeScanner: scanMode === 'barcode' ? codeScanner : undefined,
        warningText,
        roiBorderColor,
        resumeScanning,
        processStaticImageOCR,
        onCameraLayout,
        ROI_X,
        ROI_Y,
        ROI_WIDTH,
        ROI_HEIGHT
    };
}
