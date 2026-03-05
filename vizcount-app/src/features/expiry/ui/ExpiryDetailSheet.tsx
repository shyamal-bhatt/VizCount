import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { ExpiryItem } from '../useExpiryDB';

// --- Types ---

interface ExpiryDetailSheetProps {
    item: ExpiryItem | null;
    onClose: () => void;
}

// --- Helpers ---

function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function getUrgencyConfig(days: number): { label: string; color: string; bg: string; darkBg: string; icon: string } {
    if (days < 0) return { label: 'Expired', color: '#FF3B30', bg: '#FFEEEE', darkBg: '#3D0D0A', icon: 'alert-circle' };
    if (days === 0) return { label: 'Expires Today', color: '#FF8C42', bg: '#FFF3E8', darkBg: '#3D2006', icon: 'clock-alert' };
    if (days <= 3) return { label: `In ${days} day${days > 1 ? 's' : ''}`, color: '#FFBF00', bg: '#FFF8E0', darkBg: '#3D2C00', icon: 'clock-outline' };
    if (days <= 7) return { label: `In ${days} days`, color: '#57BB5F', bg: '#EAF7C0', darkBg: '#243A1C', icon: 'calendar-check-outline' };
    return { label: `In ${days} days`, color: '#0EA5E9', bg: '#EFF9FF', darkBg: '#063052', icon: 'calendar-blank-outline' };
}

// --- Component ---

export function ExpiryDetailSheet({ item, onClose }: ExpiryDetailSheetProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    if (!item) return null;

    const urgency = getUrgencyConfig(item.daysUntilExpiry);

    return (
        <Modal
            visible={!!item}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            {/* Overlay */}
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                onPress={onClose}
            >
                {/* Sheet */}
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: isDark ? '#16191C' : '#FFFFFF',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        paddingBottom: Math.max(insets.bottom, 24),
                        paddingTop: 16,
                        paddingHorizontal: 24,
                        borderTopWidth: 1,
                        borderTopColor: isDark ? '#21262d' : '#E5E7EB',
                    }}
                >
                    {/* Drag handle */}
                    <View
                        style={{
                            width: 40,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: isDark ? '#30363D' : '#D1D5DB',
                            alignSelf: 'center',
                            marginBottom: 20,
                        }}
                    />

                    {/* Urgency banner */}
                    <View
                        style={{
                            backgroundColor: isDark ? urgency.darkBg : urgency.bg,
                            borderColor: `${urgency.color}40`,
                            borderWidth: 1,
                            borderRadius: 16,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 20,
                            gap: 12,
                        }}
                    >
                        <MaterialCommunityIcons name={urgency.icon as any} size={32} color={urgency.color} />
                        <View>
                            <Text style={{ color: urgency.color, fontWeight: '800', fontSize: 20 }}>
                                {urgency.label}
                            </Text>
                            <Text style={{ color: urgency.color, opacity: 0.7, fontSize: 13 }}>
                                {item.daysUntilExpiry < 0
                                    ? `${Math.abs(item.daysUntilExpiry)} days past expiry`
                                    : `${item.daysUntilExpiry} days remaining`}
                            </Text>
                        </View>
                    </View>

                    {/* Product info */}
                    <Text
                        style={{ color: isDark ? '#E1E3E6' : '#111827', fontWeight: '700', fontSize: 18 }}
                        numberOfLines={2}
                    >
                        {item.name}
                    </Text>
                    <Text
                        style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 13, marginTop: 2 }}
                    >
                        PID {item.pid}
                    </Text>

                    {/* Details row */}
                    <View
                        style={{
                            flexDirection: 'row',
                            marginTop: 20,
                            gap: 12,
                        }}
                    >
                        {/* Source */}
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: isDark ? '#1D2125' : '#F3F4F6',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isDark ? '#30363D' : '#E5E7EB',
                                padding: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 22, marginBottom: 4 }}>
                                {item.source === 'cooler' ? '❄️' : '🏪'}
                            </Text>
                            <Text
                                style={{
                                    color: item.source === 'cooler' ? '#60A5FA' : '#34D399',
                                    fontWeight: '700',
                                    fontSize: 12,
                                }}
                            >
                                {item.source === 'cooler' ? 'Cooler' : 'Sales Floor'}
                            </Text>
                            <Text style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 10, marginTop: 2 }}>
                                Source
                            </Text>
                        </View>

                        {/* Expiry date */}
                        <View
                            style={{
                                flex: 2,
                                backgroundColor: isDark ? '#1D2125' : '#F3F4F6',
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: isDark ? '#30363D' : '#E5E7EB',
                                padding: 14,
                                alignItems: 'center',
                            }}
                        >
                            <Feather name="calendar" size={20} color={urgency.color} style={{ marginBottom: 4 }} />
                            <Text
                                style={{ color: isDark ? '#E1E3E6' : '#111827', fontWeight: '700', fontSize: 12, textAlign: 'center' }}
                            >
                                {formatDate(item.expiresAt)}
                            </Text>
                            <Text style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 10, marginTop: 2 }}>
                                Best Before
                            </Text>
                        </View>
                    </View>

                    {/* Close */}
                    <TouchableOpacity
                        onPress={onClose}
                        style={{
                            marginTop: 20,
                            backgroundColor: isDark ? '#1D2125' : '#F3F4F6',
                            borderRadius: 14,
                            padding: 14,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: isDark ? '#30363D' : '#E5E7EB',
                        }}
                    >
                        <Text style={{ color: isDark ? '#E1E3E6' : '#111827', fontWeight: '700', fontSize: 15 }}>
                            Close
                        </Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
