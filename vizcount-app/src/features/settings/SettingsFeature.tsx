import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, FlatList, ActivityIndicator, Platform, TextInput } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { database } from '@/db';
import { wipeAndGenerateDummyData } from '@/db/dummyData';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function SettingsFeature() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);

    const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);
    const [editingRecord, setEditingRecord] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<Record<string, string>>({});

    const HIDDEN_FIELDS = ['id', '_status', '_changed', 'created_at', 'updated_at'];

    const columns = tableData.length > 0
        ? Object.keys(tableData[0]._raw).filter(k => !HIDDEN_FIELDS.includes(k))
        : [];

    const TABLES = ['defined_products', 'scanned_items', 'sales_floor'];

    // --- Dev Tools ---
    const handleSeedData = async () => {
        setIsLoading(true);
        try {
            await wipeAndGenerateDummyData(200);
            Alert.alert("Success", "Mock data seeded successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to seed data.");
        } finally {
            setIsLoading(false);
        }
    };

    // Only these tables are wiped — defined_products is intentionally excluded
    const WIPE_TABLES = ['scanned_items', 'sales_floor'];

    const handleClearData = async () => {
        Alert.alert(
            "Wipe Scan Data",
            "This will permanently delete all scanned items and sales floor data.\n\n✅ Your defined product list will NOT be affected.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Wipe Data", style: "destructive", onPress: async () => {
                        setIsLoading(true);
                        try {
                            await database.write(async () => {
                                for (const table of WIPE_TABLES) {
                                    const collection = database.collections.get(table);
                                    const allItems = await collection.query().fetch();
                                    const deleteOps = allItems.map(i => i.prepareDestroyPermanently());
                                    await database.batch(...deleteOps);
                                }
                            });
                            Alert.alert("Success", "Scan data cleared. Your product catalog is intact.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to clear data.");
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // --- Table Viewer ---
    const loadTableData = async (tableName: string) => {
        setIsLoading(true);
        try {
            const collection = database.collections.get(tableName);
            const items = await collection.query().fetch();
            // Convert Model to raw JSON for display
            const rawItems = items.map(item => ({
                _raw: item._raw,
                modelId: item.id
            }));
            setTableData(rawItems);
            setSelectedTable(tableName);
        } catch (error) {
            Alert.alert("Error", `Could not load table ${tableName}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRecord = (tableName: string, modelId: string) => {
        Alert.alert("Delete Record", "Are you sure you want to delete this record?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        const collection = database.collections.get(tableName);
                        const record = await collection.find(modelId);
                        await database.write(async () => {
                            await record.destroyPermanently();
                        });
                        // Refresh data
                        loadTableData(tableName);
                    } catch (error) {
                        Alert.alert("Error", "Could not delete record.");
                    }
                }
            }
        ]);
    };

    const handleTruncateTable = (tableName: string) => {
        Alert.alert("Truncate Table", `Permanently delete all records in ${tableName}?`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Truncate", style: "destructive", onPress: async () => {
                    setIsLoading(true);
                    try {
                        const collection = database.collections.get(tableName);
                        const allItems = await collection.query().fetch();
                        await database.write(async () => {
                            const deleteOps = allItems.map(i => i.prepareDestroyPermanently());
                            await database.batch(...deleteOps);
                        });
                        loadTableData(tableName);
                    } catch (error) {
                        Alert.alert("Error", "Failed to truncate table.");
                    } finally {
                        setIsLoading(false);
                    }
                }
            }
        ]);
    };

    const handleEditPress = (item: any) => {
        const initialForm: Record<string, string> = {};
        Object.entries(item._raw).forEach(([k, v]) => {
            if (!HIDDEN_FIELDS.includes(k)) {
                initialForm[k] = v === null ? '' : String(v);
            }
        });
        setEditForm(initialForm);
        setEditingRecord(item);
    };

    const handleSaveEdit = async () => {
        if (!selectedTable || !editingRecord) return;
        setIsLoading(true);
        try {
            const collection = database.collections.get(selectedTable);
            const record = await collection.find(editingRecord.modelId);

            await database.write(async () => {
                await record.update((r: any) => {
                    Object.entries(editForm).forEach(([k, v]) => {
                        const originalValue = editingRecord._raw[k];
                        if (typeof originalValue === 'number' && v !== '') {
                            r[k] = Number(v);
                        } else if (originalValue === null && v === '') {
                            r[k] = null;
                        } else if (v === '') {
                            r[k] = null;
                        } else {
                            r[k] = v;
                        }
                    });
                });
            });
            setHighlightedRowId(editingRecord.modelId);
            setEditingRecord(null);
            loadTableData(selectedTable);

            setTimeout(() => {
                setHighlightedRowId(null);
            }, 3000);
        } catch (error) {
            Alert.alert("Error", "Could not save edits.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-brand-light dark:bg-brand-dark" style={{ paddingTop: insets.top }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#21262d]">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                        <Feather name="chevron-down" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
                    </TouchableOpacity>
                    <Text className="text-gray-900 dark:text-white text-xl font-bold">Settings & Admin</Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-4 py-4 space-y-6">

                {/* Dev Tools Section */}
                <View className="bg-white dark:bg-[#1D2125] p-5 rounded-2xl border border-gray-200 dark:border-[#30363D] mb-6">
                    <View className="flex-row items-center mb-4">
                        <MaterialCommunityIcons name="tools" size={20} color="#00C4A7" />
                        <Text className="text-gray-900 dark:text-white text-base font-bold ml-2">Developer Tools</Text>
                    </View>

                    <Text className="text-gray-500 dark:text-brand-muted text-sm mb-4">
                        Use these tools to rapidly seed test cases or completely wipe the local database.
                    </Text>

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            onPress={handleSeedData}
                            disabled={isLoading}
                            className={`bg-brand-teal/10 py-3 px-4 rounded-xl flex-1 items-center border border-brand-teal/20 ${isLoading ? 'opacity-50' : ''}`}
                        >
                            <Text className="text-brand-teal font-bold text-sm">Seed Dummy Data</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleClearData}
                            disabled={isLoading}
                            className={`bg-red-500/10 py-3 px-4 rounded-xl flex-1 items-center border border-red-500/20 ${isLoading ? 'opacity-50' : ''}`}
                        >
                            <Text className="text-red-500 font-bold text-sm">Wipe All Data</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Database Tables Viewer */}
                <View className="mb-10">
                    <Text className="text-gray-900 dark:text-white text-lg font-bold mb-3 px-1">Raw Database Explorer</Text>

                    {TABLES.map(tableName => (
                        <TouchableOpacity
                            key={tableName}
                            onPress={() => loadTableData(tableName)}
                            className="bg-white dark:bg-[#1D2125] flex-row items-center justify-between p-4 mb-3 rounded-xl border border-gray-200 dark:border-[#30363D]"
                        >
                            <View className="flex-row items-center">
                                <View className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#30363D] items-center justify-center mr-3">
                                    <MaterialCommunityIcons name="database" size={16} color={isDark ? "#E1E3E6" : "#4B5563"} />
                                </View>
                                <Text className="text-gray-900 dark:text-white font-semibold">{tableName}</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={isDark ? "#8B949E" : "#6B7280"} />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Loading Overlay */}
            {isLoading && (
                <View className="absolute z-50 top-0 bottom-0 left-0 right-0 justify-center items-center bg-black/50" style={{ elevation: 10 }}>
                    <ActivityIndicator size="large" color="#00C4A7" />
                </View>
            )}

            {/* Table Viewer Modal */}
            <Modal
                visible={!!selectedTable}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedTable(null)}
            >
                <View className="flex-1 bg-brand-light dark:bg-brand-dark" style={{ paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
                    {/* Modal Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-[#21262d] bg-white dark:bg-[#1D2125]">
                        <View className="flex-row items-center">
                            <TouchableOpacity onPress={() => setSelectedTable(null)} className="mr-3">
                                <Feather name="x" size={24} color={isDark ? "#FFFFFF" : "#111827"} />
                            </TouchableOpacity>
                            <Text className="text-gray-900 dark:text-white text-lg font-bold">{selectedTable}</Text>
                            <View className="ml-3 bg-gray-100 dark:bg-[#30363D] px-2 py-0.5 rounded pl-2">
                                <Text className="text-gray-600 dark:text-gray-300 text-xs font-bold">{tableData.length} rows</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => selectedTable && handleTruncateTable(selectedTable)} className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                            <Text className="text-red-500 text-xs font-bold">Truncate</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Modal Data List As Table */}
                    {tableData.length === 0 ? (
                        <View className="items-center justify-center py-20 px-4">
                            <MaterialCommunityIcons name="database-off" size={48} color={isDark ? "#30363D" : "#E5E7EB"} />
                            <Text className="text-gray-500 dark:text-brand-muted text-base font-medium mt-4">Table is empty.</Text>
                        </View>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} className="flex-1">
                            <View className="flex-1 px-4">
                                {/* Table Header */}
                                <View className="flex-row border-b-2 border-gray-300 dark:border-[#30363D] pb-3 mb-2 min-w-full">
                                    <View className="w-24">
                                        <Text className="font-bold text-gray-500 dark:text-brand-muted uppercase text-xs">Model ID</Text>
                                    </View>
                                    {columns.map(col => (
                                        <View key={col} className="w-32 mx-2">
                                            <Text className="font-bold text-gray-500 dark:text-brand-muted uppercase text-xs">{col}</Text>
                                        </View>
                                    ))}
                                    <View className="w-20 pl-2">
                                        <Text className="font-bold text-gray-500 dark:text-brand-muted uppercase text-xs text-center">Actions</Text>
                                    </View>
                                </View>

                                {/* Table Body */}
                                <FlatList
                                    data={tableData}
                                    keyExtractor={(item, index) => item.modelId || index.toString()}
                                    showsVerticalScrollIndicator={true}
                                    renderItem={({ item }) => {
                                        const isHighlighted = item.modelId === highlightedRowId;
                                        return (
                                            <View className={`flex-row border-b border-gray-100 dark:border-[#21262d] py-3 items-center min-w-full ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30 -mx-4 px-4 relative' : ''}`}>
                                                {isHighlighted && <View className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-400" />}

                                                <View className="w-24">
                                                    <Text className="text-gray-400 dark:text-gray-500 text-xs font-mono" numberOfLines={1}>{item.modelId.substring(0, 8)}...</Text>
                                                </View>

                                                {columns.map(col => {
                                                    const value = item._raw[col];
                                                    const displayValue = value === null ? 'null' :
                                                        typeof value === 'object' ? JSON.stringify(value) :
                                                            String(value);

                                                    const typeColor = typeof value === 'number' ? 'text-blue-500' :
                                                        typeof value === 'string' ? 'text-green-500' :
                                                            value === null ? 'text-gray-400' : 'text-yellow-500';

                                                    return (
                                                        <View key={col} className="w-32 mx-2">
                                                            <Text className={`text-sm font-mono ${typeColor}`} numberOfLines={1}>{displayValue}</Text>
                                                        </View>
                                                    );
                                                })}

                                                <View className="w-20 pl-2 flex-row items-center justify-center space-x-4 gap-4">
                                                    <TouchableOpacity onPress={() => handleEditPress(item)}>
                                                        <Feather name="edit-2" size={16} color="#00C4A7" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => selectedTable && handleDeleteRecord(selectedTable, item.modelId)}>
                                                        <Feather name="trash-2" size={16} color="#F85149" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        </ScrollView>
                    )}
                </View>
            </Modal>

            {/* Edit Row Modal */}
            <Modal
                visible={!!editingRecord}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setEditingRecord(null)}
            >
                <View className="flex-1 bg-black/50 justify-center px-4" style={{ paddingTop: insets.top }}>
                    <View className="bg-white dark:bg-[#1D2125] rounded-2xl p-6 border border-gray-200 dark:border-[#30363D] shadow-xl max-h-[80%]">
                        <View className="flex-row justify-between items-center border-b border-gray-200 dark:border-[#30363D] pb-4 mb-4">
                            <Text className="text-lg font-bold text-gray-900 dark:text-white">Edit Record</Text>
                            <TouchableOpacity onPress={() => setEditingRecord(null)}>
                                <Feather name="x" size={24} color={isDark ? "#8B949E" : "#6B7280"} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} className="space-y-4">
                            {editingRecord && Object.keys(editForm).map(key => (
                                <View key={key} className="mb-4">
                                    <Text className="text-xs font-bold text-gray-500 dark:text-brand-muted uppercase mb-1">{key}</Text>
                                    <TextInput
                                        value={editForm[key]}
                                        onChangeText={(text) => setEditForm(prev => ({ ...prev, [key]: text }))}
                                        className="bg-gray-50 dark:bg-[#0D0F11] border border-gray-200 dark:border-[#30363D] rounded-lg px-4 py-3 text-gray-900 dark:text-white font-mono"
                                        placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                        placeholder="null"
                                    />
                                </View>
                            ))}
                        </ScrollView>

                        <View className="flex-row gap-3 pt-4 border-t border-gray-200 dark:border-[#30363D] mt-4">
                            <TouchableOpacity
                                onPress={() => setEditingRecord(null)}
                                className="flex-1 py-3 items-center rounded-xl bg-gray-100 dark:bg-[#30363D]"
                            >
                                <Text className="font-bold text-gray-700 dark:text-gray-300">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveEdit}
                                disabled={isLoading}
                                className={`flex-1 py-3 items-center rounded-xl bg-brand-teal ${isLoading ? 'opacity-50' : ''}`}
                            >
                                <Text className="font-bold text-white">Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
