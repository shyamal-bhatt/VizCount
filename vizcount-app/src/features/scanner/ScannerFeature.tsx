import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, Pressable, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Camera } from 'react-native-vision-camera';
import { Canvas, Path, Rect, Skia, FillType } from '@shopify/react-native-skia';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';

import { useColorScheme } from 'nativewind';
import { StockPulseHeader } from '@/src/shared/ui/StockPulseHeader';
import { ScanProgressHUD } from './ui/ScanProgressHUD';
import { CoolerBottomSheet } from './ui/CoolerBottomSheet';

import { useScannerDB } from './useScannerDB';
import { useCameraPipeline } from './useCameraPipeline';
import { OCRService } from '@/src/shared/lib/ocrRegexEngine';
import { GS1ParseResult } from '@/src/shared/lib/gs1Parser';
import { Logger } from '@/utils/logger';

export function ScannerFeature() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const cameraRef = useRef<Camera>(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);

    const [scanStep, setScanStep] = useState<0 | 1 | 2 | 3>(0);
    const [scanMode, setScanMode] = useState<'barcode' | 'text'>('barcode');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const [toastOpacity] = useState(1);

    const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    }, []);

    const { catalogMap, gtinMap, scannedItems, saveScannedItem, checkDuplicateSN, checkGlobalDuplicateSN, deleteItem, updateItemCount, updateProductGTIN, updateProductShelfLife } = useScannerDB();

    // Always-current ref for catalogMap — handleHandoffToJS is captured inside the
    // native-frozen useCodeScanner callback chain, so its closure may be stale.
    // Reading catalogMapRef.current instead of the closure value ensures we always
    // look up products against the latest map.
    const catalogMapRef = useRef(catalogMap);
    React.useEffect(() => { catalogMapRef.current = catalogMap; }, [catalogMap]);

    // Same pattern for gtinMap — GTIN conflict check in handleHandoffToJS must
    // always see the latest mapping, not a stale closure snapshot.
    const gtinMapRef = useRef(gtinMap);
    React.useEffect(() => { gtinMapRef.current = gtinMap; }, [gtinMap]);

    // Break circular dependency for resumeScanning which is extracted later
    const resumeScanningRef = useRef<() => void>(() => {});

    const handleHandoffToJS = useCallback(async (data: { pid: string; nativeSN: string | null; validLines: string[], gs1Data?: GS1ParseResult }) => {
        try {
            const pid = data.pid; // already a string — no parseInt needed
            const isFastTrack = !!data.gs1Data?.gtin && data.validLines.length === 0;

            console.log(`\n══════════════════════════════════════════════`);
            console.log(`[HANDOFF] Mode: ${isFastTrack ? '⚡ FAST-TRACK (GTIN)' : '📝 TEXT-OCR'}`);
            console.log(`[HANDOFF] PID: ${pid}`);
            if (data.gs1Data) {
                console.log(`[HANDOFF] GS1 → GTIN: ${data.gs1Data.gtin} | SN: ${data.gs1Data.sn ?? 'N/A'} | Weight: ${data.gs1Data.weight ?? 'N/A'}kg | Expiry: ${data.gs1Data.expiryDate ? new Date(data.gs1Data.expiryDate).toDateString() : 'N/A'} | Production: ${data.gs1Data.productionDate ? new Date(data.gs1Data.productionDate).toDateString() : 'N/A'}`);
            }
            if (!isFastTrack) {
                console.log(`[HANDOFF] OCR valid lines (${data.validLines.length}):`, data.validLines);
            }

            // Always read from ref — the closure here may be stale because
            // handleHandoffToJS is passed as onHandoffToJS through the native-frozen
            // barcode callback chain (useCodeScanner freezes onCodeScanned on mount).
            const product = catalogMapRef.current.get(pid);

            if (!product) {
                console.log(`[HANDOFF] ❌ PID ${pid} not found in catalogMapRef (${catalogMapRef.current.size} products). Keys: [${Array.from(catalogMapRef.current.keys()).join(', ')}]`);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showToast(`⚠️ PID ${data.pid} not in catalog. Define it first.`, 'error');
                // █ BUG FIX: must reset HUD + shutter or they stay locked forever
                setScanStep(0);
                setIsProcessingImage(false);
                resumeScanning();
                return;
            }

            // Link GTIN → PID: covers both OCR-confirmed and fast-track-with-unmapped-GTIN paths.
            // Before writing, check if this GTIN is already assigned somewhere to prevent
            // accidental reassignment (e.g. OCR misread PID) and skip redundant writes.
            if (data.gs1Data?.gtin) {
                const scannedGtin = data.gs1Data.gtin;
                const existingOwner = gtinMapRef.current.get(scannedGtin);

                if (existingOwner && existingOwner.pid !== pid) {
                    // GTIN already belongs to a DIFFERENT product — block!
                    console.log(`[HANDOFF] ⛔ GTIN ${scannedGtin} already linked to PID ${existingOwner.pid} ("${existingOwner.name}"), refusing to reassign to PID ${pid}`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    showToast(`⛔ GTIN already linked to ${existingOwner.name} (PID ${existingOwner.pid})`, 'error', 4000);
                    setScanStep(0);
                    setIsProcessingImage(false);
                    resumeScanningRef.current();
                    return;
                } else if (product.gtin === scannedGtin) {
                    // Already correctly linked — skip redundant write
                    console.log(`[HANDOFF] ✅ GTIN ${scannedGtin} already linked to PID ${pid} — no write needed`);
                } else {
                    // New link — write it
                    console.log(`[HANDOFF] 🔗 Linking GTIN ${scannedGtin} → PID ${pid} (product.gtin currently: ${product.gtin ?? 'null'})`);
                    await updateProductGTIN(pid, scannedGtin);
                }
            }

            const { name, type, pack } = product;
            console.log(`[HANDOFF] ✅ Product matched → ${name} (type: ${type}, pack: ${pack})`);
            showToast(`✅ ${name} found — extracting details…`, 'info');
            setScanStep(1);

            // SN stays as a string. Fall back to timestamp string if nothing is found.
            let finalSN: string = Date.now().toString();
            let snString = data.gs1Data?.sn || data.nativeSN || OCRService.extractSNFallback(data.validLines, type);
            console.log(`[HANDOFF] SN source → GS1: ${data.gs1Data?.sn ?? 'none'} | barcode: ${data.nativeSN ?? 'none'}`);
            console.log(`[HANDOFF] Using SN string: ${snString ?? '(fallback to timestamp)'}`);

            if (snString) {
                finalSN = snString;
            }

            if (finalSN) {
                console.log(`[HANDOFF] Checking duplicate SN: ${finalSN}`);
                const isDuplicate = await checkDuplicateSN(pid, finalSN);
                if (isDuplicate) {
                    console.log(`[HANDOFF] ⚠️ Duplicate SN ${finalSN} for PID ${pid} — skipping save`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    showToast(`📄 Already counted — ${name} (SN: ${finalSN})`, 'warning', 2500);
                    // BUG FIX: reset HUD + shutter immediately — never wait for them
                    setScanStep(0);
                    setIsProcessingImage(false);
                    // Only delay camera resume so haptic doesn't loop on same barcode
                    setTimeout(() => {
                        setScanMode('barcode');
                        resumeScanningRef.current();
                    }, 2500);
                    return;
                }
            }

            const extractedNetKg = data.gs1Data?.weight ?? OCRService.extractNetKg(data.validLines);
            console.log(`[HANDOFF] Weight → GS1: ${data.gs1Data?.weight ?? 'none'} | OCR extracted: ${OCRService.extractNetKg(data.validLines)}`);
            console.log(`[HANDOFF] Using weight: ${extractedNetKg} kg`);
            setScanStep(2);

            let bestBeforeDate: number | null = null;

            // ── Path 1: Barcode has explicit expiry (AI 17) ────────────────────
            if (data.gs1Data?.expiryDate) {
                bestBeforeDate = data.gs1Data.expiryDate;
                console.log(`[HANDOFF] ✅ Path 1 — Expiry from GS1 barcode: ${new Date(bestBeforeDate).toDateString()}`);

            // ── Path 2: Product has a known shelf life → compute from prod date ─
            } else if ((product.shelfLifeDays ?? 0) > 0) {
                if (data.gs1Data?.productionDate) {
                    bestBeforeDate = data.gs1Data.productionDate + (product.shelfLifeDays! * 86_400_000);
                    console.log(`[HANDOFF] ✅ Path 2 — shelf life ${product.shelfLifeDays}d + prod date ${new Date(data.gs1Data.productionDate).toDateString()} = BB ${new Date(bestBeforeDate).toDateString()}`);
                } else {
                    // Shelf life is known but no production date in barcode — can't compute expiry
                    console.log(`[HANDOFF] ❌ Path 2 — shelf life known (${product.shelfLifeDays}d) but no production date in barcode`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    showToast('⚠️ No production date in barcode — cannot calculate expiry date', 'error', 4000);
                    setScanStep(0);
                    setIsProcessingImage(false);
                    resumeScanningRef.current();
                    return;
                }

            // ── Path 3 & 4: No shelf life on record → OCR snap was taken ──────
            } else {
                const ocrDates = OCRService.extractDates(data.validLines, data.gs1Data?.productionDate);

                if (ocrDates.bestBeforeDate === null) {
                    // Path 3: OCR ran but could not find a BB date — prompt retry
                    console.log(`[HANDOFF] ❌ Path 3 — OCR found no Best Before date in snap`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    showToast(
                        '⚠️ Best Before date not found. Retake the snap with the BB date clearly visible.',
                        'warning',
                        5000
                    );
                    setScanStep(0);
                    setIsProcessingImage(false);
                    // Stay in text mode — user can immediately retake the snap
                    return;
                }

                // Path 4: OCR found a BB date ✅
                bestBeforeDate = ocrDates.bestBeforeDate;
                console.log(`[HANDOFF] ✅ Path 4 — OCR found BB date: ${new Date(bestBeforeDate).toDateString()}`);

                // Learn shelf life: if we have a production date AND the product doesn't yet
                // have a shelf life stored, compute and persist it for future scans.
                if (data.gs1Data?.productionDate && !(product.shelfLifeDays && product.shelfLifeDays > 0)) {
                    const learnedDays = Math.round((bestBeforeDate - data.gs1Data.productionDate) / 86_400_000);
                    if (learnedDays >= 1 && learnedDays <= 60) {
                        console.log(`[HANDOFF] 📚 Learning shelf life for ${product.name}: ${learnedDays} days`);
                        // Fire-and-forget — don't block the save on this write
                        updateProductShelfLife(pid, learnedDays).catch(e =>
                            console.warn('[HANDOFF] Shelf life write failed (non-blocking):', e)
                        );
                    } else {
                        console.log(`[HANDOFF] ⚠️ Computed shelf life ${learnedDays}d is outside safe range (1–60) — not persisting`);
                    }
                }
            }

            console.log(`[HANDOFF] 📅 Final bestBeforeDate: ${bestBeforeDate ? new Date(bestBeforeDate).toDateString() : 'none'}`);

            console.log(`[HANDOFF] 💾 Saving item → pid:${pid} sn:${finalSN} weight:${extractedNetKg}kg expiry:${bestBeforeDate ? new Date(bestBeforeDate).toDateString() : 'none'}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await saveScannedItem({
                pid,
                netKg: extractedNetKg,
                sn: finalSN,
                name,
                type,
                pack,
                bestBeforeDate
            });

            console.log(`[HANDOFF] ✅ Item saved successfully!`);
            showToast(`✅ ${name} recorded`, 'success');
            setScanStep(3);

            setTimeout(() => {
                setScanStep(0);
                setIsProcessingImage(false);
                setScanMode('barcode'); // Reset back to default barcode mode
                resumeScanningRef.current();
            }, 3500);

        } catch (e) {
            Logger.error('ScannerFeature', 'Error during handoff processing', e);
            console.error(`[HANDOFF] ❌ Unexpected error:`, e);
            setScanStep(0);
            setIsProcessingImage(false);
            setScanMode('barcode');
            resumeScanningRef.current();
        }
    }, [checkDuplicateSN, saveScannedItem, showToast, updateProductGTIN, updateProductShelfLife]); // catalogMap removed — read via catalogMapRef.current

    const [pendingOcrGtin, setPendingOcrGtin] = useState<{ gtin: string; reason: 'unlinked' | 'missing_expiry' } | null>(null);

    const handleRequestTextMode = useCallback((unknownGtin: string, reason: 'unlinked' | 'missing_expiry') => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPendingOcrGtin({ gtin: unknownGtin, reason });
    }, []);

    const handleDuplicateFoundNatively = useCallback((sn: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        showToast(`📄 Already counted — SN: ${sn}`, 'warning', 2500);
        setScanStep(0);
        setIsProcessingImage(false);
        setTimeout(() => {
            setScanMode('barcode');
            resumeScanningRef.current();
        }, 2500);
    }, [showToast]);

    const {
        device,
        hasPermission,
        requestPermission,
        isCameraActive,
        setIsCameraActive,
        frameProcessor,
        codeScanner,
        warningText,
        roiBorderColor,
        resumeScanning,
        processStaticImageOCR,
        onCameraLayout,
        ROI_X,
        ROI_Y,
        ROI_WIDTH,
        ROI_HEIGHT
    } = useCameraPipeline({
        scanMode,
        onRequestTextMode: handleRequestTextMode,
        onPidFoundNatively: () => {
            setScanStep(1);
        },
        onHandoffToJS: handleHandoffToJS,
        onDuplicateFoundNatively: handleDuplicateFoundNatively,
        checkGlobalDuplicateSN,
        gtinMap
    });

    React.useEffect(() => {
        resumeScanningRef.current = resumeScanning;
    }, [resumeScanning]);

    const overlayPath = useMemo(() => {
        const p = Skia.Path.Make();
        p.addRect(Skia.XYWHRect(0, 0, 10000, 10000));
        const rect = Skia.XYWHRect(ROI_X, ROI_Y, ROI_WIDTH, ROI_HEIGHT);
        const rrect = Skia.RRectXY(rect, 16, 16);
        p.addRRect(rrect);
        p.setFillType(FillType.EvenOdd);
        return p;
    }, [ROI_X, ROI_Y, ROI_WIDTH, ROI_HEIGHT]);

    // Re-trigger the alert safely with access to resumeScanning
    React.useEffect(() => {
        if (pendingOcrGtin) {
            const title = pendingOcrGtin.reason === 'unlinked' ? "New Barcode Scanned!" : "Missing Expiry Date";
            const message = pendingOcrGtin.reason === 'unlinked'
                ? `This GTIN (${pendingOcrGtin.gtin}) is not linked to any product.\n\nPlease point the camera at the Product ID (PID) text and KEEP IT STABLE for 2 seconds.`
                : `This package's barcode does not contain an expiry date.\n\nPlease snap the label so we can read the Best Before (BB) date.`;

            Alert.alert(title, message, [
                { text: "Cancel", style: "cancel", onPress: () => { setPendingOcrGtin(null); resumeScanningRef.current(); } },
                { text: "Scan Text", onPress: () => { setPendingOcrGtin(null); setScanMode('text'); } }
            ]);
        }
    }, [pendingOcrGtin]);

    const takeSnapshot = useCallback(async () => {
        if (!cameraRef.current) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsProcessingImage(true);
            setScanStep(1);
            showToast('Processing image...', 'info');

            // Add a tiny delay to ensure camera session is fully ready if it just mounted
            await new Promise(resolve => setTimeout(resolve, 300));

            const photo = await cameraRef.current.takePhoto({
                flash: 'off',
                enableShutterSound: true
            });

            const success = await processStaticImageOCR(photo.path);

            if (!success) {
                setScanStep(0);
                setIsProcessingImage(false);
            }
            // If successful, onHandoffToJS handles the reset workflow
        } catch (e) {
            Logger.error('ScannerFeature', 'Failed to take snapshot', e);
            Alert.alert('Capture Failed', 'Failed to capture or process the image. Please try again.');
            setIsProcessingImage(false);
            setScanStep(0);
            resumeScanning();
        }
    }, [processStaticImageOCR, showToast, resumeScanning]);

    // Reset processing state when scan mode changes back to barcode
    React.useEffect(() => {
        if (scanMode === 'barcode') {
            setIsProcessingImage(false);
        }
    }, [scanMode]);

    return (
        <>
            <SafeAreaView className="flex-1 bg-brand-light dark:bg-brand-dark" edges={['bottom', 'left', 'right']}>
                <StockPulseHeader />

                {isCameraActive && device ? (
                    <View className="flex-1 bg-black relative" onLayout={onCameraLayout} style={{ zIndex: 0, elevation: 0 }}>
                        <Camera
                            ref={cameraRef}
                            style={{ flex: 1 }}
                            device={device}
                            isActive={isCameraActive}
                            frameProcessor={frameProcessor}
                            codeScanner={codeScanner}
                            zoom={Math.min(device.neutralZoom ? device.neutralZoom * 1.5 : 2, device.maxZoom ?? 10)}
                            enableZoomGesture={true}
                            onError={(e) => {
                                Logger.error('Camera', 'Vision camera error', e);
                                setIsCameraActive(false);
                            }}
                            photo={true}
                        />

                        {/* ROI Blur Overlay - Needs to be behind UI but above camera */}
                        <View className="absolute inset-0 z-10" pointerEvents="none">
                            <Canvas style={{ flex: 1 }}>
                                <Path path={overlayPath} color="rgba(0, 0, 0, 0.6)" />
                                {scanMode === 'text' && (
                                    <Rect x={ROI_X} y={ROI_Y} width={ROI_WIDTH} height={ROI_HEIGHT} color={roiBorderColor} style="stroke" strokeWidth={3} />
                                )}
                            </Canvas>
                        </View>

                        {/* Shutter Button (Text Mode Only) */}
                        {scanMode === 'text' && (
                            <View className="absolute bottom-[240px] left-0 right-0 items-center z-30">
                                <Pressable
                                    onPress={takeSnapshot}
                                    disabled={isProcessingImage}
                                    className={`w-20 h-20 rounded-full border-4 items-center justify-center ${isProcessingImage ? 'border-gray-500 bg-gray-500/50' : 'border-white bg-white/20'}`}
                                >
                                    <View className={`w-16 h-16 rounded-full ${isProcessingImage ? 'bg-gray-400' : 'bg-white'} items-center justify-center`}>
                                        {isProcessingImage ? (
                                            <ActivityIndicator color="white" size="large" />
                                        ) : (
                                            <FontAwesome name="camera" size={24} color="#000" />
                                        )}
                                    </View>
                                </Pressable>
                            </View>
                        )}

                        {/* Scanner Mode Toggle UI */}
                        <View className="absolute bottom-[160px] left-0 right-0 items-center z-20">
                            <View className="flex-row bg-slate-900/80 rounded-full p-1 border border-slate-700">
                                <Pressable
                                    onPress={() => {
                                        setScanMode('barcode');
                                        resumeScanning();
                                    }}
                                    className={`px-6 py-3 rounded-full flex-row items-center space-x-2 ${scanMode === 'barcode' ? 'bg-indigo-500' : ''}`}
                                >
                                    <FontAwesome name="barcode" size={16} color="white" />
                                    <Text className="text-white font-medium ml-2">Barcode</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => {
                                        setScanMode('text');
                                    }}
                                    className={`px-6 py-3 rounded-full flex-row items-center space-x-2 ${scanMode === 'text' ? 'bg-indigo-500' : ''}`}
                                >
                                    <FontAwesome name="font" size={16} color="white" />
                                    <Text className="text-white font-medium ml-2">Text OCR</Text>
                                </Pressable>
                            </View>
                        </View>

                        <View className="absolute top-4 right-4 z-20">
                            <Pressable
                                onPress={() => { setIsCameraActive(false); setScanStep(0); }}
                                className="w-12 h-12 bg-black/50 rounded-full items-center justify-center border border-white/20"
                            >
                                <FontAwesome name="times" size={24} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        {toast && (
                            <View className="absolute top-20 left-4 right-4 items-center z-40" pointerEvents="none">
                                <View className={`flex-row items-center px-5 py-3 rounded-2xl ${toast.type === 'success' ? 'bg-emerald-500/95' : toast.type === 'warning' ? 'bg-amber-500/95' : toast.type === 'error' ? 'bg-red-500/95' : 'bg-sky-600/95'}`} style={{ shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }}>
                                    <FontAwesome name={toast.type === 'success' ? 'check-circle' : toast.type === 'warning' ? 'exclamation-triangle' : toast.type === 'error' ? 'times-circle' : 'info-circle'} size={18} color="white" />
                                    <Text className="text-white font-semibold ml-3 text-sm">{toast.message}</Text>
                                </View>
                            </View>
                        )}

                        {warningText !== "" && !isProcessingImage && (
                            <View className="absolute bottom-56 left-0 right-0 items-center justify-center z-20">
                                <View className="bg-orange-500/90 px-6 py-3 rounded-full flex-row items-center">
                                    <FontAwesome name="warning" size={16} color="white" className="mr-2" />
                                    <Text className="text-white font-bold ml-2">{warningText}</Text>
                                </View>
                            </View>
                        )}

                    </View>
                ) : (
                    <View className="flex-1 items-center justify-center bg-brand-light dark:bg-brand-dark px-6">
                        <View className="w-20 h-20 bg-gray-100 dark:bg-brand-card rounded-2xl items-center justify-center mb-6">
                            <FontAwesome name="camera" size={32} color="#00C4A7" />
                        </View>
                        <Text className="text-gray-900 dark:text-white text-xl font-bold mb-2">Cooler Scanner</Text>
                        <Text className="text-gray-500 dark:text-brand-muted text-center mb-8">Point camera at product barcodes to scan inventory</Text>

                        <View className="w-full space-y-3">
                            <Pressable
                                onPress={async () => {
                                    setScanStep(0);
                                    if (!hasPermission) {
                                        const status = await requestPermission();
                                        if (status) setIsCameraActive(true);
                                        else {
                                            Alert.alert("Permission Required", "Camera access is needed to scan items.", [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]);
                                        }
                                    } else setIsCameraActive(true);
                                }}
                                className="bg-brand-teal flex-row items-center justify-center px-6 py-4 rounded-xl"
                            >
                                <FontAwesome name="video-camera" size={16} color={isDark ? "#16191C" : "#FFFFFF"} className="mr-2" />
                                <Text className="text-white dark:text-brand-dark font-bold text-lg">Start Camera</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                <CoolerBottomSheet scannedItems={scannedItems} onDelete={deleteItem} onEditCount={updateItemCount} />
                <ScanProgressHUD scanStep={scanStep} />
            </SafeAreaView>
        </>
    );
}
