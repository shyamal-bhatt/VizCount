import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
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
    const [searchQuery, setSearchQuery] = useState('');

    const filteredProducts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return products;
        return products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.pid.toString().includes(q)
        );
    }, [products, searchQuery]);

    // Group products by their first word (e.g., "ML", "MINA", "PRIME")
    const groupedProducts = useMemo(() => {
        const groups: Record<string, Product[]> = {};

        filteredProducts.forEach(product => {
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
    }, [filteredProducts]);

    const sectionNames = Object.keys(groupedProducts).sort();

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            transparent={Platform.OS !== 'ios'}
            onRequestClose={() => {
                setSearchQuery('');
                onClose();
            }}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-brand-light dark:bg-brand-dark rounded-t-3xl mt-20 flex-1 overflow-hidden h-[80%]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-brand-card bg-brand-light dark:bg-brand-dark">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">Select Product</Text>
                        <TouchableOpacity
                            onPress={() => { setSearchQuery(''); onClose(); }}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-brand-card items-center justify-center"
                        >
                            <Feather name="x" size={20} color={isDark ? '#E1E3E6' : '#4B5563'} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className="px-4 pt-3 pb-1">
                        <View className="flex-row items-center bg-gray-100 dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl px-3">
                            <Feather name="search" size={16} color={isDark ? '#8B949E' : '#9CA3AF'} style={{ marginRight: 8 }} />
                            <TextInput
                                className="flex-1 py-3 text-gray-900 dark:text-white text-sm"
                                placeholder="Search by name or PID..."
                                placeholderTextColor={isDark ? '#8B949E' : '#9CA3AF'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                                autoCapitalize="none"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Feather name="x-circle" size={16} color={isDark ? '#8B949E' : '#9CA3AF'} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1 px-4 py-2">
                        {filteredProducts.length === 0 ? (
                            <View className="py-20 items-center justify-center">
                                <Feather name="package" size={48} color={isDark ? '#30363D' : '#D1D5DB'} style={{ marginBottom: 12 }} />
                                <Text className="text-gray-500 dark:text-brand-muted text-lg text-center font-medium">
                                    {searchQuery ? 'No matching products.' : 'No products defined yet.'}
                                </Text>
                            </View>
                        ) : (
                            <>
                                {showAllOption && !searchQuery && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            onSelect('All');
                                            setSearchQuery('');
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
                                                        setSearchQuery('');
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
