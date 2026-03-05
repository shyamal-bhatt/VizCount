import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, TextInput, KeyboardAvoidingView, Alert, PanResponder, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { database } from '@/db';
import { DefinedProduct } from '@/db/models/DefinedProduct';

const PRODUCT_TYPES = ['Maple Leaf Chicken', 'Organic Chicken', 'Halal', 'Beef', 'Pork', 'Seafood'];

interface ProductDefinitionModalProps {
    visible: boolean;
    onClose: () => void;
}

export function ProductDefinitionModal({ visible, onClose }: ProductDefinitionModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    // Swipe to close
    const translateY = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) translateY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 120) {
                    Animated.timing(translateY, { toValue: 800, duration: 250, useNativeDriver: true }).start(onClose);
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    // Form State
    const [name, setName] = useState('');
    const [pid, setPid] = useState('');
    const [pack, setPack] = useState('');
    const [selectedType, setSelectedType] = useState(PRODUCT_TYPES[0]);
    const [editingProduct, setEditingProduct] = useState<DefinedProduct | null>(null);

    // List State
    const [products, setProducts] = useState<DefinedProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchProducts = async () => {
        try {
            const collection = database.collections.get<DefinedProduct>('defined_products');
            const allProducts = await collection.query().fetch();
            // Sort by created_at descending (newest first)
            setProducts(allProducts.sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Failed to fetch defined products:", error);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchProducts();
            const subscription = database.collections.get('defined_products').changes.subscribe(() => {
                fetchProducts();
            });
            return () => subscription.unsubscribe();
        }
    }, [visible]);

    const handleSave = async () => {
        if (!name.trim() || !pid.trim() || !pack.trim()) {
            Alert.alert("Validation Error", "Please fill in all fields (Name, PID, Pack)");
            return;
        }

        const pidNum = parseInt(pid, 10);
        const packNum = parseInt(pack, 10);

        if (isNaN(pidNum) || isNaN(packNum)) {
            Alert.alert("Validation Error", "PID and Pack must be numbers");
            return;
        }

        try {
            await database.write(async () => {
                const collection = database.collections.get<DefinedProduct>('defined_products');
                if (editingProduct) {
                    await editingProduct.update(p => {
                        p.name = name;
                        p.pid = pidNum;
                        p.pack = packNum;
                        p.type = selectedType;
                    });
                } else {
                    await collection.create(p => {
                        p.name = name;
                        p.pid = pidNum;
                        p.pack = packNum;
                        p.type = selectedType;
                    });
                }
            });

            // Reset form
            setName('');
            setPid('');
            setPack('');
            setSelectedType(PRODUCT_TYPES[0]);
            setEditingProduct(null);
        } catch (error) {
            console.error("Failed to save defined product:", error);
            Alert.alert("Error", "Failed to save product.");
        }
    };

    const handleEdit = (product: DefinedProduct) => {
        setEditingProduct(product);
        setName(product.name);
        setPid(product.pid.toString());
        setPack(product.pack.toString());
        setSelectedType(product.type);
    };

    const handleDelete = async (product: DefinedProduct) => {
        Alert.alert(
            "Delete Product",
            `Are you sure you want to delete ${product.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await database.write(async () => {
                                await product.destroyPermanently();
                            });
                        } catch (error) {
                            console.error("Failed to delete product:", error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
            transparent={Platform.OS !== 'ios'}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1 bg-black/50 justify-end"
            >
                <Animated.View
                    style={{ transform: [{ translateY }], paddingTop: insets.top, minHeight: '90%', flex: 1 }}
                    className="bg-brand-light dark:bg-brand-dark rounded-t-3xl overflow-hidden"
                >
                    {/* Drag Handle */}
                    <View {...panResponder.panHandlers} className="items-center pt-3 pb-1">
                        <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#30363D]" />
                    </View>

                    {/* Header */}
                    <View {...panResponder.panHandlers} className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-brand-card bg-brand-light dark:bg-brand-dark">
                        <Text className="text-xl font-bold text-gray-900 dark:text-white">Define Product</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-brand-card items-center justify-center"
                        >
                            <Feather name="x" size={20} color={isDark ? '#E1E3E6' : '#4B5563'} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
                        {/* Form Section */}
                        <View className="bg-white dark:bg-[#1D2125] p-4 rounded-2xl border border-gray-200 dark:border-brand-card mb-6 shadow-sm">
                            <Text className="text-sm font-bold text-gray-500 dark:text-brand-muted uppercase tracking-wider mb-4">
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </Text>

                            {/* Name */}
                            <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">Name</Text>
                            <TextInput
                                className="bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white"
                                placeholder="e.g. Chicken Breast"
                                placeholderTextColor={isDark ? "#8B949E" : "#9CA3AF"}
                                value={name}
                                onChangeText={setName}
                            />

                            <View className="flex-row space-x-3 gap-3 mb-3">
                                {/* PID */}
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">PID Number</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                                        placeholder="PID"
                                        placeholderTextColor={isDark ? "#8B949E" : "#9CA3AF"}
                                        keyboardType="numeric"
                                        value={pid}
                                        onChangeText={setPid}
                                    />
                                </View>
                                {/* Pack */}
                                <View className="flex-1">
                                    <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1">Pack Size</Text>
                                    <TextInput
                                        className="bg-gray-50 dark:bg-brand-dark border border-gray-200 dark:border-[#30363D] rounded-xl px-4 py-3 text-gray-900 dark:text-white"
                                        placeholder="Pack"
                                        placeholderTextColor={isDark ? "#8B949E" : "#9CA3AF"}
                                        keyboardType="numeric"
                                        value={pack}
                                        onChangeText={setPack}
                                    />
                                </View>
                            </View>

                            {/* Type Selection */}
                            <Text className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 ml-1 mt-2">Product Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1 px-1">
                                {PRODUCT_TYPES.map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setSelectedType(type)}
                                        className={`mr-2 px-4 py-2 rounded-full border ${selectedType === type
                                            ? 'bg-brand-teal border-brand-teal'
                                            : 'bg-transparent border-gray-200 dark:border-[#30363D]'
                                            }`}
                                    >
                                        <Text
                                            className={`text-sm font-medium ${selectedType === type
                                                ? 'text-white'
                                                : 'text-gray-600 dark:text-gray-400'
                                                }`}
                                        >
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Action Buttons */}
                            <View className="flex-row items-center mt-2 gap-2">
                                {editingProduct && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            setEditingProduct(null);
                                            setName('');
                                            setPid('');
                                            setPack('');
                                            setSelectedType(PRODUCT_TYPES[0]);
                                        }}
                                        className="flex-1 flex-row items-center justify-center bg-gray-100 dark:bg-[#30363D] py-3.5 rounded-xl"
                                    >
                                        <Text className="text-gray-700 dark:text-gray-200 font-bold text-center">Cancel Edit</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={handleSave}
                                    className={`flex-[2] flex-row items-center justify-center bg-brand-teal py-3.5 rounded-xl shadow-sm`}
                                >
                                    <Feather name={editingProduct ? "save" : "plus"} size={18} color="white" className="mr-2" style={{ marginRight: 6 }} />
                                    <Text className="text-white font-bold text-center">
                                        {editingProduct ? 'Update Product' : 'Add Product'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* List Section */}
                        <View className="flex-row items-center justify-between mb-3 ml-1">
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">
                                Defined Products
                            </Text>
                            <Text className="text-xs text-gray-400 dark:text-brand-muted">
                                {products.length} total
                            </Text>
                        </View>

                        {/* Search Bar */}
                        <View className="flex-row items-center bg-white dark:bg-[#1D2125] border border-gray-200 dark:border-[#30363D] rounded-xl px-3 mb-4">
                            <Feather name="search" size={16} color={isDark ? '#8B949E' : '#9CA3AF'} style={{ marginRight: 8 }} />
                            <TextInput
                                className="flex-1 py-3 text-gray-900 dark:text-white text-sm"
                                placeholder="Search by name or PID..."
                                placeholderTextColor={isDark ? '#8B949E' : '#9CA3AF'}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Feather name="x-circle" size={16} color={isDark ? '#8B949E' : '#9CA3AF'} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {(() => {
                            const filtered = products.filter(p =>
                                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.pid.toString().includes(searchQuery)
                            );
                            return filtered.length === 0 ? (
                                <View className="bg-white dark:bg-[#1D2125] py-10 rounded-2xl border border-gray-200 dark:border-brand-card items-center justify-center mb-10">
                                    <Feather name="box" size={40} color={isDark ? '#30363D' : '#D1D5DB'} className="mb-3" />
                                    <Text className="text-gray-500 dark:text-brand-muted text-base font-medium">
                                        {searchQuery ? 'No matching products.' : 'No products defined yet.'}
                                    </Text>
                                </View>
                            ) : (
                                <View className="bg-white dark:bg-[#1D2125] rounded-2xl overflow-hidden border border-gray-200 dark:border-brand-card mb-10">
                                    {filtered.map((product, index) => (
                                        <View
                                            key={product.id}
                                            className={`p-4 flex-row items-center justify-between ${index < products.length - 1 ? 'border-b border-gray-100 dark:border-[#30363D]' : ''
                                                }`}
                                        >
                                            <View className="flex-1 pr-4">
                                                <Text className="text-gray-900 dark:text-white font-bold text-base mb-0.5">
                                                    {product.name}
                                                </Text>
                                                <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1">
                                                    <Text className="text-gray-500 dark:text-brand-muted text-xs">
                                                        PID: {product.pid}
                                                    </Text>
                                                    <Text className="text-gray-500 dark:text-brand-muted text-xs">
                                                        Pack: {product.pack}
                                                    </Text>
                                                    <View className="bg-brand-light dark:bg-brand-dark px-2 py-0.5 rounded border border-gray-200 dark:border-[#30363D]">
                                                        <Text className="text-xs text-brand-teal font-medium">
                                                            {product.type}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View className="flex-row items-center space-x-2 gap-2">
                                                <TouchableOpacity
                                                    onPress={() => handleEdit(product)}
                                                    className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center"
                                                >
                                                    <Feather name="edit-2" size={16} color={isDark ? '#60A5FA' : '#3B82F6'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleDelete(product)}
                                                    className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center"
                                                >
                                                    <Feather name="trash-2" size={16} color={isDark ? '#F87171' : '#EF4444'} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            );
                        })()}
                        <View className="h-10" />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}
