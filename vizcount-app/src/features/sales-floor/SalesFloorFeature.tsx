import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from 'nativewind';
import withObservables from '@nozbe/with-observables';
import { Q } from '@nozbe/watermelondb';

import { StockPulseHeader } from '@/src/shared/ui/StockPulseHeader';
import { ProductPickerModal, Product } from '@/src/shared/ui/ProductPickerModal';
import { DatePickerModal } from '@/src/shared/ui/DatePickerModal';
import { wipeAndGenerateDummyData } from '@/db/dummyData';
import { database } from '@/db';
import { SalesFloor } from '@/db/models/SalesFloor';

import { useSalesFloorDB } from './useSalesFloorDB';
import { FloorItemCard } from './ui/FloorItemCard';
import { EditFloorItemModal } from './ui/EditFloorItemModal';

interface SalesFloorFeatureProps {
    floorItems: SalesFloor[];
}

function SalesFloorFeatureBase({ floorItems }: SalesFloorFeatureProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const { availableProducts, addFloorEntry, deleteFloorItem, updateFloorItem } = useSalesFloorDB();

    const [count, setCount] = useState('1');
    const [weight, setWeight] = useState('');
    const [entryType, setEntryType] = useState<'count' | 'weight'>('count');
    const [isGenerating, setIsGenerating] = useState(false);
    const [stagedWeights, setStagedWeights] = useState<{ weight: string, date: string, id: string }[]>([]);

    const [isProductModalVisible, setIsProductModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | 'All' | null>(null);

    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');

    const [editingItem, setEditingItem] = useState<SalesFloor | null>(null);
    const [editCount, setEditCount] = useState('');
    const [editWeight, setEditWeight] = useState('');
    const [editExpiryDate, setEditExpiryDate] = useState('');
    const [isEditDatePickerVisible, setIsEditDatePickerVisible] = useState(false);

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
                            Alert.alert("Success", "Dummy data generated successfully.");
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

        setStagedWeights(prev => [...prev, { weight, date: expiryDate, id: Date.now().toString() }]);
        setWeight('');
    };

    const handleAddEntryToDB = async () => {
        if (!selectedProduct || selectedProduct === 'All') {
            Alert.alert("Product Required", "Please select a specific product.");
            return;
        }

        try {
            const parsedCount = entryType === 'count' ? parseInt(count, 10) : undefined;
            await addFloorEntry({
                type: entryType,
                product: selectedProduct,
                count: parsedCount,
                stagedWeights,
                expiryDate
            });

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", entryType === 'count' ? "Count entry saved." : `${stagedWeights.length} weight entries saved.`);
            setCount('1');
            setWeight('');
            setStagedWeights([]);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to save entry.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleDelete = (id: string) => {
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
                            await deleteFloorItem(id);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (error) {
                            Alert.alert("Error", "Could not delete item.");
                        }
                    }
                }
            ]
        );
    };

    const handleOpenEdit = (item: SalesFloor) => {
        setEditingItem(item);
        setEditCount(item.count?.toString() ?? '1');
        setEditWeight(item.weight?.toString() ?? '');
        if (item.expiryDate) {
            const d = new Date(item.expiryDate);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            setEditExpiryDate(`${yyyy}-${mm}-${dd}`);
        } else {
            setEditExpiryDate('');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            const isWeight = editingItem.weight !== null && editingItem.weight !== undefined;
            await updateFloorItem(editingItem, {
                weight: isWeight ? parseFloat(editWeight) : undefined,
                count: !isWeight ? parseInt(editCount, 10) : undefined,
                expiryDate: editExpiryDate || null
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditingItem(null);
        } catch (error) {
            Alert.alert("Error", "Could not update item.");
        }
    };

    return (
        <KeyboardAvoidingView className="flex-1 bg-brand-light dark:bg-brand-dark" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
            <StockPulseHeader />
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                <TouchableOpacity className={`m-4 flex-row items-center justify-center py-4 rounded-xl shadow-sm ${isGenerating ? 'bg-gray-400 dark:bg-gray-600' : 'bg-red-500'}`} onPress={handleGenerateDummyData} disabled={isGenerating}>
                    <Feather name="database" size={18} color="#FFFFFF" />
                    <Text className="text-white font-bold text-base ml-2">{isGenerating ? "Generating Data..." : "DEV: Generate Dummy Data"}</Text>
                </TouchableOpacity>

                <View className="flex-row items-center px-4 py-4 border-b border-gray-200 dark:border-[#21262d]">
                    <MaterialCommunityIcons name="clipboard-text-outline" size={20} color="#00C4A7" />
                    <Text className="text-gray-900 dark:text-white text-base font-bold ml-2">Sales Floor Entry</Text>
                </View>

                <View className="px-4 py-5 space-y-5 gap-5">
                    <View>
                        <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Product</Text>
                        <TouchableOpacity onPress={() => setIsProductModalVisible(true)} className="flex-row items-center justify-between bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl px-4 py-3">
                            <Text className={`text-base ${selectedProduct ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>
                                {availableProducts.length === 0 ? 'No products defined yet' : selectedProduct ? (selectedProduct === 'All' ? 'All Products' : selectedProduct.name) : 'Select a product'}
                            </Text>
                            <Feather name="chevron-down" size={20} color={isDark ? "#8B949E" : "#6B7280"} />
                        </TouchableOpacity>

                        {selectedProduct && selectedProduct !== 'All' && (
                            <View className="mt-2 flex-row items-center gap-3">
                                <View className="bg-brand-teal/10 border border-brand-teal/30 rounded-lg px-3 py-1.5 flex-row items-center">
                                    <Feather name="tag" size={12} color="#00C4A7" style={{ marginRight: 5 }} />
                                    <Text className="text-brand-teal text-xs font-bold">PID: {selectedProduct.pid}</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    <ProductPickerModal visible={isProductModalVisible} onClose={() => setIsProductModalVisible(false)} products={availableProducts} onSelect={setSelectedProduct} />
                    <DatePickerModal visible={isDatePickerVisible} onClose={() => setIsDatePickerVisible(false)} onSelectDate={setExpiryDate} currentDate={expiryDate || undefined} />

                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={() => setEntryType('count')} className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${entryType === 'count' ? 'bg-brand-teal border-brand-teal' : 'bg-white dark:bg-[#0D0F11] border-gray-200 dark:border-[#30363D]'}`}>
                            <Feather name="hash" size={18} color={entryType === 'count' ? (isDark ? '#0D0F11' : '#FFFFFF') : (isDark ? '#E1E3E6' : '#4B5563')} />
                            <Text className={`font-bold ml-2 ${entryType === 'count' ? (isDark ? 'text-[#0D0F11]' : 'text-white') : (isDark ? 'text-[#E1E3E6]' : 'text-gray-600')}`}>Count</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEntryType('weight')} className={`flex-1 flex-row items-center justify-center py-3 rounded-xl border ${entryType === 'weight' ? 'bg-brand-teal border-brand-teal' : 'bg-white dark:bg-[#0D0F11] border-gray-200 dark:border-[#30363D]'}`}>
                            <MaterialCommunityIcons name="scale" size={18} color={entryType === 'weight' ? (isDark ? '#0D0F11' : '#FFFFFF') : (isDark ? '#E1E3E6' : '#4B5563')} />
                            <Text className={`font-bold ml-2 ${entryType === 'weight' ? (isDark ? 'text-[#0D0F11]' : 'text-white') : (isDark ? 'text-[#E1E3E6]' : 'text-gray-600')}`}>Weight</Text>
                        </TouchableOpacity>
                    </View>

                    {entryType === 'count' ? (
                        <View className="flex-row items-center space-x-3 gap-3">
                            <View className="flex-[2]">
                                <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Quantity</Text>
                                <View className="flex-row items-center gap-2">
                                    <TouchableOpacity className="bg-transparent border border-gray-300 dark:border-[#30363D] w-12 h-12 rounded-xl items-center justify-center" onPress={() => setCount(prev => Math.max(0, parseInt(prev || '0') - 1).toString())}>
                                        <Feather name="minus" size={20} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                    </TouchableOpacity>
                                    <View className="flex-1 bg-white dark:bg-[#1D2125] border border-gray-300 dark:border-[#30363D] h-12 rounded-xl px-4 justify-center">
                                        <TextInput className="text-gray-900 dark:text-white text-center text-lg font-bold p-0 m-0" value={count} onChangeText={setCount} keyboardType="numeric" selectionColor="#00C4A7" />
                                    </View>
                                    <TouchableOpacity className="bg-transparent border border-gray-300 dark:border-[#30363D] w-12 h-12 rounded-xl items-center justify-center" onPress={() => setCount(prev => (parseInt(prev || '0') + 1).toString())}>
                                        <Feather name="plus" size={20} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View className="flex-1">
                                <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Expiry Date</Text>
                                <TouchableOpacity onPress={() => setIsDatePickerVisible(true)} className="flex-row items-center justify-between bg-white dark:bg-[#1D2125] border border-gray-300 dark:border-[#30363D] rounded-xl px-3 h-12">
                                    <Text className={`text-base ${expiryDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>{expiryDate || 'Select'}</Text>
                                    <Feather name="calendar" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View className="bg-white dark:bg-[#1D2125] p-4 rounded-xl border border-gray-200 dark:border-[#30363D] space-y-4 gap-4">
                            <View className="flex-row items-start space-x-3 gap-3">
                                <View className="flex-[2]">
                                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Weight</Text>
                                    <View className="flex-row items-center bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] h-12 rounded-xl px-4 justify-between">
                                        <TextInput className="text-gray-900 dark:text-white text-lg font-bold p-0 m-0 flex-1" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"} selectionColor="#00C4A7" />
                                        <Text className="text-gray-500 dark:text-brand-muted font-bold ml-2">kg</Text>
                                    </View>
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Expiry Date</Text>
                                    <TouchableOpacity onPress={() => setIsDatePickerVisible(true)} className="flex-row items-center justify-between bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] rounded-xl px-3 h-12">
                                        <Text className={`text-base ${expiryDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>{expiryDate || 'Select'}</Text>
                                        <Feather name="calendar" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <TouchableOpacity onPress={handleAddWeightToStage} className="bg-transparent border border-brand-teal flex-row items-center justify-center py-3 rounded-xl border-dashed">
                                <Feather name="plus" size={18} color="#00C4A7" />
                                <Text className="text-brand-teal font-bold text-base ml-2">Add Weight Entry</Text>
                            </TouchableOpacity>
                            {stagedWeights.length > 0 && (
                                <View className="mt-2 space-y-2 gap-2">
                                    <Text className="text-gray-500 dark:text-brand-muted text-xs font-bold uppercase tracking-wider">Staged for Submission ({stagedWeights.length})</Text>
                                    {stagedWeights.map((w) => (
                                        <View key={w.id} className="flex-row items-center justify-between bg-gray-50 dark:bg-brand-dark px-4 py-3 rounded-lg border border-gray-200 dark:border-[#30363D]">
                                            <View className="flex-row items-center gap-4">
                                                <Text className="text-gray-900 dark:text-white font-bold">{w.weight} kg</Text>
                                                <Text className="text-gray-500 dark:text-brand-muted text-sm">{w.date}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => setStagedWeights(prev => prev.filter(cw => cw.id !== w.id))}>
                                                <Feather name="trash-2" size={16} color="#F85149" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    <TouchableOpacity onPress={handleAddEntryToDB} className={`flex-row items-center justify-center py-4 rounded-xl shadow-sm mt-2 ${(entryType === 'weight' && stagedWeights.length === 0) ? 'bg-gray-200 dark:bg-gray-700 opacity-50' : 'bg-brand-teal'}`} disabled={entryType === 'weight' && stagedWeights.length === 0}>
                        <Feather name={entryType === 'weight' ? "database" : "plus"} size={18} color={entryType === 'weight' && stagedWeights.length === 0 ? '#A1A1AA' : (isDark ? '#0D0F11' : '#FFFFFF')} />
                        <Text className={`font-bold text-base ml-2 ${entryType === 'weight' && stagedWeights.length === 0 ? 'text-gray-400' : (isDark ? 'text-[#0D0F11]' : 'text-white')}`}>
                            {entryType === 'weight' ? `Save ${stagedWeights.length} Entries to Database` : 'Save Entry to Database'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="px-4 py-4 mt-2 bg-white dark:bg-brand-dark border-t border-b border-gray-200 dark:border-[#21262d] flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Text className="text-gray-900 dark:text-white font-bold text-base mr-3">Floor Items</Text>
                        <View className="bg-gray-100 dark:bg-[#21262D] px-2 py-0.5 rounded-full">
                            <Text className="text-gray-500 dark:text-brand-muted text-xs font-bold">{floorItems.length}</Text>
                        </View>
                    </View>
                    <Text className="text-gray-500 dark:text-brand-muted text-sm">{selectedProduct && selectedProduct !== 'All' ? selectedProduct.name : 'All Products'}</Text>
                </View>

                <View className="px-4 py-4 space-y-3 gap-3">
                    {floorItems.length === 0 ? (
                        <View className="items-center justify-center py-10 px-8 border border-dashed border-gray-300 dark:border-[#30363D] rounded-xl">
                            <MaterialCommunityIcons name="cube-outline" size={32} color={isDark ? "#30363D" : "#9CA3AF"} style={{ marginBottom: 8 }} />
                            <Text className="text-gray-500 dark:text-brand-muted text-center font-medium">No sales floor items recorded today.</Text>
                        </View>
                    ) : (
                        floorItems.map(item => (
                            <FloorItemCard key={item.id} item={item} onEdit={handleOpenEdit} onDelete={handleDelete} />
                        ))
                    )}
                </View>
            </ScrollView>

            <EditFloorItemModal
                editingItem={editingItem}
                editCount={editCount} setEditCount={setEditCount}
                editWeight={editWeight} setEditWeight={setEditWeight}
                editExpiryDate={editExpiryDate} setEditExpiryDate={setEditExpiryDate}
                isEditDatePickerVisible={isEditDatePickerVisible} setIsEditDatePickerVisible={setIsEditDatePickerVisible}
                onCancel={() => setEditingItem(null)} onSave={handleSaveEdit}
            />
        </KeyboardAvoidingView>
    );
}

const enhance = withObservables([], () => ({
    floorItems: database.collections.get<SalesFloor>('sales_floor').query(
        Q.sortBy('created_at', Q.desc)
    )
}));

export const SalesFloorFeature = enhance(SalesFloorFeatureBase);
