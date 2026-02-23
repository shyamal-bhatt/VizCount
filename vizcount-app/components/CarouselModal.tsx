import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Modal, Pressable, ScrollView, Dimensions, Image, LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { useColorScheme } from 'nativewind';
import { Text as OCRText } from 'react-native-vision-camera-ocr-plus';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CarouselModalProps {
    visible: boolean;
    images: string[];
    ocrResults: OCRText[]; // Array index mapping 1:1 with images array
    onClose: () => void;
    showBoundingBoxes: boolean;
    onToggleBoundingBoxes: () => void;
}

export function CarouselModal({
    visible,
    images,
    ocrResults,
    onClose,
    showBoundingBoxes,
    onToggleBoundingBoxes,
}: CarouselModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    const [activeIndex, setActiveIndex] = useState(0);
    const [imageLayouts, setImageLayouts] = useState<{ [key: number]: { width: number; height: number } }>({});
    const [imageDimensions, setImageDimensions] = useState<{ [key: string]: { width: number; height: number } }>({});

    // Bottom Sheet Hooks
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['30%', '85%'], []);

    useEffect(() => {
        images.forEach(uri => {
            if (!imageDimensions[uri]) {
                Image.getSize(uri, (width, height) => {
                    setImageDimensions(prev => ({ ...prev, [uri]: { width, height } }));
                }, error => {
                    console.warn(`Failed to get image dimensions for ${uri}`, error);
                });
            }
        });
    }, [images]);

    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / SCREEN_WIDTH);
        setActiveIndex(index);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-brand-light dark:bg-brand-dark pt-10">

                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-brand-card">
                        <Text className="text-gray-900 dark:text-white text-lg font-bold">
                            Test Media ({activeIndex + 1}/{images.length})
                        </Text>
                        <View className="flex-row items-center space-x-4">
                            <Pressable
                                onPress={onToggleBoundingBoxes}
                                className={`px-3 py-1.5 rounded-lg border ${showBoundingBoxes ? 'bg-brand-teal/20 border-brand-teal' : 'bg-gray-100 dark:bg-brand-card border-gray-200 dark:border-brand-darker'}`}
                                style={{ marginRight: 12 }}
                            >
                                <Text className={showBoundingBoxes ? 'text-brand-teal font-bold' : 'text-gray-600 dark:text-brand-muted'}>
                                    {showBoundingBoxes ? 'Boxes ON' : 'Boxes OFF'}
                                </Text>
                            </Pressable>
                            <Pressable onPress={onClose} className="w-8 h-8 bg-gray-200 dark:bg-brand-card rounded-full items-center justify-center">
                                <FontAwesome name="times" size={16} color={isDark ? "#E1E3E6" : "#4B5563"} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Carousel Area - Uses 60% Screen Height for ample photo room */}
                    <View style={{ height: '70%' }} className="bg-black/5 dark:bg-[#0D0F11] overflow-hidden">
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleScroll}
                            className="flex-1"
                        >
                            {images.map((uri, index) => {
                                const result = ocrResults[index];
                                const layout = imageLayouts[index];

                                return (
                                    <View key={index} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }} className="items-center justify-center">
                                        <View
                                            className="w-full h-full relative"
                                            onLayout={(e: LayoutChangeEvent) => {
                                                const { width, height } = e.nativeEvent.layout;
                                                setImageLayouts(prev => ({
                                                    ...prev,
                                                    [index]: { width, height }
                                                }));
                                            }}
                                        >
                                            <Image
                                                source={{ uri }}
                                                style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                                            />

                                            {/* Skia Overlay for this specific image */}
                                            {showBoundingBoxes && layout && result?.blocks && (
                                                <View className="absolute inset-0 z-10" pointerEvents="none" style={{ elevation: 10 }}>
                                                    <Canvas style={{ flex: 1 }}>
                                                        {/* Debug Red Square */}
                                                        <Rect x={20} y={150} width={80} height={80} color="red" />

                                                        {result.blocks.map((block, bIdx) => {
                                                            // PhotoRecognizer returns bounds relative to the original image dimensions
                                                            const trueDims = imageDimensions[uri];

                                                            let scaleW = 1;
                                                            let scaleH = 1;
                                                            let offsetX = 0;
                                                            let offsetY = 0;

                                                            let rawX = block.blockFrame.boundingCenterX - (block.blockFrame.width / 2);
                                                            let rawY = block.blockFrame.boundingCenterY - (block.blockFrame.height / 2);
                                                            let rawW = block.blockFrame.width;
                                                            let rawH = block.blockFrame.height;

                                                            if (trueDims && layout) {
                                                                // Handle Android hardware rotation mismatches 
                                                                // If the image is portrait but MLKit scanned it in landscape sensor space:
                                                                const isImagePortrait = trueDims.height > trueDims.width;
                                                                // We infer sensor rotation by seeing if X centers exceed Y centers heavily on a portrait photo
                                                                // A safer way is checking if the bounding box itself is transposed (text is usually wider than it is tall)
                                                                if (isImagePortrait && rawH > rawW && block.blockText.length > 3) {
                                                                    // The sensor likely fed a rotated image to MLKit. Swap axes matrix.
                                                                    rawX = block.blockFrame.boundingCenterY - (block.blockFrame.height / 2);
                                                                    rawY = block.blockFrame.boundingCenterX - (block.blockFrame.width / 2);
                                                                    rawW = block.blockFrame.height;
                                                                    rawH = block.blockFrame.width;
                                                                }

                                                                // For "contain" mode, both scales resolve to the exact lowest multiplier
                                                                const baseScale = Math.min(layout.width / trueDims.width, layout.height / trueDims.height);

                                                                const renderedWidth = trueDims.width * baseScale;
                                                                const renderedHeight = trueDims.height * baseScale;

                                                                offsetX = (layout.width - renderedWidth) / 2;
                                                                offsetY = (layout.height - renderedHeight) / 2;

                                                                scaleW = baseScale;
                                                                scaleH = baseScale;
                                                            }

                                                            // MLKit coordinates map strictly proportional to the full original image size
                                                            const rectW = rawW * scaleW;
                                                            const rectH = rawH * scaleH;
                                                            const rectX = (rawX * scaleW) + offsetX;
                                                            const rectY = (rawY * scaleH) + offsetY;

                                                            return (
                                                                <Rect
                                                                    key={`block-${bIdx}`}
                                                                    x={rectX}
                                                                    y={rectY}
                                                                    width={rectW}
                                                                    height={rectH}
                                                                    color="rgba(0, 196, 167, 0.3)" // Brand Teal Semi-Transparent
                                                                    style="fill"
                                                                />
                                                            );
                                                        })}
                                                    </Canvas>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>

                    {/* Extract JSON Output Area - Overlay BottomSheet */}
                    <BottomSheet
                        ref={bottomSheetRef}
                        snapPoints={snapPoints}
                        index={0}
                        topInset={insets.top > 0 ? insets.top + 20 : 40}
                        backgroundStyle={{
                            backgroundColor: isDark ? '#1D2125' : '#FCFBF4', // Modal Card color
                            borderTopWidth: 1,
                            borderColor: isDark ? '#30363D' : '#E5E7EB',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 10,
                            elevation: 10,
                        }}
                        handleIndicatorStyle={{ backgroundColor: isDark ? '#8B949E' : '#D1D5DB' }}
                    >
                        <BottomSheetScrollView className="flex-1 p-4" contentContainerStyle={{ paddingBottom: 60 }}>
                            <Text className="text-gray-900 dark:text-white font-bold text-lg mb-4">OCR Output</Text>
                            {ocrResults[activeIndex] ? (
                                <View className="bg-gray-100 dark:bg-[#0D0F11] p-4 rounded-xl border border-gray-200 dark:border-[#21262d]">
                                    {ocrResults[activeIndex].blocks.map((block, i) => (
                                        <View key={i} className="mb-4 last:mb-0 pb-4 last:pb-0 border-b border-gray-200 dark:border-[#21262d] last:border-b-0">
                                            <Text selectable={true} className="text-brand-teal font-bold text-[10px] uppercase tracking-wider mb-1">
                                                Block {i + 1}
                                            </Text>
                                            <Text selectable={true} className="text-gray-800 dark:text-brand-text font-mono text-xs mb-1 bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                                                {block.blockText}
                                            </Text>
                                            <Text selectable={true} className="text-gray-400 font-mono text-[9px] mt-1">
                                                Frame: {JSON.stringify(block.blockFrame)}
                                            </Text>
                                            <Text selectable={true} className="text-gray-400 font-mono text-[9px]">
                                                Corners: {JSON.stringify(block.blockCornerPoints)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View className="bg-gray-100 dark:bg-[#0D0F11] p-6 rounded-xl items-center justify-center border border-gray-200 dark:border-[#21262d] border-dashed mt-4">
                                    <FontAwesome name="hourglass-half" size={32} color={isDark ? "#8B949E" : "#9CA3AF"} className="mb-3" />
                                    <Text className="text-gray-500 dark:text-brand-muted text-base font-medium text-center">Processing image with MLKit...</Text>
                                    <Text className="text-gray-400 text-xs text-center mt-1">Swipe up to expand layout once complete</Text>
                                </View>
                            )}
                        </BottomSheetScrollView>
                    </BottomSheet>

                </SafeAreaView>
            </GestureHandlerRootView>
        </Modal>
    );
}
