import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import withObservables from '@nozbe/with-observables';
import { CartesianChart, Bar } from 'victory-native';
import { useFont } from '@shopify/react-native-skia';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StockPulseHeader } from '@/components/StockPulseHeader';

// Injecting the Inter/SpaceMono font for Victory's Skia Canvas
import SpaceMono from '../../assets/fonts/SpaceMono-Regular.ttf';

interface CompareScreenProps {
    scannedItems: ScannedItem[];
}

const CompareScreen = ({ scannedItems }: CompareScreenProps) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const font = useFont(SpaceMono, 12);

    // Seed Mock Data Action
    const seedMockData = async () => {
        const items = database.collections.get<ScannedItem>('scanned_items');

        await database.write(async () => {
            const batchNames = ["Cold Brew", "Milk 2%", "Orange Juice", "Red Bull", "Kombucha"];

            for (let i = 0; i < 5; i++) {
                const randomProduct = batchNames[Math.floor(Math.random() * batchNames.length)];
                await items.create(item => {
                    item.pid = Math.floor(Math.random() * 10000);
                    item.name = randomProduct;
                    item.sn = Math.floor(Math.random() * 99999);
                    item.bestBeforeDate = Date.now();
                    item.packedOnDate = Date.now();
                    item.netKg = Math.floor(Math.random() * 50);
                    item.count = Math.floor(Math.random() * 12);
                });
            }
        });
    };

    const clearMockData = async () => {
        const items = database.collections.get<ScannedItem>('scanned_items');
        await database.write(async () => {
            const allItems = await items.query().fetch();
            const deletions = allItems.map(item => item.prepareDestroyPermanently());
            await database.batch(...deletions);
        });
    };

    // Aggregate the data for Victory Chart (Count instances of each Product Name)
    const chartDataMap: Record<string, number> = {};
    scannedItems.forEach(item => {
        const name = item.name || 'Unknown';
        chartDataMap[name] = (chartDataMap[name] || 0) + 1;
    });

    const chartData = Object.keys(chartDataMap).map(key => ({
        product: key,
        count: chartDataMap[key]
    }));

    return (
        <View className="flex-1 bg-brand-light dark:bg-brand-dark">
            <StockPulseHeader />

            <ScrollView className="flex-1">
                {/* Section Title */}
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#21262d]">
                    <View className="flex-row items-center">
                        <MaterialCommunityIcons name="swap-horizontal" size={20} color="#00C4A7" />
                        <Text className="text-gray-900 dark:text-white text-base font-bold ml-2">Inventory Comparison</Text>
                    </View>
                    <Text className="text-gray-500 dark:text-brand-muted text-sm">Dairy dept.</Text>
                </View>

                {/* Metrics Cards */}
                <View className="p-4 flex-row space-x-3 gap-3">
                    <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl p-4 flex-1">
                        <View className="flex-row items-center mb-3">
                            <MaterialCommunityIcons name="snowflake" size={16} color="#00C4A7" />
                            <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium ml-2">Cooler</Text>
                        </View>
                        <Text className="text-gray-900 dark:text-white text-3xl font-bold">{scannedItems.length}</Text>
                    </View>

                    <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl p-4 flex-1">
                        <View className="flex-row items-center mb-3">
                            <MaterialCommunityIcons name="storefront-outline" size={16} color="#00C4A7" />
                            <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium ml-2">Floor</Text>
                        </View>
                        <Text className="text-gray-900 dark:text-white text-3xl font-bold">0</Text>
                    </View>

                    <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl p-4 flex-1">
                        <View className="flex-row items-center mb-3">
                            <MaterialCommunityIcons name="equal" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                            <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium ml-2">Diff</Text>
                        </View>
                        <Text className="text-gray-900 dark:text-white text-3xl font-bold">{scannedItems.length}</Text>
                    </View>
                </View>

                {/* Product Breakdown List Header */}
                <View className="px-4 py-3 mt-2 bg-white dark:bg-brand-dark border-t border-b border-gray-200 dark:border-[#21262d] flex-row items-center justify-between">
                    <Text className="text-gray-900 dark:text-white font-bold text-base">Product Breakdown</Text>
                    <View className="bg-gray-100 dark:bg-[#21262D] px-3 py-1 rounded-full border border-gray-200 dark:border-[#30363D]">
                        <Text className="text-gray-500 dark:text-brand-muted text-xs font-bold">{Object.keys(chartDataMap).length} products</Text>
                    </View>
                </View>

                {/* Empty State Mockup vs Chart Logic */}
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
                        <MaterialCommunityIcons name="cube-outline" size={48} color={isDark ? "#30363D" : "#9CA3AF"} className="mb-4" />
                        <Text className="text-gray-500 dark:text-brand-muted text-base font-medium mb-1">No data to compare</Text>
                        <Text className="text-gray-400 dark:text-[#30363D] text-sm text-center">Scan cooler items and add floor entries first</Text>
                    </View>
                )}

                {/* Developer Tools */}
                <View className="px-4 mt-10 mb-20">
                    <Text className="text-gray-400 dark:text-[#30363D] font-bold mb-3 uppercase text-xs tracking-wider">DEV TOOLS</Text>
                    <View className="flex-row space-x-3 gap-3">
                        <TouchableOpacity
                            onPress={seedMockData}
                            className="bg-brand-teal/10 p-3 rounded-xl items-center flex-1 border border-brand-teal/20"
                        >
                            <Text className="text-brand-teal font-bold text-sm">Seed Cooler Data</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={clearMockData}
                            className="bg-red-500/10 p-3 rounded-xl items-center flex-1 border border-red-500/20"
                        >
                            <Text className="text-red-500 font-bold text-sm">Clear DB</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

// React HOC: Observes the WatermelonDB queries and auto-rerenders Component on change
const enhance = withObservables([], () => ({
    scannedItems: database.collections.get<ScannedItem>('scanned_items').query()
}));

export default enhance(CompareScreen);
