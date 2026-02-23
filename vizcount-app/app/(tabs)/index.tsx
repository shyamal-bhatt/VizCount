import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, Alert, Linking, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition, PhotoRecognizer, Text as OCRText } from 'react-native-vision-camera-ocr-plus';
import * as ImagePicker from 'expo-image-picker';
import { useRunOnJS } from 'react-native-worklets-core';
import { Logger } from '../../utils/logger';
import { CarouselModal } from '../../components/CarouselModal';
import { Canvas, Rect, Path, Skia, FillType } from '@shopify/react-native-skia';
import { OpenCV, ObjectType, DataTypes, ColorConversionCodes, BorderTypes } from 'react-native-fast-opencv';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useSharedValue, useDerivedValue, withTiming, withSequence, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { database } from '../../db';
import { ProductPickerModal, Product } from '@/components/ProductPickerModal';
import { ScannedItem } from '@/db/models/ScannedItem';
import { StockPulseHeader } from '@/components/StockPulseHeader';

// Fallback interface because ocr-plus doesn't export BlockData directly
interface BlockData {
  blockText: string;
  blockFrame: {
    boundingCenterX: number;
    boundingCenterY: number;
    height: number;
    width: number;
    x: number;
    y: number;
  };
  confidence?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the Region of Interest (ROI) bounds directly in screen coordinates
const ROI_WIDTH = SCREEN_WIDTH * 0.85;
const ROI_HEIGHT = 160;
const ROI_X = (SCREEN_WIDTH - ROI_WIDTH) / 2;
// Adjust Y slightly upwards to account for the header area
const ROI_Y = (SCREEN_HEIGHT - ROI_HEIGHT) / 2 - 40;

// Generate the Skia clipping mask path (Full screen dark with a clear hole in the middle)
const overlayPath = Skia.Path.Make();
overlayPath.addRect(Skia.XYWHRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT));
overlayPath.addRect(Skia.XYWHRect(ROI_X, ROI_Y, ROI_WIDTH, ROI_HEIGHT));
overlayPath.setFillType(FillType.EvenOdd);

// Custom component to handle the Animated Props on the UI Thread securely without crashing React
const BoundingBox = ({ block, scale, offsetX, offsetY }: { block: any; scale: any; offsetX: any; offsetY: any }) => {
  const x = useDerivedValue(() => block.value ? ((block.value.blockFrame.boundingCenterX - (block.value.blockFrame.width / 2)) * scale.value) + offsetX.value : 0);
  const y = useDerivedValue(() => block.value ? ((block.value.blockFrame.boundingCenterY - (block.value.blockFrame.height / 2)) * scale.value) + offsetY.value : 0);
  const width = useDerivedValue(() => block.value ? block.value.blockFrame.width * scale.value : 0);
  const height = useDerivedValue(() => block.value ? block.value.blockFrame.height * scale.value : 0);

  // Only draw strokes if the block actually exists
  const strokeW = useDerivedValue(() => block.value ? 3 : 0);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      color="rgba(0, 196, 167, 0.4)" // Brand Teal
      style="stroke"
      strokeWidth={strokeW}
    />
  );
}

