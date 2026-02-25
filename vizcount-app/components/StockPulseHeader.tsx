import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { ProductPickerModal } from './ProductPickerModal';
import { ProductDefinitionModal } from './ProductDefinitionModal';
import { useProductFilter } from '@/context/ProductFilterContext';

export function StockPulseHeader() {
    const insets = useSafeAreaInsets();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const { selectedProduct, setSelectedProduct, definedProducts } = useProductFilter();

    const [isProductModalVisible, setIsProductModalVisible] = useState(false);
    const [isDefModalVisible, setIsDefModalVisible] = useState(false);

    const displayLabel = selectedProduct === 'All'
        ? 'All'
        : selectedProduct?.name ?? 'All';

    return (
        <View
            className="bg-white dark:bg-brand-dark px-4 pb-3 border-b border-gray-200 dark:border-[#21262d] flex-row items-center justify-between"
            style={{ paddingTop: Math.max(insets.top, 16) }}
        >
            {/* Left side: Logo & Title */}
            <View className="flex-row items-center">
                <Pressable onPress={toggleColorScheme} className="bg-brand-teal w-10 h-10 rounded-xl items-center justify-center mr-3 shadow-sm">
                    <MaterialCommunityIcons name="cube-outline" size={24} color={isDark ? "#0D0F11" : "#FFFFFF"} />
                </Pressable>
                <View>
                    <Text className="text-gray-900 dark:text-white text-lg font-bold">VizCount</Text>
                    <Text className="text-gray-500 dark:text-brand-muted text-xs">Inventory Counter</Text>
                </View>
            </View>

            {/* Right side: Actions */}
            <View className="flex-row items-center space-x-3 gap-3">
                {/* Product Definition Button */}
                <TouchableOpacity
                    onPress={() => setIsDefModalVisible(true)}
                    className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] items-center justify-center"
                >
                    <Feather name="tag" size={18} color={isDark ? "#E1E3E6" : "#4B5563"} />
                </TouchableOpacity>

                <ProductDefinitionModal
                    visible={isDefModalVisible}
                    onClose={() => setIsDefModalVisible(false)}
                />

                {/* Product Filter Dropdown — uses defined_products via context */}
                <TouchableOpacity
                    onPress={() => setIsProductModalVisible(true)}
                    className="flex-row items-center bg-gray-100 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-lg px-3 py-2"
                >
                    <Text className="text-gray-800 dark:text-gray-300 text-sm font-medium mr-2">
                        {definedProducts.length === 0 ? '---' : displayLabel}
                    </Text>
                    <Feather name="chevron-down" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                </TouchableOpacity>

                <ProductPickerModal
                    visible={isProductModalVisible}
                    onClose={() => setIsProductModalVisible(false)}
                    products={definedProducts}
                    onSelect={(p) => setSelectedProduct(p === 'All' ? 'All' : p)}
                    showAllOption={true}
                />

                {/* Dashboard Button */}
                <TouchableOpacity className="flex-row items-center bg-transparent border border-gray-200 dark:border-[#30363D] rounded-lg px-3 py-2">
                    <Feather name="external-link" size={14} color={isDark ? "#E1E3E6" : "#4B5563"} style={{ marginRight: 6 }} />
                    <Text className="text-gray-800 dark:text-white text-sm font-medium">Dashboard</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
