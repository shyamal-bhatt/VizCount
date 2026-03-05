import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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

    const [scanStep, setScanStep] = useState<0 | 1 | 2 | 3>(0);
    const [scanMode, setScanMode] = useState<'barcode' | 'text'>('barcode');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const [toastOpacity] = useState(1);

    const showToast = useCallback((message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info', duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), duration);
    }, []);

    const { catalogMap, gtinMap, scannedItems, saveScannedItem, checkDuplicateSN, deleteItem, updateItemCount, updateProductGTIN } = useScannerDB();

    const handleHandoffToJS = useCallback(async (data: { pid: string; nativeSN: string | null; validLines: string[], gs1Data?: GS1ParseResult }) => {
        try {
            const parsedPID = parseInt(data.pid, 10);
            const isFastTrack = !!data.gs1Data?.gtin && data.validLines.length === 0;

            console.log(`\n══════════════════════════════════════════════`);
            console.log(`[HANDOFF] Mode: ${isFastTrack ? '⚡ FAST-TRACK (GTIN)' : '📝 TEXT-OCR'}`);
            console.log(`[HANDOFF] PID: ${parsedPID}`);
            if (data.gs1Data) {
                console.log(`[HANDOFF] GS1 → GTIN: ${data.gs1Data.gtin} | SN: ${data.gs1Data.sn ?? 'N/A'} | Weight: ${data.gs1Data.weight ?? 'N/A'}kg | Expiry: ${data.gs1Data.expiryDate ? new Date(data.gs1Data.expiryDate).toDateString() : 'N/A'} | Production: ${data.gs1Data.productionDate ? new Date(data.gs1Data.productionDate).toDateString() : 'N/A'}`);
            }
            if (!isFastTrack) {
                console.log(`[HANDOFF] OCR valid lines (${data.validLines.length}):`, data.validLines);
            }

            const product = catalogMap.get(parsedPID);

            if (!product) {
                console.log(`[HANDOFF] ❌ PID ${parsedPID} not found in catalogMap (${catalogMap.size} products loaded)`);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                showToast(`⚠️ PID ${data.pid} not in catalog. Define it first.`, 'error');
                resumeScanning();
                return;
            }

            // Link GTIN to PID if OCR mode confirmed a PID from an unknown GTIN scan
            if (!isFastTrack && data.gs1Data?.gtin && updateProductGTIN) {
                await updateProductGTIN(parsedPID, data.gs1Data.gtin);
                console.log(`[HANDOFF] 🔗 Linked new GTIN ${data.gs1Data.gtin} to PID ${parsedPID}`);
            }

            const { name, type, pack } = product;
            console.log(`[HANDOFF] ✅ Product matched → ${name} (type: ${type}, pack: ${pack})`);
            showToast(`✅ ${name} found — extracting details…`, 'info');
            setScanStep(1);

            Alert.alert(
                '🏷️ Product Identified',
                `${name}\nPID: ${data.pid}\n\nCollecting remaining data…`,
                [{ text: 'OK' }]
            );

            // If scanned via OCR + have a GTIN not yet mapped → persist the GTIN to DB
            if (data.gs1Data && data.gs1Data.gtin && !product.gtin) {
                console.log(`[HANDOFF] 📌 New GTIN ${data.gs1Data.gtin} found for PID ${parsedPID} — saving to DB`);
                await updateProductGTIN(parsedPID, data.gs1Data.gtin);
            }

            let finalSN: number = Date.now();
            let snString = data.gs1Data?.sn || data.nativeSN || OCRService.extractSNFallback(data.validLines, type);
            console.log(`[HANDOFF] SN source → GS1: ${data.gs1Data?.sn ?? 'none'} | barcode: ${data.nativeSN ?? 'none'}`);
            console.log(`[HANDOFF] Using SN string: ${snString ?? '(fallback to timestamp)'}`);

            if (snString) {
                const parsedSN = parseInt(snString, 10);
                if (!isNaN(parsedSN)) finalSN = parsedSN;
            }

            if (finalSN > 0) {
                console.log(`[HANDOFF] Checking duplicate SN: ${finalSN}`);
                const isDuplicate = await checkDuplicateSN(finalSN);
                if (isDuplicate) {
                    console.log(`[HANDOFF] ⚠️ Duplicate SN ${finalSN} — skipping save`);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    showToast(`📄 Already counted — ${name} (SN: ${finalSN})`, 'warning', 2500);

                    // Delay resuming the scanner to prevent an infinite haptic 
                    // buzzing loop if the user keeps the camera over the same barcode
                    setTimeout(() => resumeScanning(), 2500);
                    return;
                }
            }

            const extractedNetKg = data.gs1Data?.weight ?? OCRService.extractNetKg(data.validLines);
            console.log(`[HANDOFF] Weight → GS1: ${data.gs1Data?.weight ?? 'none'} | OCR extracted: ${OCRService.extractNetKg(data.validLines)}`);
            console.log(`[HANDOFF] Using weight: ${extractedNetKg} kg`);
            setScanStep(2);

            let bestBeforeDate: number | null = null;
            if (data.gs1Data?.expiryDate) {
                bestBeforeDate = data.gs1Data.expiryDate;
                console.log(`[HANDOFF] Expiry from GS1: ${new Date(bestBeforeDate).toDateString()}`);
            } else {
                const dates = OCRService.extractDates(data.validLines);
                bestBeforeDate = dates.bestBeforeDate;
                console.log(`[HANDOFF] Expiry from OCR: ${bestBeforeDate ? new Date(bestBeforeDate).toDateString() : 'none'}`);
            }

            console.log(`[HANDOFF] 💾 Saving item → pid:${parsedPID} sn:${finalSN} weight:${extractedNetKg}kg expiry:${bestBeforeDate ? new Date(bestBeforeDate).toDateString() : 'none'}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await saveScannedItem({
                pid: parsedPID,
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
                setScanMode('barcode'); // Reset back to default barcode mode
                resumeScanning();
            }, 3500);

        } catch (e) {
            Logger.error('ScannerFeature', 'Error during handoff processing', e);
            console.error(`[HANDOFF] ❌ Unexpected error:`, e);
            resumeScanning();
        }
    }, [catalogMap, checkDuplicateSN, saveScannedItem, showToast, updateProductGTIN]);

    const handleRequestTextMode = useCallback((unknownGtin: number) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
            "New Barcode Scanned!",
            "This GTIN is not linked to any product.\n\nPlease point the camera at the Product ID (PID) text and KEEP IT STABLE for 2 seconds.",
            [{ text: "Scan Text", onPress: () => setScanMode('text') }]
        );
    }, []);

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
        gtinMap
    });

    const overlayPath = useMemo(() => {
        const p = Skia.Path.Make();
        p.addRect(Skia.XYWHRect(0, 0, 10000, 10000));
        const rect = Skia.XYWHRect(ROI_X, ROI_Y, ROI_WIDTH, ROI_HEIGHT);
        const rrect = Skia.RRectXY(rect, 16, 16);
        p.addRRect(rrect);
        p.setFillType(FillType.EvenOdd);
        return p;
    }, [ROI_X, ROI_Y, ROI_WIDTH, ROI_HEIGHT]);

    return (
        <GestureHandlerRootView className="flex-1">
            <SafeAreaView className="flex-1 bg-brand-light dark:bg-brand-dark" edges={['bottom', 'left', 'right']}>
                <StockPulseHeader />

                {isCameraActive && device ? (
                    <View className="flex-1 bg-black relative" onLayout={onCameraLayout} style={{ zIndex: 0, elevation: 0 }}>
                        <Camera
                            style={{ flex: 1 }}
                            device={device}
                            isActive={isCameraActive}
                            frameProcessor={frameProcessor}
                            codeScanner={codeScanner}
                            zoom={device.neutralZoom ? device.neutralZoom * 1.5 : 2}
                            enableZoomGesture={true}
                            onError={(e) => {
                                Logger.error('Camera', 'Vision camera error', e);
                                setIsCameraActive(false);
                            }}
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

                        {/* Scanner Mode Toggle UI */}
                        <View className="absolute bottom-10 left-0 right-0 items-center z-20">
                            <View className="flex-row bg-slate-900/80 rounded-full p-1 border border-slate-700">
                                <Pressable
                                    onPress={() => setScanMode('barcode')}
                                    className={`px-6 py-3 rounded-full flex-row items-center space-x-2 ${scanMode === 'barcode' ? 'bg-indigo-500' : ''}`}
                                >
                                    <FontAwesome name="barcode" size={16} color="white" />
                                    <Text className="text-white font-medium ml-2">Barcode</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setScanMode('text')}
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

                        {warningText !== "" && (
                            <View className="absolute bottom-32 left-0 right-0 items-center justify-center z-20">
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
        </GestureHandlerRootView>
    );
}