export default function ScanScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [testImages, setTestImages] = useState<string[]>([]);
  const [ocrResults, setOcrResults] = useState<OCRText[]>([]);
  const [isGalleryModalVisible, setIsGalleryModalVisible] = useState(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const { scanText } = useTextRecognition({
    useLightweightMode: true,
    frameSkipThreshold: 20, // Reduced to ~3 FPS for better quality checks
  });

  const { resize } = useResizePlugin();

  const logDebug = useRunOnJS((context: string, msg: string, data: any) => {
    Logger.debug(context, msg, data);
  }, []);

  const saveToDatabase = useRunOnJS((data: { pid: string, netKg: string, sn: string }) => {
    console.log("Saving validated data to DB:", data);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    database.write(async () => {
      try {
        const items = database.collections.get('scanned_items');
        await items.create((item: any) => {
          item.pid = data.pid;
          item.netKg = parseFloat(data.netKg) || 0;
          item.sn = data.sn;
          item.name = 'Dairy Product'; // Fallback for scanned items
          item.bestBeforeDate = Date.now();
          item.packedOnDate = Date.now();
          item.count = 1; // Default count to 1 for weighable items as a container base
        });
        Logger.info('DB', `Successfully saved scanned item ${data.pid} to WatermelonDB`);
      } catch (error) {
        Logger.error('DB', `Failed to save item ${data.pid} to WatermelonDB`, error);
      }
    });

  }, []);

  // Track live text blocks via Reanimated for Skia
  const activeBlocks = Array.from({ length: 20 }).map(() => useSharedValue<BlockData | null>(null));

  // True hardware frame sizes to scale mathematical rectangles properly
  const frameWidth = useSharedValue(1080);
  const frameHeight = useSharedValue(1920);

  // Success state for ROI box
  const isSuccess = useSharedValue(false);

  // Quality warnings
  const userWarning = useSharedValue("");

  // Temporal Voting Queue
  // We store stringified results. If 2 out of 3 match, we validate it.
  const temporalVoteQueue = useSharedValue<string[]>([]);
  const lastInteractionTime = useSharedValue<number>(Date.now());

  // Derive mathematical cover scalings for the UI thread Skia canvas
  const cameraScale = useDerivedValue(() => {
    const scaleW = SCREEN_WIDTH / frameWidth.value;
    const scaleH = SCREEN_HEIGHT / frameHeight.value;
    return Math.max(scaleW, scaleH);
  });
  const cameraOffsetX = useDerivedValue(() => {
    const renderedW = frameWidth.value * cameraScale.value;
    return (SCREEN_WIDTH - renderedW) / 2;
  });
  const cameraOffsetY = useDerivedValue(() => {
    const renderedH = frameHeight.value * cameraScale.value;
    return (SCREEN_HEIGHT - renderedH) / 2;
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameWidth.value = frame.width;
    frameHeight.value = frame.height;

    // --- 1. Quality Checks using Fast OpenCV ---

    // Scale the frame down dramatically to improve OpenCV performance
    const targetHeight = frame.height / 4;
    const targetWidth = frame.width / 4;

    // Resize and convert YUV to BGR natively via the resize plugin
    const resizedBuffer = resize(frame, {
      scale: { width: targetWidth, height: targetHeight },
      pixelFormat: 'bgr',
      dataType: 'uint8',
    });

    const bgrMat = OpenCV.frameBufferToMat(targetHeight, targetWidth, 3, resizedBuffer);
    const grayMat = OpenCV.createObject(ObjectType.Mat, targetHeight, targetWidth, DataTypes.CV_8U);
    OpenCV.invoke('cvtColor', bgrMat, grayMat, ColorConversionCodes.COLOR_BGR2GRAY);

    const laplacianMat = OpenCV.createObject(ObjectType.Mat, targetHeight, targetWidth, DataTypes.CV_64F);
    OpenCV.invoke('Laplacian', grayMat, laplacianMat, DataTypes.CV_64F, 1, 1, 0, BorderTypes.BORDER_DEFAULT);

    const mean = OpenCV.createObject(ObjectType.Mat, 1, 1, DataTypes.CV_64F);
    const stddev = OpenCV.createObject(ObjectType.Mat, 1, 1, DataTypes.CV_64F);

    // Blur analysis using Variance of Laplacian
    OpenCV.invoke('meanStdDev', laplacianMat, mean, stddev);
    const stddevBufferInfo = OpenCV.matToBuffer(stddev, 'float64');
    const stdDevVal = stddevBufferInfo.buffer[0];
    const blurVariance = stdDevVal * stdDevVal;

    // Check brightness for glare or underexposure
    OpenCV.invoke('meanStdDev', grayMat, mean, stddev);
    const meanBufferInfo = OpenCV.matToBuffer(mean, 'float64');
    const brightnessVal = meanBufferInfo.buffer[0];

    OpenCV.clearBuffers(); // FREE MEMORY IMMEDIATELY

    if (blurVariance < 100) {
      console.log(`[OCR] Frame blurry (Variance: ${blurVariance.toFixed(2)}). Skipping.`);
      userWarning.value = "Image is blurry. Please hold steady.";
      return;
    }

    if (brightnessVal > 220) {
      userWarning.value = "Too much reflection/glare. Tilt camera.";
      return;
    }

    if (brightnessVal < 40) {
      userWarning.value = "Too dark. Move to better lighting.";
      return;
    }

    userWarning.value = ""; // Clear warnings

    // --- 2. Execute OCR ---
    const data = scanText(frame);
    if (data && data.blocks && data.blocks.length > 0) {
      logDebug('OCR', `Raw OCR Read: ${data.resultText.substring(0, 100)}...`, { blocks: data.blocks.length });

      // 1. Coordinate Mapping & Filtering
      let validTextInROI = "";

      for (let i = 0; i < data.blocks.length; i++) {
        const block = data.blocks[i];

        // 1a. Confidence Check (If available on the platform)
        const vBlock = block as any;
        if (vBlock.confidence !== undefined && vBlock.confidence < 0.8) {
          continue; // Skip this block if confidence is explicitly low
        }

        // Map center to screen space
        const screenX = ((block.blockFrame.boundingCenterX - (block.blockFrame.width / 2)) * cameraScale.value) + cameraOffsetX.value;
        const screenY = ((block.blockFrame.boundingCenterY - (block.blockFrame.height / 2)) * cameraScale.value) + cameraOffsetY.value;
        const screenW = block.blockFrame.width * cameraScale.value;
        const screenH = block.blockFrame.height * cameraScale.value;
        const centerX = screenX + (screenW / 2);
        const centerY = screenY + (screenH / 2);

        // Check if the center of this text block is inside the static ROI box
        const isInsideROI = (
          centerX >= ROI_X &&
          centerX <= (ROI_X + ROI_WIDTH) &&
          centerY >= ROI_Y &&
          centerY <= (ROI_Y + ROI_HEIGHT)
        );

        // Update visual bounding box overlays (only show ones inside ROI)
        if (i < 20) {
          activeBlocks[i].value = isInsideROI ? block : null;
        }

        if (isInsideROI) {
          validTextInROI += block.blockText + " ";
        }
      }

      if (validTextInROI.length > 0) {
        logDebug('OCR', 'Text inside ROI:', validTextInROI);
      }

      // Clear remaining blocks
      for (let i = data.blocks.length; i < 20; i++) {
        activeBlocks[i].value = null;
      }

      // 2. Regex Parsing on filtered text
      // E.g., looking for "PID: 12345" and "NET KG: 25.5"
      const pidMatch = validTextInROI.match(/PID:\s*([A-Z0-9\-]+)/i);
      const netWeightMatch = validTextInROI.match(/NET\s*KG:?\s*([\d\.]+)/i);
      const snMatch = validTextInROI.match(/SN:\s*([A-Z0-9]+)/i);

      if (pidMatch && netWeightMatch) {
        const pid = pidMatch[1];
        const netKg = netWeightMatch[1];
        const sn = snMatch ? snMatch[1] : `AUTO-${Date.now()}`;

        const payloadString = `${pid}_${netKg}`; // Signature of this read

        // Push to queue
        let newQueue = [...temporalVoteQueue.value];
        if (newQueue.length >= 3) {
          newQueue.shift(); // Keep size at 3
        }
        newQueue.push(payloadString);
        temporalVoteQueue.value = newQueue;

        // Check for consensus (2 out of 3)
        let countMatches = 0;
        for (let item of newQueue) {
          if (item === payloadString) countMatches++;
        }

        if (countMatches >= 2 && !isSuccess.value) {
          // Consensus reached! Reset interaction time.
          lastInteractionTime.value = Date.now();
          isSuccess.value = true;

          saveToDatabase({
            pid: pid,
            netKg: netKg,
            sn: sn
          });

          // Revert success color after 1.5 seconds
          setTimeout(() => {
            isSuccess.value = false;
            temporalVoteQueue.value = []; // Clear queue to avoid rapid-fire saves
          }, 1500);
        }
      } else {
        // Drop a bad frame into the queue to break invalid steaks
        let newQueue = [...temporalVoteQueue.value];
        if (newQueue.length >= 3) newQueue.shift();
        newQueue.push("INVALID");
        temporalVoteQueue.value = newQueue;
      }

      // Check for 3-second timeout
      const now = Date.now();
      if (now - lastInteractionTime.value > 3000) {
        userWarning.value = "Cannot read clearly. Please reposition and try again.";
      }
    } else {
      // Clear all bindings if no text is found
      for (let i = 0; i < 20; i++) {
        activeBlocks[i].value = null;
      }

      const now = Date.now();
      if (now - lastInteractionTime.value > 3000) {
        userWarning.value = "Cannot read clearly. Please reposition and try again.";
      }

      let newQueue = [...temporalVoteQueue.value];
      if (newQueue.length >= 3) newQueue.shift();
      newQueue.push("EMPTY");
      temporalVoteQueue.value = newQueue;
    }
  }, [scanText, cameraScale, cameraOffsetX, cameraOffsetY]);

  // Derived color for the ROI boundary based on success state
  const roiBorderColor = useDerivedValue(() => {
    return isSuccess.value ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 255, 255, 0.5)";
  });

  // BottomSheet setup
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['12%', '45%'], []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-brand-light dark:bg-brand-dark" edges={['bottom', 'left', 'right']}>
        {/* Header powered by global component replacing previous mockups */}
        <StockPulseHeader />

        {/* Main Camera Prompt Area */}
        {isCameraActive && device ? (
          <View className="flex-1 bg-black relative">
            <Camera
              style={{ flex: 1 }}
              device={device}
              isActive={isCameraActive}
              frameProcessor={frameProcessor}
            />

            {/* Skia Full Screen Overlay with ROI Cutout */}
            <View className="absolute inset-0 z-10" pointerEvents="none" style={{ elevation: 10 }}>
              <Canvas style={{ flex: 1 }}>
                {/* Dimmed Background Overlay */}
                <Path path={overlayPath} color="rgba(0, 0, 0, 0.6)" />

                {/* Animated ROI Border */}
                <Rect
                  x={ROI_X}
                  y={ROI_Y}
                  width={ROI_WIDTH}
                  height={ROI_HEIGHT}
                  color={roiBorderColor}
                  style="stroke"
                  strokeWidth={3}
                />

                {/* Visual debug bounds for OCR texts inside ROI */}
                {showBoundingBoxes && activeBlocks.map((blockSV, index) => {
                  return (
                    <BoundingBox
                      key={`live-box-${index}`}
                      block={blockSV}
                      scale={cameraScale}
                      offsetX={cameraOffsetX}
                      offsetY={cameraOffsetY}
                    />
                  );
                })}
              </Canvas>
            </View>

            <View className="absolute top-4 right-4 flex-col items-end space-y-4">
              {/* Close Camera Button */}
              <Pressable
                onPress={() => {
                  Logger.info('User Action', 'Close Camera button pressed');
                  setIsCameraActive(false);
                }}
                className="w-12 h-12 bg-black/50 rounded-full items-center justify-center border border-white/20"
              >
                <FontAwesome name="times" size={24} color="#FFFFFF" />
              </Pressable>

              {/* Toggle Skia Bounding Boxes Button */}
              <Pressable
                onPress={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className={`px-4 py-2 rounded-full border ${showBoundingBoxes ? 'bg-brand-teal border-brand-teal' : 'bg-black/50 border-white/20'}`}
              >
                <Text className="text-white font-bold">{showBoundingBoxes ? 'Boxes ON' : 'Boxes OFF'}</Text>
              </Pressable>
            </View>

            {/* Warning Prompt (Blur/Glare etc.) */}
            {userWarning.value !== "" && (
              <View className="absolute bottom-32 left-0 right-0 items-center justify-center">
                <View className="bg-orange-500/90 px-6 py-3 rounded-full flex-row items-center">
                  <FontAwesome name="warning" size={16} color="white" className="mr-2" />
                  <Text className="text-white font-bold ml-2">{userWarning.value}</Text>
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
            <Text className="text-gray-500 dark:text-brand-muted text-center mb-8">
              Point camera at product barcodes to scan inventory
            </Text>

            <View className="w-full space-y-3">
              <Pressable
                onPress={async () => {
                  Logger.info('User Action', 'Start Camera button pressed');
                  if (!hasPermission) {
                    const status = await requestPermission();
                    Logger.info('Permissions', `Camera permission status requested: ${status}`);
                    if (status) {
                      setIsCameraActive(true);
                    } else {
                      Alert.alert(
                        "Permission Required",
                        "Camera access is needed to scan items. Please enable it in your device settings.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Open Settings", onPress: () => Linking.openSettings() }
                        ]
                      );
                    }
                  } else {
                    setIsCameraActive(true);
                  }
                }}
                className="bg-brand-teal flex-row items-center justify-center px-6 py-4 rounded-xl"
              >
                <FontAwesome name="video-camera" size={16} color={isDark ? "#16191C" : "#FFFFFF"} className="mr-2" />
                <Text className="text-white dark:text-brand-dark font-bold text-lg">Start Camera</Text>
              </Pressable>

              <Pressable
                onPress={async () => {
                  Logger.info('User Action', 'Upload Test Media button pressed');
                  let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsMultipleSelection: true,
                    allowsEditing: false,
                    quality: 1,
                  });

                  if (!result.canceled) {
                    try {
                      const uris = result.assets.map(a => a.uri);
                      setTestImages(uris);
                      setOcrResults([]); // Clear previous
                      setIsGalleryModalVisible(true);

                      // Process each sequentially or via Promise.all
                      const results = await Promise.all(
                        uris.map(uri => PhotoRecognizer({ uri }))
                      );

                      setOcrResults(results);
                      Logger.debug('OCR', `Successfully processed ${results.length} images`);
                    } catch (error: any) {
                      Logger.error('OCR', 'Failed to process gallery media', error?.message || error);
                      Alert.alert("OCR Error", error?.message || "Could not process media structure");
                      setIsGalleryModalVisible(false);
                    }
                  }
                }}
                className="bg-gray-200 dark:bg-brand-card flex-row items-center justify-center px-6 py-4 rounded-xl mt-3"
              >
                <FontAwesome name="image" size={16} color={isDark ? "#E1E3E6" : "#4B5563"} className="mr-2" />
                <Text className="text-gray-800 dark:text-brand-text font-bold text-lg">Upload Test Media</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Collapsible Scans List via Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          backgroundStyle={{
            backgroundColor: isDark ? '#0D0F11' : '#F9FAFB',
            borderTopWidth: 1,
            borderColor: isDark ? '#1D2125' : '#E5E7EB',
          }}
          handleIndicatorStyle={{ backgroundColor: isDark ? '#8B949E' : '#D1D5DB' }}
        >
          <BottomSheetView className="flex-1">
            <View className="flex-row items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-brand-card">
              <View className="flex-row items-center">
                <Text className="text-gray-900 dark:text-white font-bold text-base mr-2">Cooler Scans</Text>
                <View className="px-2 py-0.5 bg-gray-200 dark:bg-brand-card rounded-full">
                  <Text className="text-gray-600 dark:text-brand-muted text-xs">0</Text>
                </View>
              </View>
              <Text className="text-gray-500 dark:text-brand-muted text-sm">Dairy dept.</Text>
            </View>

            {/* Empty State List */}
            <View className="py-12 items-center justify-center">
              <FontAwesome name="cube" size={32} color={isDark ? "#8B949E" : "#9CA3AF"} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text className="text-gray-600 dark:text-brand-muted text-base mb-1">No items scanned yet</Text>
              <Text className="text-gray-400 dark:text-brand-muted opacity-50 text-sm">Start the camera and scan products</Text>
            </View>
          </BottomSheetView>
        </BottomSheet>

        {/* Dynamic Static Photo Carousel For MLKit Tests */}
        <CarouselModal
          visible={isGalleryModalVisible}
          images={testImages}
          ocrResults={ocrResults}
          onClose={() => setIsGalleryModalVisible(false)}
          showBoundingBoxes={showBoundingBoxes}
          onToggleBoundingBoxes={() => setShowBoundingBoxes(!showBoundingBoxes)}
        />

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
