import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SalesFloor } from '@/db/models/SalesFloor';
import { DatePickerModal } from '@/src/shared/ui/DatePickerModal';

interface EditFloorItemModalProps {
    editingItem: SalesFloor | null;
    editCount: string;
    setEditCount: (v: string | ((prev: string) => string)) => void;
    editWeight: string;
    setEditWeight: (v: string) => void;
    editExpiryDate: string;
    setEditExpiryDate: (v: string) => void;
    isEditDatePickerVisible: boolean;
    setIsEditDatePickerVisible: (v: boolean) => void;
    onCancel: () => void;
    onSave: () => Promise<void>;
}

export function EditFloorItemModal({
    editingItem, editCount, setEditCount, editWeight, setEditWeight,
    editExpiryDate, setEditExpiryDate, isEditDatePickerVisible,
    setIsEditDatePickerVisible, onCancel, onSave
}: EditFloorItemModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    if (!editingItem) return null;

    const isWeightEntry = editingItem.weight !== null && editingItem.weight !== undefined;

    return (
        <Modal visible={!!editingItem} animationType="slide" transparent onRequestClose={onCancel}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-black/50 justify-end">
                <View className="bg-white dark:bg-brand-dark rounded-t-3xl p-6" style={{ paddingBottom: insets.bottom + 16 }}>
                    <View className="items-center mb-4">
                        <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#30363D]" />
                    </View>

                    <Text className="text-xl font-bold text-gray-900 dark:text-white mb-1">Edit Floor Item</Text>
                    <Text className="text-brand-teal text-sm font-medium mb-5">{editingItem.name} · PID {editingItem.pid}</Text>

                    {isWeightEntry ? (
                        <View className="mb-4">
                            <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Weight (kg)</Text>
                            <View className="flex-row items-center bg-gray-50 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] h-12 rounded-xl px-4">
                                <TextInput
                                    className="flex-1 text-gray-900 dark:text-white text-lg font-bold p-0"
                                    value={editWeight}
                                    onChangeText={setEditWeight}
                                    keyboardType="decimal-pad"
                                    selectionColor="#00C4A7"
                                />
                                <Text className="text-gray-400 dark:text-brand-muted ml-2">kg</Text>
                            </View>
                        </View>
                    ) : (
                        <View className="mb-4">
                            <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Quantity</Text>
                            <View className="flex-row items-center gap-2">
                                <TouchableOpacity
                                    className="border border-gray-300 dark:border-[#30363D] w-12 h-12 rounded-xl items-center justify-center"
                                    onPress={() => setEditCount(prev => Math.max(1, parseInt(prev || '1') - 1).toString())}
                                >
                                    <Feather name="minus" size={20} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                </TouchableOpacity>
                                <View className="flex-1 bg-gray-50 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] h-12 rounded-xl px-4 justify-center">
                                    <TextInput
                                        className="text-gray-900 dark:text-white text-center text-lg font-bold p-0"
                                        value={editCount}
                                        onChangeText={setEditCount}
                                        keyboardType="numeric"
                                        selectionColor="#00C4A7"
                                    />
                                </View>
                                <TouchableOpacity
                                    className="border border-gray-300 dark:border-[#30363D] w-12 h-12 rounded-xl items-center justify-center"
                                    onPress={() => setEditCount(prev => (parseInt(prev || '1') + 1).toString())}
                                >
                                    <Feather name="plus" size={20} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View className="mb-6">
                        <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium mb-2">Expiry Date</Text>
                        <TouchableOpacity
                            onPress={() => setIsEditDatePickerVisible(true)}
                            className="flex-row items-center justify-between bg-gray-50 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl px-4 h-12"
                        >
                            <Text className={`text-base ${editExpiryDate ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-brand-muted'}`}>
                                {editExpiryDate || 'No date set'}
                            </Text>
                            <Feather name="calendar" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                        </TouchableOpacity>
                    </View>

                    <DatePickerModal
                        visible={isEditDatePickerVisible}
                        onClose={() => setIsEditDatePickerVisible(false)}
                        onSelectDate={setEditExpiryDate}
                        currentDate={editExpiryDate || undefined}
                    />

                    <View className="flex-row gap-3">
                        <TouchableOpacity onPress={onCancel} className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-[#30363D] items-center">
                            <Text className="text-gray-700 dark:text-gray-300 font-bold">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onSave} className="flex-[2] py-3.5 rounded-xl bg-brand-teal items-center">
                            <Text className="text-white font-bold">Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
