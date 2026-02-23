import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, Pressable } from 'react-native';
import { MaterialCommunityIcons, Feather, FontAwesome } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { ProductPickerModal, Product } from './ProductPickerModal';
import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';

export function StockPulseHeader() {
    const insets = useSafeAreaInsets();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Header Product Picker State
    const [isProductModalVisible, setIsProductModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | 'All'>('All');
    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);

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
            console.error("Failed to load products for header:", error);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchProducts();
    }, []);

    // Also listen to database changes on scanned_items to auto-update the list
    useEffect(() => {
        const subscription = database.collections.get('scanned_items').changes.subscribe(() => {
            fetchProducts();
        });

        return () => subscription.unsubscribe();
    }, []);

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
                {/* Department Selector */}
                <TouchableOpacity
                    onPress={() => setIsProductModalVisible(true)}
                    className="flex-row items-center bg-gray-100 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-lg px-3 py-2"
                >
                    <Text className="text-gray-800 dark:text-gray-300 text-sm font-medium mr-2">
                        {availableProducts.length === 0
                            ? '---'
                            : selectedProduct === 'All'
                                ? 'All'
                                : selectedProduct?.name || 'All'}
                    </Text>
                    <Feather name="chevron-down" size={16} color={isDark ? "#8B949E" : "#6B7280"} />
                </TouchableOpacity>

                <ProductPickerModal
                    visible={isProductModalVisible}
                    onClose={() => setIsProductModalVisible(false)}
                    products={availableProducts}
                    onSelect={setSelectedProduct}
                    showAllOption={true}
                />

                {/* Dashboard Button */}
                <TouchableOpacity className="flex-row items-center bg-transparent border border-gray-200 dark:border-[#30363D] rounded-lg px-3 py-2">
                    <Feather name="external-link" size={14} color={isDark ? "#E1E3E6" : "#4B5563"} className="mr-2" style={{ marginRight: 6 }} />
                    <Text className="text-gray-800 dark:text-white text-sm font-medium">Dashboard</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
