import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StockPulseHeader } from '@/components/StockPulseHeader';
import { wipeAndGenerateDummyData } from '@/db/dummyData';
import { ProductPickerModal, Product } from '@/components/ProductPickerModal';
import { DatePickerModal } from '@/components/DatePickerModal';
import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';
import * as Haptics from 'expo-haptics';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';
import { useColorScheme } from 'nativewind';

interface ManualScreenProps {
    floorItems: SalesFloor[];
}

function ManualScreen({ floorItems }: ManualScreenProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [count, setCount] = useState('1');
    const [weight, setWeight] = useState('');
    const [entryType, setEntryType] = useState<'count' | 'weight'>('count');
    const [isGenerating, setIsGenerating] = useState(false);

    // Staged Weight List (For adding multiple weights for a single product fast)
    const [stagedWeights, setStagedWeights] = useState<{ weight: string, date: string, id: string }[]>([]);

    // Product Picker State
    const [isProductModalVisible, setIsProductModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | 'All' | null>(null);
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

    // Date Picker State
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');

    const fetchProducts = async () => {
        try {
            const itemsCollection = database.collections.get<ScannedItem>('scanned_items');
            const allItems = await itemsCollection.query().fetch();

            // Get unique products by PID
            const uniqueProductsMap = new Map<number, Product>();
            allItems.forEach(item => {
                if (!uniqueProductsMap.has(item.pid)) {
                    uniqueProductsMap.set(item.pid, { pid: item.pid, name: item.name });
                }
            });

            setAvailableProducts(Array.from(uniqueProductsMap.values()));
        } catch (error) {
            console.error("Failed to load products:", error);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Also listen to database changes on scanned_items to auto-update the list (ex: after dummy generation)
    useEffect(() => {
        const subscription = database.collections.get('scanned_items').changes.subscribe(() => {
            fetchProducts();
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleGenerateDummyData = async () => {
        Alert.alert(
            "Generate Dummy Data",
            "This will wipe all existing data and generate ~600 new records. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Generate",
                    style: "destructive",
                    onPress: async () => {
                        setIsGenerating(true);
                        const success = await wipeAndGenerateDummyData();
                        setIsGenerating(false);
                        if (success) {
                            Alert.alert("Success", "Dummy data generated successfully. Please restart the app or reload this screen to see the updated product list.");
                        } else {
                            Alert.alert("Error", "Failed to generate dummy data.");
                        }
                    }
                }
            ]
        );
    };

    const handleAddWeightToStage = () => {
        if (!weight || Number.isNaN(parseFloat(weight))) {
            Alert.alert("Invalid Input", "Please enter a valid numeric weight.");
            return;
        }
        if (!expiryDate) {
            Alert.alert("Date Required", "Please select an expiry date for this weight.");
            return;
        }

        setStagedWeights(prev => [...prev, {
            weight,
            date: expiryDate,
            id: Date.now().toString()
        }]);
        setWeight('');
        // Keep date selected to speed up next entry
    };

    const removeStagedWeight = (id: string) => {
        setStagedWeights(prev => prev.filter(w => w.id !== id));
    };

    const handleAddEntryToDB = async () => {
        if (!selectedProduct || selectedProduct === 'All') {
            Alert.alert("Product Required", "Please select a specific product.");
            return;
        }

        try {
            await database.write(async () => {
                const floorCollection = database.collections.get('sales_floor');
                const now = Date.now();

                if (entryType === 'count') {
                    // Single entry for Count
                    const parsedCount = parseInt(count);
                    if (Number.isNaN(parsedCount) || parsedCount <= 0) {
                        throw new Error("Invalid count");
                    }

                    await floorCollection.create((entry: any) => {
                        entry.pid = selectedProduct.pid;
                        entry.name = selectedProduct.name;
                        entry.count = parsedCount;
                        entry.weight = null;
                        entry.expiryDate = expiryDate ? new Date(expiryDate).getTime() : null;
                    });
                } else if (entryType === 'weight') {
                    // Multiple entries from Staged Weights
                    const batchWrites = stagedWeights.map(staged =>
                        floorCollection.prepareCreate((entry: any) => {
                            entry.pid = selectedProduct.pid;
                            entry.name = selectedProduct.name;
                            entry.count = 1; // Always 1 for individual weight entities
                            entry.weight = parseFloat(staged.weight);
                            entry.expiryDate = new Date(staged.date).getTime();
                        })
                    );

                    // Execute batch properly (this is where watermelon thrives)
                    await database.batch(...batchWrites);

                    // Clear staged weights after successful batch
                    setStagedWeights([]);
                }
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", entryType === 'count' ? "Count entry saved." : `${stagedWeights.length} weight entries saved.`);

            // Reset common inputs
            setCount('1');
            setWeight('');
            // Keep the selected product as they might be doing multiple scans

        } catch (error: any) {
            console.error("DB Write Error:", error);
            Alert.alert("Error", error.message || "Failed to save entry.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleDeleteFloorItem = (id: string) => {
        Alert.alert(
            "Delete Item",
            "Are you sure you want to remove this item from the floor?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await database.write(async () => {
                                const item = await database.collections.get<SalesFloor>('sales_floor').find(id);
                                await item.destroyPermanently();
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            console.error("Failed to delete floor item:", error);
                            Alert.alert("Error", "Could not delete item.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-brand-light dark:bg-brand-dark"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
            <StockPulseHeader />

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Temporary Dev Tool: Generate Dummy Data CTA */}
                <TouchableOpacity
                    className={`m-4 flex-row items-center justify-center py-4 rounded-xl shadow-sm ${isGenerating ? 'bg-gray-400 dark:bg-gray-600' : 'bg-red-500'}`}
                    onPress={handleGenerateDummyData}
                    disabled={isGenerating}
                >
                    <Feather name="database" size={18} color="#FFFFFF" />
                    <Text className="text-white font-bold text-base ml-2">
                        {isGenerating ? "Generating Data..." : "DEV: Generate Dummy Data"}
                    </Text>
                </TouchableOpacity>

                {/* Section Title */}
                <View className="flex-row items-center px-4 py-4 border-b border-gray-200 dark:border-[#21262d]">
                    <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#00C4A7" />
                    <Text className="text-gray-900 dark:text-white text-base font-bold ml-2">Sales Floor Entry</Text>
                </View>

                {/* Main Form Area */}
                <View className="px-4 py-5 space-y-5 gap-5">

                    {/* Product Selector */}
                    <View>
                        <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Product</Text>
                        <TouchableOpacity
                            onPress={() => setIsProductModalVisible(true)}
                            className="flex-row items-center justify-between bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl px-4 py-3"
                        >
                            <Text className={`text-base ${selectedProduct ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>
                                {availableProducts.length === 0
                                    ? '---'
                                    : selectedProduct
                                        ? (selectedProduct === 'All' ? 'All Products' : selectedProduct.name)
                                        : 'Select a product'}
                            </Text>
                            <Feather name="chevron-down" size={20} color={isDark ? "#8B949E" : "#6B7280"} />
                        </TouchableOpacity>
                    </View>

                    <ProductPickerModal
                        visible={isProductModalVisible}
                        onClose={() => setIsProductModalVisible(false)}
                        products={availableProducts}
                        onSelect={setSelectedProduct}
                    />

                    <DatePickerModal
                        visible={isDatePickerVisible}
                        onClose={() => setIsDatePickerVisible(false)}
                        onSelectDate={setExpiryDate}
                        currentDate={expiryDate || undefined}
                    />

                    {/* Entry Type Toggle */}
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity
                            onPress={() => setEntryType('count')}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${entryType === 'count' ? 'bg-brand-teal border-brand-teal' : 'bg-white dark:bg-[#0D0F11] border-gray-200 dark:border-[#30363D]'}`}
                        >
                            <Feather name="hash" size={18} color={entryType === 'count' ? (isDark ? '#0D0F11' : '#FFFFFF') : (isDark ? '#E1E3E6' : '#4B5563')} />
                            <Text className={`font-bold ml-2 ${entryType === 'count' ? (isDark ? 'text-[#0D0F11]' : 'text-white') : (isDark ? 'text-[#E1E3E6]' : 'text-gray-600')}`}>Count</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setEntryType('weight')}
                            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${entryType === 'weight' ? 'bg-brand-teal border-brand-teal' : 'bg-white dark:bg-[#0D0F11] border-gray-200 dark:border-[#30363D]'}`}
                        >
                            <MaterialCommunityIcons name="scale" size={18} color={entryType === 'weight' ? (isDark ? '#0D0F11' : '#FFFFFF') : (isDark ? '#E1E3E6' : '#4B5563')} />
                            <Text className={`font-bold ml-2 ${entryType === 'weight' ? (isDark ? 'text-[#0D0F11]' : 'text-white') : (isDark ? 'text-[#E1E3E6]' : 'text-gray-600')}`}>Weight</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Dynamic Inputs Based on Type */}
                    {entryType === 'count' ? (
                        <View className="flex-row items-center space-x-3 gap-3">
                            {/* Quantity Controls */}
                            <View className="flex-[2]">
                                <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Quantity</Text>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity
                                        className="bg-transparent border border-gray-300 dark:border-[#30363D] w-12 h-12 rounded-xl items-center justify-center"
                                        onPress={() => setCount(prev => Math.max(0, parseInt(prev || '0') - 1).toString())}
                                    >
                                        <Feather name="minus" size={20} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                    </TouchableOpacity>

                                    <View className="flex-1 bg-white dark:bg-[#1D2125] border border-gray-300 dark:border-[#30363D] h-12 rounded-xl px-4 justify-center">
                                        <TextInput
                                            className="text-gray-900 dark:text-white text-center text-lg font-bold p-0 m-0"
                                            value={count}
                                            onChangeText={setCount}
                                            keyboardType="numeric"
                                            selectionColor="#00C4A7"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        className="bg-transparent border border-gray-300 dark:border-[#30363D] w-12 h-12 rounded-xl items-center justify-center"
                                        onPress={() => setCount(prev => (parseInt(prev || '0') + 1).toString())}
                                    >
                                        <Feather name="plus" size={20} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Expiry Date */}
                            <View className="flex-1">
                                <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Expiry Date</Text>
                                <TouchableOpacity
                                    onPress={() => setIsDatePickerVisible(true)}
                                    className="flex-row items-center justify-between bg-white dark:bg-[#1D2125] border border-gray-300 dark:border-[#30363D] rounded-xl px-3 h-12"
                                >
                                    <Text className={`text-base ${expiryDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>
                                        {expiryDate || 'Select'}
                                    </Text>
                                    <Feather name="calendar" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View className="bg-white dark:bg-[#1D2125] p-4 rounded-xl border border-gray-200 dark:border-[#30363D] space-y-4 gap-4">
                            <View className="flex-row items-start space-x-3 gap-3">
                                {/* Weight Input */}
                                <View className="flex-[2]">
                                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Weight</Text>
                                    <View className="flex-row items-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] h-12 rounded-xl px-4 justify-between">
                                        <TextInput
                                            className="text-gray-900 dark:text-white text-lg font-bold p-0 m-0 flex-1"
                                            value={weight}
                                            onChangeText={setWeight}
                                            keyboardType="decimal-pad"
                                            placeholder="0.00"
                                            placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                            selectionColor="#00C4A7"
                                        />
                                        <Text className="text-gray-500 dark:text-brand-muted font-bold ml-2">kg</Text>
                                    </View>
                                </View>

                                {/* Expiry Date */}
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Expiry Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setIsDatePickerVisible(true)}
                                        className="flex-row items-center justify-between bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] rounded-xl px-3 h-12"
                                    >
                                        <Text className={`text-base ${expiryDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>
                                            {expiryDate || 'Select'}
                                        </Text>
                                        <Feather name="calendar" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Add Single Weight Button */}
                            <TouchableOpacity
                                onPress={handleAddWeightToStage}
                                className="bg-transparent border border-brand-teal flex-row items-center justify-center py-3 rounded-xl border-dashed"
                            >
                                <Feather name="plus" size={18} color="#00C4A7" />
                                <Text className="text-brand-teal font-bold text-base ml-2">Add Weight Entry</Text>
                            </TouchableOpacity>

                            {/* Staged Weights List */}
                            {stagedWeights.length > 0 && (
                                <View className="mt-2 space-y-2 gap-2">
                                    <Text className="text-gray-500 dark:text-brand-muted text-xs font-bold uppercase tracking-wider">Staged for Submission ({stagedWeights.length})</Text>
                                    {stagedWeights.map((w, index) => (
                                        <View key={w.id} className="flex-row items-center justify-between bg-gray-50 dark:bg-brand-dark px-4 py-3 rounded-lg border border-gray-200 dark:border-[#30363D]">
                                            <View className="flex-row items-center gap-4">
                                                <Text className="text-gray-900 dark:text-white font-bold">{w.weight} kg</Text>
                                                <Text className="text-gray-500 dark:text-brand-muted text-sm">{w.date}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => removeStagedWeight(w.id)}>
                                                <Feather name="trash-2" size={16} color="#F85149" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Final Add Entry CTA (Saves to DB) */}
                    <TouchableOpacity
                        onPress={handleAddEntryToDB}
                        className={`flex-row items-center justify-center py-4 rounded-xl shadow-sm mt-2 ${(entryType === 'weight' && stagedWeights.length === 0)
                            ? 'bg-gray-200 dark:bg-gray-700 opacity-50'
                            : 'bg-brand-teal'
                            }`}
                        disabled={entryType === 'weight' && stagedWeights.length === 0}
                    >
                        <Feather name={entryType === 'weight' ? "database" : "plus"} size={18} color={entryType === 'weight' && stagedWeights.length === 0 ? '#A1A1AA' : (isDark ? '#0D0F11' : '#FFFFFF')} />
                        <Text className={`font-bold text-base ml-2 ${entryType === 'weight' && stagedWeights.length === 0 ? 'text-gray-400' : (isDark ? 'text-[#0D0F11]' : 'text-white')}`}>
                            {entryType === 'weight'
                                ? `Save ${stagedWeights.length} Entries to Database`
                                : 'Save Entry to Database'
                            }
                        </Text>
                    </TouchableOpacity>

                </View>

                {/* Floor Items List Header */}
                <View className="px-4 py-4 mt-2 bg-white dark:bg-brand-dark border-t border-b border-gray-200 dark:border-[#21262d] flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Text className="text-gray-900 dark:text-white font-bold text-base mr-3">Floor Items</Text>
                        <View className="bg-gray-100 dark:bg-[#21262D] px-2 py-0.5 rounded-full">
                            <Text className="text-gray-500 dark:text-brand-muted text-xs font-bold">{floorItems.length}</Text>
                        </View>
                    </View>
                    <Text className="text-gray-500 dark:text-brand-muted text-sm">{selectedProduct && selectedProduct !== 'All' ? selectedProduct.name : 'All Products'}</Text>
                </View>

                {/* Floor Items List */}
                <View className="px-4 py-4 space-y-3 gap-3">
                    {floorItems.length === 0 ? (
                        <View className="items-center justify-center py-10 px-8 border border-dashed border-gray-300 dark:border-[#30363D] rounded-xl">
                            <MaterialCommunityIcons name="cube-outline" size={32} color={isDark ? "#30363D" : "#9CA3AF"} className="mb-3" />
                            <Text className="text-gray-500 dark:text-brand-muted text-center font-medium">No sales floor items recorded today.</Text>
                        </View>
                    ) : (
                        floorItems.map(item => (
                            <View key={item.id} className="bg-white dark:bg-[#1D2125] p-4 rounded-xl border border-gray-200 dark:border-[#30363D] flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="text-gray-900 dark:text-white font-bold text-base mb-1">{item.name}</Text>
                                    <View className="flex-row items-center gap-3">
                                        {item.weight ? (
                                            <View className="flex-row items-center">
                                                <MaterialCommunityIcons name="scale" size={14} color={isDark ? "#8B949E" : "#6B7280"} />
                                                <Text className="text-gray-500 dark:text-brand-muted text-sm ml-1 font-medium">{item.weight} kg</Text>
                                            </View>
                                        ) : (
                                            <View className="flex-row items-center">
                                                <Feather name="hash" size={12} color={isDark ? "#8B949E" : "#6B7280"} />
                                                <Text className="text-gray-500 dark:text-brand-muted text-sm ml-1 font-medium">{item.count} items</Text>
                                            </View>
                                        )}
                                        {item.expiryDate && (
                                            <View className="flex-row items-center">
                                                <Feather name="calendar" size={12} color={isDark ? "#8B949E" : "#6B7280"} />
                                                <Text className="text-gray-500 dark:text-brand-muted text-sm ml-1">
                                                    {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View className="flex-row items-center gap-3 ml-4">
                                    <TouchableOpacity
                                        onPress={() => Alert.alert("Edit Item", "Edit functionality coming soon.")}
                                        className="w-10 h-10 bg-gray-50 dark:bg-[#21262d] rounded-full items-center justify-center border border-gray-200 dark:border-[#30363D]"
                                    >
                                        <Feather name="edit-2" size={16} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteFloorItem(item.id)}
                                        className="w-10 h-10 bg-red-50 dark:bg-[#21262d] rounded-full items-center justify-center border border-red-200 dark:border-red-900/30"
                                    >
                                        <Feather name="trash-2" size={16} color="#F85149" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const enhance = withObservables([], () => ({
    floorItems: database.collections.get<SalesFloor>('sales_floor').query(
        Q.sortBy('created_at', Q.desc)
    )
}));

export default enhance(ManualScreen);
