import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { CartesianChart, Bar } from 'victory-native';
import { useFont } from '@shopify/react-native-skia';
import withObservables from '@nozbe/with-observables';

import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';

import SpaceMono from '@/assets/fonts/SpaceMono-Regular.ttf';
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
    const font = useFont(SpaceMono, 12);
    const { selectedProduct } = useProductFilter();

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

            <ScrollView className="flex-1">
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

                {chartData.length > 0 ? (
                    <View className="p-4">
                        <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl h-64 p-4">
                            <CartesianChart
                                data={chartData}
                                xKey="product"
                                yKeys={["count"]}
                                domainPadding={{ left: 50, right: 50, top: 30 }}
                                axisOptions={{
                                    font,
                                    tickCount: 5,
                                    labelColor: isDark ? "#8B949E" : "#6B7280",
                                    lineColor: isDark ? "#30363D" : "#E5E7EB",
                                }}
                            >
                                {({ points, chartBounds }) => (
                                    <Bar
                                        chartBounds={chartBounds}
                                        points={points.count}
                                        color="#00C4A7"
                                        roundedCorners={{ topLeft: 4, topRight: 4 }}
                                        animate={{ type: "timing", duration: 500 }}
                                    />
                                )}
                            </CartesianChart>
                        </View>
                    </View>
                ) : (
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

                <View className="px-4 mt-10 mb-20">
                    <Text className="text-gray-400 dark:text-[#30363D] font-bold mb-3 uppercase text-xs tracking-wider">DEV TOOLS</Text>
                    <View className="flex-row space-x-3 gap-3">
                        <TouchableOpacity onPress={seedMockData} className="bg-brand-teal/10 p-3 rounded-xl items-center flex-1 border border-brand-teal/20">
                            <Text className="text-brand-teal font-bold text-sm">Seed Cooler Data</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={clearMockData} className="bg-red-500/10 p-3 rounded-xl items-center flex-1 border border-red-500/20">
                            <Text className="text-red-500 font-bold text-sm">Clear Cooler DB</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const enhance = withObservables([], () => ({
    scannedItems: database.collections.get<ScannedItem>('scanned_items').query(),
    floorItems: database.collections.get<SalesFloor>('sales_floor').query(),
}));

export const CompareFeature = enhance(CompareFeatureBase);
