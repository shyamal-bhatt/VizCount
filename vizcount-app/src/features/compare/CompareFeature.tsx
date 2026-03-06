import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
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

interface CompareFeatureProps {
    scannedItems: ScannedItem[];
    floorItems: SalesFloor[];
}

function CompareFeatureBase({ scannedItems, floorItems }: CompareFeatureProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { selectedProduct } = useProductFilter();

    const listRef = useRef<any>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const {
        filteredCooler,
        filteredFloor,
        coolerCount,
        floorCount,
        totalCount,
        chartDataMap,
        chartData,
        seedMockData,
        clearMockData,
    } = useCompareDB(scannedItems, floorItems, selectedProduct);

    const filterLabel = selectedProduct === 'All' ? 'All Products' : selectedProduct.name;

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
                data={chartData}
                keyExtractor={(item) => item.pid.toString()}
                ListHeaderComponent={
                    <>
                        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#21262d]">
                            <View className="flex-row items-center">
                                <MaterialCommunityIcons name="swap-horizontal" size={20} color="#00C4A7" />
                                <Text className="text-gray-900 dark:text-white text-base font-bold ml-2">Inventory Comparison</Text>
                            </View>
                            <View className="flex-row items-center bg-brand-teal/10 border border-brand-teal/20 rounded-full px-3 py-1">
                                <Feather name="filter" size={12} color="#00C4A7" style={{ marginRight: 4 }} />
                                <Text className="text-brand-teal text-xs font-bold">{filterLabel}</Text>
                            </View>
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
                                    <Text className="flex-[0.8] text-center text-xs font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider">Diff</Text>
                                    <Text className="flex-1 text-xs font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider text-center">Floor</Text>
                                </View>
                            </View>
                        )}
                    </>
                }
                renderItem={({ item: row, index }) => {
                    const diff = row.cooler - row.floor;
                    const isPositive = diff > 0;
                    const isNegative = diff < 0;
                    const isFirst = index === 0;
                    const isLast = index === chartData.length - 1;

                    return (
                        <View className="px-4">
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
                                        <View className={`px-2 py-1 rounded-md min-w-[32px] items-center justify-center ${isPositive ? 'bg-brand-teal/15 border border-brand-teal/30' :
                                            isNegative ? 'bg-red-500/15 border border-red-500/30' :
                                                'bg-gray-100 dark:bg-[#30363D] border border-gray-200 dark:border-gray-600'
                                            }`}>
                                            <Text className={`font-bold text-xs ${isPositive ? 'text-brand-teal' :
                                                isNegative ? 'text-red-500' :
                                                    'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                {isPositive ? `+${diff}` : isNegative ? `${diff}` : '✓'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text className="flex-1 text-center text-gray-900 dark:text-white font-bold">{row.floor}</Text>
                                </View>
                            </View>
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
                ListFooterComponent={
                    <View className="px-4 mt-10 mb-20">
                        <Text className="text-gray-400 dark:text-[#30363D] font-bold mb-3 uppercase text-xs tracking-wider">DEV TOOLS</Text>
                        <View className="flex-row space-x-3 gap-3">
                            <TouchableOpacity onPress={seedMockData} className="bg-brand-teal/10 p-3 rounded-xl items-center flex-1 border border-brand-teal/20">
                                <Text className="text-brand-teal font-bold text-sm">Seed Data</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={clearMockData} className="bg-red-500/10 p-3 rounded-xl items-center flex-1 border border-red-500/20">
                                <Text className="text-red-500 font-bold text-sm">Clear Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
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
        </View>
    );
}

const enhance = withObservables([], () => ({
    scannedItems: database.collections.get<ScannedItem>('scanned_items').query(),
    floorItems: database.collections.get<SalesFloor>('sales_floor').query(),
}));

export const CompareFeature = enhance(CompareFeatureBase);
