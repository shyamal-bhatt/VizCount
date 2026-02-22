import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import withObservables from '@nozbe/with-observables';
import { CartesianChart, Bar } from 'victory-native';
import { useFont } from '@shopify/react-native-skia';
import { SafeAreaView } from 'react-native-safe-area-context';

// Injecting the Inter/SpaceMono font for Victory's Skia Canvas
import SpaceMono from '../../assets/fonts/SpaceMono-Regular.ttf';

interface CompareScreenProps {
    scannedItems: ScannedItem[];
}

const CompareScreen = ({ scannedItems }: CompareScreenProps) => {
    const isDark = useColorScheme() === 'dark';
    const font = useFont(SpaceMono, 12);

    // Seed Mock Data Action
    const seedMockData = async () => {
        const items = database.collections.get<ScannedItem>('scanned_items');

        await database.write(async () => {
            const batchNames = ["Cold Brew", "Milk 2%", "Orange Juice", "Red Bull", "Kombucha"];

            for (let i = 0; i < 5; i++) {
                const randomProduct = batchNames[Math.floor(Math.random() * batchNames.length)];
                await items.create(item => {
                    item.productId = `DEV-${Math.floor(Math.random() * 1000)}`;
                    item.productName = randomProduct;
                    item.batchNumber = `BCH-${Math.floor(Math.random() * 99999)}`;
                    item.expirationDate = new Date().toISOString();
                    item.rawOcrText = `Mocked ${randomProduct} via Dev Button`;
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
        const name = item.productName || 'Unknown';
        chartDataMap[name] = (chartDataMap[name] || 0) + 1;
    });

    const chartData = Object.keys(chartDataMap).map(key => ({
        product: key,
        count: chartDataMap[key]
    }));

    return (
        <SafeAreaView edges={['top']} className="flex-1 bg-brand-light dark:bg-brand-dark">
            <View className="px-4 py-4 border-b border-gray-200 dark:border-brand-card">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Dashboard</Text>
                <Text className="text-gray-500 dark:text-brand-muted mt-1">Real-time WatermelonDB Analytics</Text>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Metrics Cards */}
                <View className="flex-row justify-between mb-6">
                    <View className="bg-white dark:bg-brand-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-brand-darker flex-1 mr-2">
                        <Text className="text-gray-500 dark:text-brand-muted text-xs uppercase font-bold tracking-wider mb-1">Total Scanned</Text>
                        <Text className="text-3xl font-bold text-brand-teal">{scannedItems.length}</Text>
                    </View>
                    <View className="bg-white dark:bg-brand-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-brand-darker flex-1 ml-2">
                        <Text className="text-gray-500 dark:text-brand-muted text-xs uppercase font-bold tracking-wider mb-1">Unique SKUs</Text>
                        <Text className="text-3xl font-bold text-blue-500">{Object.keys(chartDataMap).length}</Text>
                    </View>
                </View>

                {/* Victory Native Chart */}
                <View className="bg-white dark:bg-brand-card p-4 rounded-xl shadow-sm border border-gray-100 dark:border-brand-darker h-80 mb-6">
                    <Text className="text-gray-900 dark:text-white font-bold mb-4">Stock Levels</Text>

                    {chartData.length > 0 ? (
                        <View className="flex-1">
                            <CartesianChart
                                data={chartData}
                                xKey="product"
                                yKeys={["count"]}
                                domainPadding={{ left: 50, right: 50, top: 30 }}
                                axisOptions={{
                                    font,
                                    tickCount: 5,
                                    labelColor: isDark ? "#8B949E" : "#9CA3AF",
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
                    ) : (
                        <View className="flex-1 items-center justify-center">
                            <Text className="text-gray-500 dark:text-brand-muted">No data available yet.</Text>
                            <Text className="text-gray-400 text-xs mt-1">Scan items or seed mock data.</Text>
                        </View>
                    )}
                </View>

                {/* Debug Actions */}
                <View className="mb-10">
                    <Text className="text-gray-800 dark:text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider">Developer Tools</Text>
                    <View className="flex-row space-x-3 gap-3">
                        <TouchableOpacity
                            onPress={seedMockData}
                            className="bg-brand-teal/10 p-4 rounded-xl items-center flex-1 border border-brand-teal/20"
                        >
                            <Text className="text-brand-teal font-bold">Seed 5 Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={clearMockData}
                            className="bg-red-500/10 p-4 rounded-xl items-center flex-1 border border-red-500/20"
                        >
                            <Text className="text-red-500 font-bold">Clear All</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// React HOC: Observes the WatermelonDB queries and auto-rerenders Component on change
const enhance = withObservables([], () => ({
    scannedItems: database.collections.get<ScannedItem>('scanned_items').query()
}));

export default enhance(CompareScreen);
