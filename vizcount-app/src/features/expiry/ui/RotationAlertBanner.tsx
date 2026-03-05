import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { RotationAlert } from '../useExpiryDB';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Types ---
interface RotationAlertBannerProps {
    alerts: RotationAlert[];
}

// --- Helpers ---
function formatShortDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// --- Component ---
export function RotationAlertBanner({ alerts }: RotationAlertBannerProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [expanded, setExpanded] = useState(false);

    if (alerts.length === 0) return null;

    const AMBER = '#F59E0B';
    const AMBER_BG = isDark ? '#2D2100' : '#FFFBEB';
    const AMBER_BORDER = isDark ? '#92400E' : '#FDE68A';

    const handleToggle = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => !prev);
    };

    return (
        <View
            style={{
                marginHorizontal: 16,
                marginTop: 12,
                marginBottom: 4,
                backgroundColor: AMBER_BG,
                borderWidth: 1,
                borderColor: AMBER_BORDER,
                borderRadius: 16,
                overflow: 'hidden',
            }}
        >
            {/* Header — always visible, tap to expand */}
            <Pressable
                onPress={handleToggle}
                android_ripple={{ color: `${AMBER}30` }}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    gap: 8,
                }}
            >
                {/* Icon */}
                <View
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: `${AMBER}25`,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <MaterialCommunityIcons name="rotate-3d-variant" size={18} color={AMBER} />
                </View>

                {/* Text */}
                <View style={{ flex: 1 }}>
                    <Text style={{ color: AMBER, fontWeight: '700', fontSize: 13 }}>
                        Stock Rotation {alerts.length === 1 ? 'Issue' : 'Issues'} Detected
                    </Text>
                    <Text style={{ color: AMBER, opacity: 0.75, fontSize: 11, marginTop: 1 }}>
                        {alerts.length} product{alerts.length > 1 ? 's' : ''} — cooler has sooner expiry than floor
                    </Text>
                </View>

                {/* Count badge + chevron */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                        style={{
                            backgroundColor: `${AMBER}30`,
                            borderRadius: 99,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                        }}
                    >
                        <Text style={{ color: AMBER, fontWeight: '800', fontSize: 12 }}>
                            {alerts.length}
                        </Text>
                    </View>
                    <Feather
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={AMBER}
                    />
                </View>
            </Pressable>

            {/* Expanded alert cards */}
            {expanded && (
                <View
                    style={{
                        borderTopWidth: 1,
                        borderTopColor: AMBER_BORDER,
                        paddingHorizontal: 14,
                        paddingTop: 10,
                        paddingBottom: 12,
                        gap: 8,
                    }}
                >
                    {/* Explanation */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            gap: 6,
                            marginBottom: 4,
                        }}
                    >
                        <Feather name="info" size={12} color={AMBER} style={{ marginTop: 2 }} />
                        <Text style={{ color: AMBER, opacity: 0.8, fontSize: 11, flex: 1, lineHeight: 16 }}>
                            Move the sooner-expiring (❄️ cooler) item to the floor before the later one sells.
                        </Text>
                    </View>

                    {/* Per-product cards */}
                    {alerts.map((alert) => (
                        <View
                            key={`rotation-${alert.pid}`}
                            style={{
                                backgroundColor: isDark ? '#1A1400' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: AMBER_BORDER,
                                borderRadius: 12,
                                padding: 12,
                            }}
                        >
                            {/* Product name + PID */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text
                                    style={{ color: isDark ? '#E1E3E6' : '#111827', fontWeight: '700', fontSize: 14 }}
                                    numberOfLines={1}
                                >
                                    {alert.name}
                                </Text>
                                <View
                                    style={{
                                        backgroundColor: `${AMBER}20`,
                                        borderRadius: 6,
                                        paddingHorizontal: 7,
                                        paddingVertical: 2,
                                    }}
                                >
                                    <Text style={{ color: AMBER, fontSize: 10, fontWeight: '700' }}>
                                        PID {alert.pid}
                                    </Text>
                                </View>
                            </View>

                            {/* Timeline: cooler → floor */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                {/* Cooler date */}
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#60A5FA18',
                                        borderWidth: 1,
                                        borderColor: '#60A5FA40',
                                        borderRadius: 8,
                                        padding: 8,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 14, marginBottom: 2 }}>❄️</Text>
                                    <Text style={{ color: '#60A5FA', fontWeight: '700', fontSize: 12 }}>
                                        {formatShortDate(alert.coolerDate)}
                                    </Text>
                                    <Text style={{ color: '#60A5FA', opacity: 0.7, fontSize: 10 }}>Cooler</Text>
                                </View>

                                {/* Arrow + day diff */}
                                <View style={{ alignItems: 'center', gap: 2 }}>
                                    <Feather name="arrow-right" size={14} color={AMBER} />
                                    <Text style={{ color: AMBER, fontSize: 9, fontWeight: '700' }}>
                                        +{alert.daysDiff}d
                                    </Text>
                                </View>

                                {/* Floor date */}
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#34D39918',
                                        borderWidth: 1,
                                        borderColor: '#34D39940',
                                        borderRadius: 8,
                                        padding: 8,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 14, marginBottom: 2 }}>🏪</Text>
                                    <Text style={{ color: '#34D399', fontWeight: '700', fontSize: 12 }}>
                                        {formatShortDate(alert.floorDate)}
                                    </Text>
                                    <Text style={{ color: '#34D399', opacity: 0.7, fontSize: 10 }}>Floor</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}
