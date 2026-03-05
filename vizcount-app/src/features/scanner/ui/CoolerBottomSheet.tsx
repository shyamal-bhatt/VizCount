import React, { useRef, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from 'nativewind';
import { ScannedItem } from '@/db/models/ScannedItem';

interface CoolerBottomSheetProps {
    scannedItems: ScannedItem[];
    onDelete: (id: string) => Promise<void>;
    onEditCount: (id: string, newCount: number) => Promise<void>;
}

export function CoolerBottomSheet({ scannedItems, onDelete, onEditCount }: CoolerBottomSheetProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['12%', '45%'], []);

    const [editingItem, setEditingItem] = useState<ScannedItem | null>(null);
    const [editCount, setEditCount] = useState('');

    return (
        <>
            <BottomSheet
                style={{ zIndex: 50, elevation: 50 }}
                ref={bottomSheetRef}
                snapPoints={snapPoints}
                backgroundStyle={{
                    backgroundColor: isDark ? '#0D0F11' : '#F9FAFB',
                    borderTopWidth: 1,
                    borderColor: isDark ? '#1D2125' : '#E5E7EB',
                }}
                handleIndicatorStyle={{ backgroundColor: isDark ? '#8B949E' : '#D1D5DB' }}
            >
                <BottomSheetView style={{ flex: 1 }}>
                    <View className="flex-row items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-brand-card">
                        <View className="flex-row items-center">
                            <Text className="text-gray-900 dark:text-white font-bold text-base mr-2">Cooler Scans</Text>
                            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: scannedItems.length > 0 ? 'rgba(0,196,167,0.15)' : (isDark ? '#1D2125' : '#E5E7EB') }}>
                                <Text style={{ color: scannedItems.length > 0 ? '#00C4A7' : (isDark ? '#8B949E' : '#6B7280'), fontSize: 12, fontWeight: '700' }}>
                                    {scannedItems.length}
                                </Text>
                            </View>
                        </View>
                        <Text className="text-gray-500 dark:text-brand-muted text-sm">Dairy dept.</Text>
                    </View>

                    {scannedItems.length === 0 ? (
                        <View className="py-12 items-center justify-center">
                            <FontAwesome name="cube" size={32} color={isDark ? "#8B949E" : "#9CA3AF"} style={{ opacity: 0.5, marginBottom: 12 }} />
                            <Text className="text-gray-600 dark:text-brand-muted text-base mb-1">No items scanned yet</Text>
                            <Text className="text-gray-400 dark:text-brand-muted opacity-50 text-sm">Start the camera and scan products</Text>
                        </View>
                    ) : (
                        <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
                            {scannedItems.map((item) => (
                                <View
                                    key={item.id}
                                    className="bg-white dark:bg-brand-card rounded-xl mb-3 p-4"
                                    style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}
                                >
                                    <View className="flex-row items-start justify-between mb-1">
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text className="text-gray-900 dark:text-white font-bold text-sm" numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text className="text-gray-500 dark:text-brand-muted text-xs mt-0.5">
                                                PID: {item.pid} · SN: {item.sn}
                                            </Text>
                                        </View>
                                        <View style={{ backgroundColor: 'rgba(0,196,167,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                            <Text style={{ color: '#00C4A7', fontSize: 12, fontWeight: '700' }}>{item.count ?? '—'} pcs</Text>
                                        </View>
                                    </View>

                                    <View className="flex-row items-center mt-1 mb-3">
                                        {item.netKg != null && (
                                            <View className="flex-row items-center mr-4">
                                                <FontAwesome name="balance-scale" size={10} color={isDark ? '#8B949E' : '#6B7280'} />
                                                <Text className="text-gray-500 dark:text-brand-muted text-xs ml-1">{item.netKg} kg</Text>
                                            </View>
                                        )}
                                        {item.bestBeforeDate != null && (
                                            <View className="flex-row items-center">
                                                <FontAwesome name="calendar" size={10} color={isDark ? '#8B949E' : '#6B7280'} />
                                                <Text className="text-gray-500 dark:text-brand-muted text-xs ml-1">
                                                    BB: {new Date(item.bestBeforeDate).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    <View className="flex-row" style={{ gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingItem(item);
                                                setEditCount(String(item.count ?? ''));
                                            }}
                                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(14,165,233,0.1)', paddingVertical: 8, borderRadius: 10 }}
                                        >
                                            <FontAwesome name="edit" size={12} color="#0EA5E9" />
                                            <Text style={{ color: '#0EA5E9', fontSize: 12, fontWeight: '600', marginLeft: 5 }}>Edit</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() =>
                                                Alert.alert(
                                                    'Delete Record',
                                                    `Remove ${item.name} (SN: ${item.sn}) from Cooler Scans?`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
                                                    ]
                                                )
                                            }
                                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 8, borderRadius: 10 }}
                                        >
                                            <FontAwesome name="trash" size={12} color="#EF4444" />
                                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600', marginLeft: 5 }}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </BottomSheetScrollView>
                    )}
                </BottomSheetView>
            </BottomSheet>

            <Modal
                visible={editingItem !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setEditingItem(null)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                    <View style={{ backgroundColor: isDark ? '#0D0F11' : '#FFFFFF', borderRadius: 20, width: '100%', padding: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, elevation: 30 }}>
                        <Text style={{ color: isDark ? '#FFFFFF' : '#111827', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>Edit Record</Text>
                        {editingItem && (
                            <Text style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 13, marginBottom: 20 }}>
                                {editingItem.name} · SN: {editingItem.sn}
                            </Text>
                        )}

                        <Text style={{ color: isDark ? '#8B949E' : '#374151', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Count (pieces)</Text>
                        <TextInput
                            value={editCount}
                            onChangeText={setEditCount}
                            keyboardType="numeric"
                            placeholder="Enter count"
                            placeholderTextColor={isDark ? '#8B949E' : '#9CA3AF'}
                            style={{ backgroundColor: isDark ? '#1D2125' : '#F3F4F6', color: isDark ? '#FFFFFF' : '#111827', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 24 }}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setEditingItem(null)}
                                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#1D2125' : '#E5E7EB', paddingVertical: 14, borderRadius: 12 }}
                            >
                                <Text style={{ color: isDark ? '#8B949E' : '#374151', fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={async () => {
                                    if (!editingItem) return;
                                    const newCount = parseInt(editCount, 10);
                                    if (isNaN(newCount) || newCount < 0) {
                                        Alert.alert('Invalid Input', 'Please enter a valid positive number.');
                                        return;
                                    }
                                    await onEditCount(editingItem.id, newCount);
                                    setEditingItem(null);
                                }}
                                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00C4A7', paddingVertical: 14, borderRadius: 12 }}
                            >
                                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}
