import React, { useRef, useMemo } from 'react';
import { View, Text, Pressable, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from 'nativewind';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useTextRecognition, PhotoRecognizer } from 'react-native-vision-camera-ocr-plus';
import * as ImagePicker from 'expo-image-picker';
import { useRunOnJS } from 'react-native-worklets-core';
import { Logger } from '../../utils/logger';
import { CarouselModal } from '../../components/CarouselModal';
import { Text as OCRText } from 'react-native-vision-camera-ocr-plus';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { Dimensions } from 'react-native';

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
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
      color="rgba(0, 196, 167, 0.4)"
      style="stroke"
      strokeWidth={strokeW}
    />
  );
};

export default function ScanScreen() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = React.useState(false);
  const [testImages, setTestImages] = React.useState<string[]>([]);
  const [ocrResults, setOcrResults] = React.useState<OCRText[]>([]);
  const [isGalleryModalVisible, setIsGalleryModalVisible] = React.useState(false);

  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  const { scanText } = useTextRecognition({
    useLightweightMode: true,
    frameSkipThreshold: 10,
  });

  const logDebug = useRunOnJS((context: string, msg: string, data: any) => {
    Logger.debug(context, msg, data);
  }, []);

  const logResult = useRunOnJS((text: string) => {
    console.log(text);
  }, []);

  // Track live text blocks via Reanimated for Skia
  // Pre-allocate an array of 20 shared values to avoid mapping React Elements dynamically during render
  const activeBlocks = Array.from({ length: 20 }).map(() => useSharedValue<BlockData | null>(null));

  // Track true hardware frame sizes from the worklet to scale mathematical rectangles properly
  const frameWidth = useSharedValue(1080);
  const frameHeight = useSharedValue(1920);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    frameWidth.value = frame.width;
    frameHeight.value = frame.height;

    const data = scanText(frame);
    if (data && data.blocks && data.blocks.length > 0) {
      logDebug('OCR', 'Detected Text Blocks', data.blocks.length);
      logResult(data.resultText);
      logDebug('Skia', 'Bounding boxes added to UI Thread arrays', data.blocks.length);
      logDebug('Skia_Coordinates', `Frame: ${frameWidth.value}x${frameHeight.value}`, JSON.stringify(data.blocks[0].blockFrame));

      // Update the pre-allocated shared values 
      for (let i = 0; i < 20; i++) {
        activeBlocks[i].value = i < data.blocks.length ? data.blocks[i] : null;
      }
    } else {
      for (let i = 0; i < 20; i++) {
        activeBlocks[i].value = null;
      }
    }
  }, [scanText]);

  // Derive mathematical cover scalings for the UI thread Skia canvas (since the camera fills the screen via cover)
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

  // BottomSheet setup
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['12%', '45%'], []);

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaView className="flex-1 bg-brand-light dark:bg-brand-dark">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-brand-card bg-brand-light dark:bg-brand-dark">
          <View className="flex-row items-center">
            {/* Logo icon acting as Theme Toggle */}
            <Pressable
              onPress={toggleColorScheme}
              className="w-10 h-10 bg-brand-teal rounded-xl items-center justify-center mr-3"
            >
              <FontAwesome name="cube" size={20} color={isDark ? "#16191C" : "#FFFFFF"} />
            </Pressable>
            <View>
              <Text className="text-gray-900 dark:text-white text-lg font-bold">VizCount</Text>
              <Text className="text-gray-500 dark:text-brand-muted text-xs">Inventory Counter</Text>
            </View>
          </View>

          <View className="flex-row items-center space-x-2">
            {/* Dropdown placeholder */}
            <Pressable className="flex-row items-center bg-gray-100 dark:bg-brand-darker border border-gray-200 dark:border-brand-card px-3 py-2 rounded-xl mr-2">
              <Text className="text-gray-800 dark:text-brand-text mr-2">Dairy</Text>
              <FontAwesome name="chevron-down" size={12} color={isDark ? "#8B949E" : "#6B7280"} />
            </Pressable>
            {/* Dashboard Button */}
            <Pressable className="flex-row items-center border border-gray-200 dark:border-brand-card px-3 py-2 rounded-xl">
              <FontAwesome name="external-link" size={14} color={isDark ? "#E1E3E6" : "#4B5563"} className="mr-2" />
              <Text className="text-gray-800 dark:text-brand-text">Dashboard</Text>
            </Pressable>
          </View>
        </View>

        {/* Main Camera Prompt Area */}
        {isCameraActive && device ? (
          <View className="flex-1 bg-black relative">
            <Camera
              style={{ flex: 1 }}
              device={device}
              isActive={isCameraActive}
              frameProcessor={frameProcessor}
            />

            {/* Skia Live Bounding Box Overlay */}
            {showBoundingBoxes && (
              <View className="absolute inset-0 z-10" pointerEvents="none" style={{ elevation: 10 }}>
                <Canvas style={{ flex: 1 }}>
                  {/* Debug Red Square */}
                  <Rect x={20} y={150} width={80} height={80} color="red" />

                  {activeBlocks.map((blockSV, index) => {
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
            )}

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
