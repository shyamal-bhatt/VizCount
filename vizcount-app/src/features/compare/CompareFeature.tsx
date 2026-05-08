import React, { useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import withObservables from '@nozbe/with-observables';

import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';

import { StockPulseHeader } from '@/src/shared/ui/StockPulseHeader';
import { useProductFilter } from '@/context/ProductFilterContext';

import { useCompareDB } from './useCompareDB';
import { DiffCard } from './ui/DiffCard';
import { ProductPickerModal } from '@/src/shared/ui/ProductPickerModal';

interface CompareFeatureProps {
    scannedItems: ScannedItem[];
    floorItems: SalesFloor[];
}

function CompareFeatureBase({ scannedItems, floorItems }: CompareFeatureProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { selectedProduct, setSelectedProduct, definedProducts } = useProductFilter();

    const listRef = useRef<any>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isProductModalVisible, setIsProductModalVisible] = useState(false);
    const [activeProduct, setActiveProduct] = useState<any>(null);

    const {
        filteredCooler,
        filteredFloor,
        coolerCount,
        floorCount,
        totalCount,
        chartDataMap,
        chartData,
    } = useCompareDB(scannedItems, floorItems, selectedProduct);

    const filterLabel = selectedProduct === 'All' ? 'All Products' : selectedProduct.name;

    const displayedData = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return chartData;
        return chartData.filter(d => 
            d.product.toLowerCase().includes(query) || 
            d.pid.toString().includes(query)
        );
    }, [chartData, searchQuery]);

    return (
        <View className="flex-1 bg-brand-light dark:bg-brand-dark">
            <StockPulseHeader />

            <FlatList
                ref={listRef}
                onScroll={(e: any) => {
                    const offsetY = e.nativeEvent.contentOffset.y;
                    if (offsetY > 100 && !showScrollTop) setShowScrollTop(true);
                    else if (offsetY <= 100 && showScrollTop) setShowScrollTop(false);
                }}
                scrollEventThrottle={16}
                className="flex-1"
                data={displayedData}
                keyExtractor={(item) => item.pid.toString()}
                ListHeaderComponent={
                    <>
                        <View className="px-4 py-3 border-b border-gray-200 dark:border-[#21262d]">
                            <View className="flex-row items-center bg-gray-100 dark:bg-[#21262D] rounded-xl px-3 py-2 border border-gray-200 dark:border-[#30363D]">
                                <Feather name="search" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                                <TextInput
                                    className="flex-1 ml-2 text-gray-900 dark:text-white text-sm"
                                    placeholder="Search compared products..."
                                    placeholderTextColor={isDark ? "#8B949E" : "#9CA3AF"}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Feather name="x-circle" size={16} color={isDark ? "#8B949E" : "#6B7280"} className="mr-2" />
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity 
                                    onPress={() => setIsProductModalVisible(true)} 
                                    className="ml-2 pl-2 border-l border-gray-300 dark:border-[#30363D] flex-row items-center"
                                >
                                    <Feather name="filter" size={16} color={selectedProduct !== 'All' ? "#00C4A7" : (isDark ? "#8B949E" : "#6B7280")} />
                                    {selectedProduct !== 'All' && (
                                        <View className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#00C4A7] -mt-1 -mr-1" />
                                    )}
                                </TouchableOpacity>
                            </View>
                            {selectedProduct !== 'All' && (
                                <View className="mt-2 flex-row items-center">
                                    <Text className="text-xs text-gray-500 dark:text-brand-muted mr-1">Filtered by:</Text>
                                    <View className="bg-brand-teal/10 px-2 py-0.5 rounded flex-row items-center border border-brand-teal/20">
                                       <Text className="text-[10px] text-brand-teal font-bold">{selectedProduct.name}</Text>
                                       <TouchableOpacity onPress={() => setSelectedProduct('All')} className="ml-1" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                           <Feather name="x" size={10} color="#00C4A7" />
                                       </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </View>

                        <DiffCard
                            coolerCount={coolerCount}
                            filteredScansLength={filteredCooler.length}
                            floorCount={floorCount}
                            filteredEntriesLength={filteredFloor.length}
                            totalCount={totalCount}
                        />

                        <View className="px-4 py-3 mt-2 bg-white dark:bg-brand-dark border-t border-b border-gray-200 dark:border-[#21262d] flex-row items-center justify-between">
                            <Text className="text-gray-900 dark:text-white font-bold text-base">Product Breakdown</Text>
                            <View className="bg-gray-100 dark:bg-[#21262D] px-3 py-1 rounded-full border border-gray-200 dark:border-[#30363D]">
                                <Text className="text-gray-500 dark:text-brand-muted text-xs font-bold">{Object.keys(chartDataMap).length} products</Text>
                            </View>
                        </View>

                        {chartData.length > 0 && (
                            <View className="px-4 mt-2 mb-2">
                                <View className="flex-row items-center px-4 py-2 border-b border-gray-200 dark:border-[#30363D]">
                                    <Text className="flex-[2] text-xs font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider">Product</Text>
                                    <Text className="flex-1 text-xs font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider text-center">Cooler</Text>
                                    <Text className="flex-[0.8] text-center text-xs font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider">Sum</Text>
                                    <Text className="flex-1 text-xs font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider text-center">Floor</Text>
                                </View>
                            </View>
                        )}
                    </>
                }
                renderItem={({ item: row, index }) => {
                    const rowSum = row.cooler + row.floor;
                    const isFirst = index === 0;
                    const isLast = index === displayedData.length - 1;

                    return (
                        <View className="px-4">
                            <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveProduct(row)}>
                                <View className={`bg-white dark:bg-[#1D2125] border-x border-gray-200 dark:border-[#30363D] ${isFirst ? 'border-t rounded-t-2xl overflow-hidden' : ''} ${isLast ? 'border-b rounded-b-2xl overflow-hidden' : ''}`}>
                                    <View
                                        className={`flex-row items-center px-4 py-4 ${!isLast ? 'border-b border-gray-100 dark:border-[#30363D]' : ''}`}
                                    >
                                        <View className="flex-[2]">
                                            <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>{row.product}</Text>
                                            <Text className="text-gray-400 dark:text-brand-muted text-xs mt-0.5">PID: {row.pid}</Text>
                                        </View>

                                        <Text className="flex-1 text-center text-gray-900 dark:text-white font-bold">{row.cooler}</Text>

                                        <View className="flex-[0.8] items-center justify-center">
                                            <View className="px-2 py-1 rounded-md min-w-[32px] items-center justify-center bg-gray-100 dark:bg-[#30363D] border border-gray-200 dark:border-gray-600">
                                                <Text className="font-bold text-xs text-gray-900 dark:text-white">
                                                    {rowSum}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text className="flex-1 text-center text-gray-900 dark:text-white font-bold">{row.floor}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>
                    );
                }}
                ListEmptyComponent={() => (
                    <View className="items-center justify-center py-20 px-8">
                        <MaterialCommunityIcons name="cube-outline" size={48} color={isDark ? "#30363D" : "#9CA3AF"} style={{ marginBottom: 12 }} />
                        <Text className="text-gray-500 dark:text-brand-muted text-base font-medium mb-1">No data to compare</Text>
                        <Text className="text-gray-400 dark:text-[#30363D] text-sm text-center">
                            {selectedProduct === 'All'
                                ? 'Scan cooler items and add floor entries first'
                                : `No entries found for "${filterLabel}"`}
                        </Text>
                    </View>
                )}
            />

            {/* Scroll to Top FAB */}
            {showScrollTop && (
                <TouchableOpacity
                    className="absolute right-6 bg-[#00C4A7] w-12 h-12 rounded-full items-center justify-center shadow-lg transform translate-y-[-10px]"
                    style={{ elevation: 5, zIndex: 100, bottom: 20 }}
                    onPress={() => {
                        listRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }}
                >
                    <Feather name="arrow-up" size={24} color="#FFF" />
                </TouchableOpacity>
            )}

            <ProductPickerModal
                visible={isProductModalVisible}
                onClose={() => setIsProductModalVisible(false)}
                products={definedProducts}
                onSelect={(p) => setSelectedProduct(p)}
                showAllOption
            />

            {activeProduct && (
                <Modal
                    visible={!!activeProduct}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setActiveProduct(null)}
                >
                    <View className="flex-1 bg-black/50 justify-end">
                        <View className="bg-white dark:bg-brand-dark rounded-t-3xl pt-6 pb-10 px-6 mt-20 h-auto max-h-[80%]">
                            <View className="flex-row items-center justify-between mb-6">
                                <Text className="text-xl font-bold text-gray-900 dark:text-white">Product Summary</Text>
                                <TouchableOpacity onPress={() => setActiveProduct(null)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#30363D] items-center justify-center">
                                    <Feather name="x" size={20} color={isDark ? '#E1E3E6' : '#4B5563'} />
                                </TouchableOpacity>
                            </View>

                            <View className="mb-6">
                                <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{activeProduct.product}</Text>
                                <Text className="text-gray-500 dark:text-brand-muted text-base">PID: {activeProduct.pid}</Text>
                            </View>

                            <View className="bg-gray-50 dark:bg-[#1D2125] rounded-2xl border border-gray-200 dark:border-[#30363D] overflow-hidden">
                                <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#30363D]">
                                    <Text className="text-gray-700 dark:text-[#E1E3E6] font-medium">Cooler Units</Text>
                                    <Text className="text-gray-900 dark:text-white font-bold">{activeProduct.cooler}</Text>
                                </View>
                                <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#30363D]">
                                    <Text className="text-gray-700 dark:text-[#E1E3E6] font-medium">Floor Units</Text>
                                    <Text className="text-gray-900 dark:text-white font-bold">{activeProduct.floor}</Text>
                                </View>
                                <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#30363D]">
                                    <Text className="text-gray-700 dark:text-[#E1E3E6] font-medium">Total Units</Text>
                                    <Text className="text-gray-900 dark:text-white font-bold">{activeProduct.cooler + activeProduct.floor}</Text>
                                </View>
                                <View className="flex-row items-center justify-between px-4 py-4">
                                    <Text className="text-gray-700 dark:text-[#E1E3E6] font-medium">Total Recorded Weight</Text>
                                    <Text className="text-brand-teal font-bold">{((activeProduct.coolerWeight || 0) + (activeProduct.floorWeight || 0)).toFixed(2)} kg</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

const enhance = withObservables([], () => ({
    scannedItems: database.collections.get<ScannedItem>('scanned_items').query(),
    floorItems: database.collections.get<SalesFloor>('sales_floor').query(),
}));

export const CompareFeature = enhance(CompareFeatureBase);
