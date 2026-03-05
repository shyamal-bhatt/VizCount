import { useState, useCallback, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { useCameraDevice, useCameraPermission, useFrameProcessor, useCodeScanner } from 'react-native-vision-camera';
import { useTextRecognition } from 'react-native-vision-camera-ocr-plus';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue } from 'react-native-reanimated';
import { Worklets } from 'react-native-worklets-core';
import { OpenCV, ObjectType, DataTypes, ColorConversionCodes, BorderTypes } from 'react-native-fast-opencv';
import { GS1Parser, GS1ParseResult } from '@/src/shared/lib/gs1Parser';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UseCameraPipelineProps {
    scanMode: 'barcode' | 'text';
    onRequestTextMode: (gtin: number) => void;
    onPidFoundNatively: () => void;
    onHandoffToJS: (data: { pid: string; nativeSN: string | null; validLines: string[], gs1Data?: GS1ParseResult }) => void;
    gtinMap?: Map<number, any>;
}

export function useCameraPipeline({ scanMode, onRequestTextMode, onPidFoundNatively, onHandoffToJS, gtinMap }: UseCameraPipelineProps) {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const device = useCameraDevice('back');
    const { hasPermission, requestPermission } = useCameraPermission();

    const { scanText } = useTextRecognition({ useLightweightMode: true });
    const { resize } = useResizePlugin();

    // ─── React state managed from the JS thread ────────────────────────────────
    // These replace Reanimated shared values that were causing the crash.
    // Reanimated's scheduler (scheduleOnRNImpl) does NOT exist inside VisionCamera's
    // react-native-worklets runtime — so NO Reanimated reactive APIs (useDerivedValue,
    // useAnimatedReaction) can be triggered from inside useFrameProcessor.
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
    const pidBuffer = useSharedValue<string[]>([]);
    const textBuffer = useSharedValue<string[]>([]); // Buffer for last 5 frames of text
    const lastOCRTime = useSharedValue<number>(0);
    const lastSavedPID = useSharedValue<string>('');
    const lastScannedGS1 = useSharedValue<string>('');
    const frameWidth = useSharedValue(1080);
    const frameHeight = useSharedValue(1920);

    // ─────────────────────────────────────────────────────────────────────────
    // Worklets.createRunOnJS — the only safe way to call JS from VisionCamera's
    // worklet runtime. Do NOT use runOnJS from react-native-reanimated here.
    // ─────────────────────────────────────────────────────────────────────────
    const _setWarning = useCallback((msg: string) => {
        setWarningText(msg);
    }, []);

    const _setLocked = useCallback((locked: boolean) => {
        setIsLocked(locked);
    }, []);

    const _notifyPidFound = useCallback(() => {
        console.log(`[OCR] 🟡 PID stabilising — notifying UI`);
        setIsLocked(true);
        onPidFoundNatively();
    }, [onPidFoundNatively]);

    const _log = useCallback((msg: string) => {
        console.log(msg);
    }, []);

    const _handleOCRHandoff = useCallback((pid: string, nativeSN: string | null, validLines: string[], gs1Json: string) => {
        let gs1Data: GS1ParseResult | undefined;
        if (gs1Json) {
            try { gs1Data = JSON.parse(gs1Json); } catch (_) { }
        }
        console.log(`\n[OCR] 🔒 PID stabilised → ${pid}`);
        console.log(`[OCR] Valid lines (${validLines.length}):`, validLines);
        console.log(`[OCR] GS1 data: ${gs1Data ? JSON.stringify(gs1Data) : 'none'}`);
        onHandoffToJS({ pid, nativeSN, validLines, gs1Data });
    }, [onHandoffToJS]);

    // Stable JS-thread callbacks safe to call from the VisionCamera worklet
    const jsSetWarning = useMemo(() => Worklets.createRunOnJS(_setWarning), [_setWarning]);
    const jsSetLocked = useMemo(() => Worklets.createRunOnJS(_setLocked), [_setLocked]);
    const jsNotifyPidFound = useMemo(() => Worklets.createRunOnJS(_notifyPidFound), [_notifyPidFound]);
    const jsHandleOCRHandoff = useMemo(() => Worklets.createRunOnJS(_handleOCRHandoff), [_handleOCRHandoff]);
    const jsLog = useMemo(() => Worklets.createRunOnJS(_log), [_log]);

    // ─── GS1 Barcode handler — runs on JS thread via onCodeScanned ───────────
    const handleBarcodeOnJS = useCallback((value: string) => {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`[BARCODE] Raw scanned value: ${value}`);
        console.log(`[BARCODE] Parsing as GS1-128...`);

        const gs1 = GS1Parser.parse(value);
        console.log(`[BARCODE] GS1 → GTIN: ${gs1.gtin ?? 'none'} | SN: ${gs1.sn ?? 'none'} | Weight: ${gs1.weight ?? 'none'}kg | Expiry: ${gs1.expiryDate ? new Date(gs1.expiryDate).toDateString() : 'none'} | Production: ${gs1.productionDate ? new Date(gs1.productionDate).toDateString() : 'none'}`);

        // Always store for downstream use
        latestBarcodeSN.value = value;
        lastScannedGS1.value = JSON.stringify(gs1);

        if (!gs1.gtin) {
            console.log(`[BARCODE] No GTIN found — will use OCR to confirm PID`);
            return;
        }

        const knownProduct = gtinMap?.get(gs1.gtin);
        if (knownProduct) {
            console.log(`[BARCODE] ✅ GTIN ${gs1.gtin} matched → FAST-TRACK for ${knownProduct.name} (PID: ${knownProduct.pid})`);
            lockScanning.value = true;
            _notifyPidFound();
            onHandoffToJS({ pid: knownProduct.pid.toString(), nativeSN: value, validLines: [], gs1Data: gs1 });
        } else {
            console.log(`[BARCODE] GTIN ${gs1.gtin} not in catalog — Requesting Text Mode for PID`);
            if (onRequestTextMode) onRequestTextMode(gs1.gtin);
        }
    }, [gtinMap, _notifyPidFound, onHandoffToJS, onRequestTextMode]);

    // ─── Code Scanner (Barcode) — runs on JS thread already ──────────────────
    const codeScanner = useCodeScanner({
        // Widen types enough for retail/GS1, but EXCLUDE 2D matrices (aztec, pdf-417, data-matrix)
        // because searching for 2D matrices on every frame destroys MLKit FPS and causes extreme lag.
        codeTypes: ['code-128', 'ean-13', 'upc-a'],
        onCodeScanned: (codes) => {
            console.log(`[BARCODE-RAW] onCodeScanned fired with ${codes.length} codes`);
            if (lockScanning.value) return;
            if (codes.length > 0) {
                const value = codes[0].value;
                if (value && value.length >= 20) {
                    handleBarcodeOnJS(value);
                } else if (value) {
                    console.log(`[BARCODE] Skipped short value (${value.length} chars): "${value}"`);
                }
            } else {
                console.log(`[BARCODE-RAW] Codes array was empty`);
            }
        }
    });

    // ─── Frame Processor — runs in VisionCamera worklet runtime ──────────────
    // CRITICAL RULES:
    //   ✓ Read/write useSharedValue from react-native-reanimated (safe)
    //   ✓ Call Worklets.createRunOnJS wrappers (safe cross-thread call)
    //   ✗ Do NOT call runOnJS from react-native-reanimated  (crashes)
    //   ✗ Do NOT use useDerivedValue / useAnimatedReaction   (crashes)
    //   ✗ Do NOT call GS1Parser, JSON.parse, console.log    (plain JS, unsafe)
    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        // Immediately exit if we are in barcode mode to free up 100% of the thread
        if (scanMode !== 'text') return;

        frameWidth.value = frame.width;
        frameHeight.value = frame.height;

        const now = Date.now();
        if (now - lastOCRTime.value < 500) return;
        lastOCRTime.value = now;

        if (lockScanning.value) return;

        // ── Camera scale + ROI offset (responsive to actual container size) ──
        const containerW = cw.value;
        const containerH = ch.value;

        const roiW = containerW * 0.90;
        const roiH = 260;
        const roiX = (containerW - roiW) / 2;
        const roiY = (containerH - roiH) / 2;

        const scaleW = containerW / frameWidth.value;
        const scaleH = containerH / frameHeight.value;
        const scale = scaleW > scaleH ? scaleW : scaleH;
        const renderedW = frameWidth.value * scale;
        const renderedH = frameHeight.value * scale;
        const offsetX = (containerW - renderedW) / 2;
        const offsetY = (containerH - renderedH) / 2;

        // ── Image quality check ────────────────────────────────────────────────
        const targetHeight = frame.height / 4;
        const targetWidth = frame.width / 4;

        const resizedBuffer = resize(frame, { scale: { width: targetWidth, height: targetHeight }, pixelFormat: 'bgr', dataType: 'uint8' });
        const bgrMat = OpenCV.frameBufferToMat(targetHeight, targetWidth, 3, resizedBuffer);
        const grayMat = OpenCV.createObject(ObjectType.Mat, targetHeight, targetWidth, DataTypes.CV_8U);
        OpenCV.invoke('cvtColor', bgrMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);
        const laplacianMat = OpenCV.createObject(ObjectType.Mat, targetHeight, targetWidth, DataTypes.CV_64F);
        OpenCV.invoke('Laplacian', grayMat, laplacianMat, DataTypes.CV_64F, 1, 1, 0, BorderTypes.BORDER_DEFAULT);
        const mean = OpenCV.createObject(ObjectType.Mat, 1, 1, DataTypes.CV_64F);
        const stddev = OpenCV.createObject(ObjectType.Mat, 1, 1, DataTypes.CV_64F);

        OpenCV.invoke('meanStdDev', laplacianMat, mean, stddev);
        const blurVariance = OpenCV.matToBuffer(stddev, 'float64').buffer[0] * OpenCV.matToBuffer(stddev, 'float64').buffer[0];
        OpenCV.invoke('meanStdDev', grayMat, mean, stddev);
        const brightnessVal = OpenCV.matToBuffer(mean, 'float64').buffer[0];
        OpenCV.clearBuffers();

        if (blurVariance === 0) return;
        if (blurVariance < 20) { jsSetWarning('Image is blurry. Please hold steady.'); return; }
        if (brightnessVal > 220) { jsSetWarning('Too much reflection/glare. Tilt camera.'); return; }
        if (brightnessVal < 40) { jsSetWarning('Too dark. Move to better lighting.'); return; }
        jsSetWarning('');

        // ── Text (OCR) pass ────────────────────────────────────────────────────
        const data = scanText(frame);
        if (!data || !data.blocks || data.blocks.length === 0) {
            jsLog(`[OCR] No text blocks detected in frame`);
            return;
        }

        const validLines: string[] = [];
        for (let b = 0; b < data.blocks.length; b++) {
            const block = data.blocks[b];
            const lines = (block as any).lines as any[];

            // Map the block's bounding box from Camera Coords -> Screen Coords
            const processElement = (frame: any, text: string, confidence: number | undefined) => {
                if (confidence !== undefined && confidence < 0.65) {
                    jsLog(`[OCR] Rejected low confidence line: "${text}" (${confidence})`);
                    return;
                }

                // Camera frame is rotated 90deg on phones, so X/Y are swapped in the sensor vs the screen
                const sensorX = frame.boundingCenterX;
                const sensorY = frame.boundingCenterY;
                const sensorW = frame.width;
                const sensorH = frame.height;

                // Using 'cover' resize mode:
                const screenCX = (sensorX * scale) + offsetX;
                const screenCY = (sensorY * scale) + offsetY;
                const screenW = sensorW * scale;
                const screenH = sensorH * scale;

                const lineLeft = screenCX - (screenW / 2);
                const lineRight = screenCX + (screenW / 2);
                const lineTop = screenCY - (screenH / 2);
                const lineBottom = screenCY + (screenH / 2);

                const roiBottom = roiY + roiH;
                const roiRight = roiX + roiW;

                // Bounding Box Overlap Test (instead of strict center point check)
                const overlaps =
                    lineTop < roiBottom &&
                    lineBottom > roiY &&
                    lineLeft < roiRight &&
                    lineRight > roiX;

                if (overlaps) {
                    validLines.push(text);
                } else {
                    jsLog(`[OCR] Rejected line outside ROI: "${text}" (Top: ${Math.round(lineTop)}, Bottom: ${Math.round(lineBottom)} | ROI: ${Math.round(roiY)} to ${Math.round(roiBottom)})`);
                }
            };

            if (!lines || lines.length === 0) {
                processElement(block.blockFrame, block.blockText, undefined);
                continue;
            }

            for (let l = 0; l < lines.length; l++) {
                const line = lines[l];
                processElement(line.lineFrame, line.lineText, line.confidence);
            }
        }

        if (validLines.length === 0) {
            jsLog(`[OCR] Blocks detected, but 0 lines inside ROI / high confidence`);
            return;
        }

        // Maintain a rolling buffer of all valid text across the last 5 frames
        let newTextBuf = [...textBuffer.value, ...validLines];
        if (newTextBuf.length > 50) { // arbitrary cap to prevent huge memory leak, keeps ~5 frames of data
            newTextBuf = newTextBuf.slice(newTextBuf.length - 50);
        }
        textBuffer.value = newTextBuf;

        jsLog(`[OCR] Valid lines in ROI (This frame): ${JSON.stringify(validLines)}`);

        // PIDs are always exactly 8 digits.
        const PID_EXPLICIT_RE = /\bPID[:\s]+(\d{8})\b/i;
        const PID_BARE_RE = /^\s*(\d{8})\s*$/;
        let newPidBuf = [...pidBuffer.value];

        for (let i = 0; i < validLines.length; i++) {
            const line = validLines[i];
            const numbersOnly = line.replace(/[^0-9\s]/g, '').trim();
            if (!numbersOnly) continue;

            const pidM = line.match(PID_EXPLICIT_RE) ?? numbersOnly.match(PID_BARE_RE);
            if (pidM) {
                const matchedPid = pidM[1].trim();
                jsLog(`[OCR] 🎯 Matched PID regex: "${matchedPid}" from line "${line}"`);
                if (newPidBuf.length >= 5) newPidBuf.shift();
                newPidBuf.push(matchedPid);
            }
        }

        if (newPidBuf.length !== pidBuffer.value.length) {
            jsLog(`[OCR] PID Buffer updated: ${JSON.stringify(newPidBuf)}`);
            pidBuffer.value = newPidBuf;
        }

        // ── Stabilise PID (needs 3 matching reads) ─────────────────────────────
        const stabilize = (buf: string[]): string | null => {
            'worklet';
            if (buf.length < 3) return null;
            const counts: { [k: string]: number } = {};
            for (let i = 0; i < buf.length; i++) {
                const v = buf[i];
                counts[v] = (counts[v] || 0) + 1;
                if (counts[v] >= 3) return v;
            }
            return null;
        };

        const stablePID = stabilize(newPidBuf);
        if (stablePID) jsNotifyPidFound();
        if (!stablePID) return;
        if (stablePID === lastSavedPID.value) return;

        lockScanning.value = true;
        lastSavedPID.value = stablePID;
        jsSetLocked(true);

        // Pass the entire flattened text buffer to JS for extraction (prevents SN starvation)
        const combinedText = Array.from(new Set(newTextBuf));
        jsHandleOCRHandoff(stablePID, latestBarcodeSN.value, combinedText, lastScannedGS1.value);
    }, [scanText, jsSetWarning, jsSetLocked, jsNotifyPidFound, jsHandleOCRHandoff, jsLog]);

    const resumeScanning = () => {
        lockScanning.value = false;
        pidBuffer.value = [];
        textBuffer.value = [];
        lastScannedGS1.value = '';
        lastSavedPID.value = '';
        setIsLocked(false);
        setWarningText('');
        console.log(`[SCANNER] 🔄 Scanner resumed — ready for next scan`);
    };

    // roiBorderColor as a plain JS value (driven by isLocked React state)
    const roiBorderColor = isLocked ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 255, 255, 0.5)';

    return {
        device,
        hasPermission,
        requestPermission,
        isCameraActive,
        setIsCameraActive,
        frameProcessor,
        // In Vision Camera v4, assigning undefined to codeScanner doesn't always cleanly detach it.
        // We ensure it is only passed when specifically in barcode mode.
        codeScanner: scanMode === 'barcode' ? codeScanner : undefined,
        warningText,
        roiBorderColor,
        resumeScanning,
        onCameraLayout,
        ROI_X,
        ROI_Y,
        ROI_WIDTH,
        ROI_HEIGHT
    };
}
