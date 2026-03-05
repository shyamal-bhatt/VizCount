import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { SalesFloor } from '@/db/models/SalesFloor';

interface FloorItemCardProps {
    item: SalesFloor;
    onEdit: (item: SalesFloor) => void;
    onDelete: (id: string) => void;
}

export function FloorItemCard({ item, onEdit, onDelete }: FloorItemCardProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className="bg-white dark:bg-[#1D2125] p-4 rounded-xl border border-gray-200 dark:border-[#30363D] flex-row items-center justify-between">
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
                    onPress={() => onEdit(item)}
                    className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full items-center justify-center"
                >
                    <Feather name="edit-2" size={16} color={isDark ? "#60A5FA" : "#3B82F6"} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onDelete(item.id)}
                    className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full items-center justify-center"
                >
                    <Feather name="trash-2" size={16} color="#F85149" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
