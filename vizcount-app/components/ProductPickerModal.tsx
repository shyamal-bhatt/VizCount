import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

export interface Product {
    pid: number;
    name: string;
}

interface ProductPickerModalProps {
    visible: boolean;
    onClose: () => void;
    products: Product[];
    onSelect: (product: Product | 'All') => void;
    showAllOption?: boolean;
}

export function ProductPickerModal({
    visible,
    onClose,
    products,
    onSelect,
    showAllOption = false,
}: ProductPickerModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Group products by their first word (e.g., "Chk", "Beef", "Pork")
    const groupedProducts = useMemo(() => {
        const groups: Record<string, Product[]> = {};

        products.forEach(product => {
            const firstWord = product.name.split(' ')[0] || 'Other';
            if (!groups[firstWord]) {
                groups[firstWord] = [];
            }
            if (!groups[firstWord].find(p => p.pid === product.pid)) {
                groups[firstWord].push(product);
            }
        });

        // Ensure each group is sorted by name
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.name.localeCompare(b.name));
        });

        return groups;
    }, [products]);

    // Format section headers
    const sectionNames = Object.keys(groupedProducts).sort();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            transparent={Platform.OS !== 'ios'}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-brand-light dark:bg-brand-dark rounded-t-3xl mt-20 flex-1 overflow-hidden h-[80%]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-brand-card bg-brand-light dark:bg-brand-dark">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">Select Product</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-brand-card items-center justify-center"
                        >
                            <Feather name="x" size={20} color={isDark ? '#E1E3E6' : '#4B5563'} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1 px-4 py-2">
                        {products.length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <Feather name="package" size={48} color={isDark ? '#30363D' : '#D1D5DB'} className="mb-4" />
                                <Text className="text-gray-500 dark:text-brand-muted text-lg text-center font-medium">
                                    No products scanned yet.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {showAllOption && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            onSelect('All');
                                            onClose();
                                        }}
                                        className="py-4 border-b border-gray-100 dark:border-brand-card flex-row items-center justify-between"
                                    >
                                        <Text className="text-gray-900 dark:text-white text-lg font-medium">All Products</Text>
                                        <Feather name="chevron-right" size={20} color={isDark ? '#8B949E' : '#9CA3AF'} />
                                    </TouchableOpacity>
                                )}

                                {sectionNames.map(section => (
                                    <View key={section} className="mt-4 mb-2">
                                        <Text className="text-brand-teal font-bold text-sm uppercase tracking-wider mb-2 ml-2">
                                            {section}
                                        </Text>
                                        <View className="bg-gray-50 dark:bg-[#1D2125] rounded-2xl overflow-hidden border border-gray-200 dark:border-brand-card">
                                            {groupedProducts[section].map((product, index) => (
                                                <TouchableOpacity
                                                    key={product.pid}
                                                    onPress={() => {
                                                        onSelect(product);
                                                        onClose();
                                                    }}
                                                    className={`py-4 px-4 flex-row items-center justify-between ${index < groupedProducts[section].length - 1
                                                            ? 'border-b border-gray-200 dark:border-brand-card'
                                                            : ''
                                                        }`}
                                                >
                                                    <View>
                                                        <Text className="text-gray-900 dark:text-white font-medium text-base">
                                                            {product.name}
                                                        </Text>
                                                        <Text className="text-gray-500 dark:text-brand-muted text-sm mt-0.5">
                                                            PID: {product.pid}
                                                        </Text>
                                                    </View>
                                                    <Feather name="plus-circle" size={20} color={isDark ? '#8B949E' : '#9CA3AF'} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                                <View className="h-10" />
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
