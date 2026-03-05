import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DiffCardProps {
    coolerCount: number;
    filteredScansLength: number;
    floorCount: number;
    filteredEntriesLength: number;
    totalCount: number;
}

export function DiffCard({ coolerCount, filteredScansLength, floorCount, filteredEntriesLength, totalCount }: DiffCardProps) {
    return (
        <View className="p-4 flex-row space-x-3 gap-3">
            {/* Cooler Card */}
            <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl p-4 flex-1">
                <View className="flex-row items-center mb-3">
                    <MaterialCommunityIcons name="snowflake" size={16} color="#00C4A7" />
                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium ml-2">Cooler</Text>
                </View>
                <Text className="text-gray-900 dark:text-white text-3xl font-bold">{coolerCount}</Text>
                <Text className="text-gray-400 dark:text-[#8B949E] text-xs mt-1">{filteredScansLength} scans</Text>
            </View>

            {/* Floor Card */}
            <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl p-4 flex-1">
                <View className="flex-row items-center mb-3">
                    <MaterialCommunityIcons name="storefront-outline" size={16} color="#00C4A7" />
                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium ml-2">Floor</Text>
                </View>
                <Text className="text-gray-900 dark:text-white text-3xl font-bold">{floorCount}</Text>
                <Text className="text-gray-400 dark:text-[#8B949E] text-xs mt-1">{filteredEntriesLength} entries</Text>
            </View>

            {/* Total Card */}
            <View className="bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl p-4 flex-1">
                <View className="flex-row items-center mb-3">
                    <MaterialCommunityIcons name="sigma" size={16} color="#8B949E" />
                    <Text className="text-gray-500 dark:text-brand-muted text-sm font-medium ml-2">Total</Text>
                </View>
                <Text className="text-gray-900 dark:text-white text-3xl font-bold">{totalCount}</Text>
                <Text className="text-gray-400 dark:text-[#8B949E] text-xs mt-1">cooler + floor</Text>
            </View>
        </View>
    );
}
