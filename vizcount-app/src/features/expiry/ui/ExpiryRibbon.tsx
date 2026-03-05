import React, { useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Dimensions,
    Platform,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { ExpiryItem } from '../useExpiryDB';

// --- Types ---

interface ExpiryRibbonProps {
    items: ExpiryItem[];
    onSelectItem: (item: ExpiryItem) => void;
}

// --- Constants ---

const WINDOW_DAYS = 15; // today + 14 more days
const COL_WIDTH = 80;
const CHIP_HEIGHT = 30;
const MAX_CHIPS_VISIBLE = 4;

// Colour gradient: red (day 0) → orange (day 3) → yellow (day 7) → green (day 14)
const DAY_COLORS: Record<number, string> = {
    0: '#FF3B30',
    1: '#FF6B35',
    2: '#FF8C42',
    3: '#FF9F1C',
    4: '#FFBF00',
    5: '#FFD60A',
    6: '#F0E726',
    7: '#C4E537',
    8: '#8BCF4C',
    9: '#57BB5F',
    10: '#34AB70',
    11: '#1A9E7A',
    12: '#0D9488',
    13: '#0891B2',
    14: '#0EA5E9',
};

const DARK_ZONE_BG: string[] = [
    '#3D0D0A', '#3D1A0D', '#3D2006', '#3D2C00',
    '#3D3400', '#3C3A00', '#36380A', '#2E3A12',
    '#243A1C', '#1A3A25', '#0F382E', '#083730',
    '#063532', '#063342', '#063052',
];

const LIGHT_ZONE_BG: string[] = [
    '#FFEEEE', '#FFF0EA', '#FFF3E8', '#FFF6E5',
    '#FFF8E0', '#FFFAD5', '#FDFBC0', '#F6FAB0',
    '#EAF7C0', '#DBF2CF', '#CAEDDe', '#B8E8D9',
    '#A8E5E0', '#9BDEED', '#8FD5F7',
];

// --- Helpers ---

function getDayLabel(dayOffset: number): string {
    if (dayOffset === 0) return 'Today';
    if (dayOffset === 1) return 'Tmrw';
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChipColor(day: number): string {
    const clampedDay = Math.max(0, Math.min(14, day));
    return DAY_COLORS[clampedDay] ?? '#0EA5E9';
}

// --- Component ---

export function ExpiryRibbon({ items, onSelectItem }: ExpiryRibbonProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Group items by day offset (0-14). Items past due go into day 0 column.
    const itemsByDay = React.useMemo(() => {
        const map: Record<number, ExpiryItem[]> = {};
        for (let i = 0; i < WINDOW_DAYS; i++) map[i] = [];

        items.forEach((item) => {
            const day = Math.max(0, Math.min(14, item.daysUntilExpiry));
            // Only include items that fall within our 14-day window or are expired (day 0)
            if (item.daysUntilExpiry <= 14) {
                map[day].push(item);
            }
        });

        return map;
    }, [items]);

    const totalItemsInWindow = React.useMemo(
        () => Object.values(itemsByDay).reduce((sum, arr) => sum + arr.length, 0),
        [itemsByDay]
    );

    // Max chips in any column (for dynamic height)
    const maxChips = React.useMemo(
        () => Math.max(1, ...Object.values(itemsByDay).map((a) => Math.min(a.length, MAX_CHIPS_VISIBLE))),
        [itemsByDay]
    );
    const ribbonContentHeight = maxChips * (CHIP_HEIGHT + 6) + 8;

    return (
        <View className="mx-4 mt-4 mb-2">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
                <Text className="text-gray-900 dark:text-white font-bold text-sm uppercase tracking-wider">
                    14-Day Expiry Window
                </Text>
                <View
                    style={{ backgroundColor: totalItemsInWindow > 0 ? '#FF3B3020' : undefined }}
                    className="px-3 py-1 rounded-full border border-gray-200 dark:border-[#30363D]"
                >
                    <Text
                        style={{ color: totalItemsInWindow > 0 ? '#FF3B30' : undefined }}
                        className="text-gray-500 dark:text-brand-muted text-xs font-bold"
                    >
                        {totalItemsInWindow} expiring
                    </Text>
                </View>
            </View>

            {/* Ribbon container */}
            <View
                className="rounded-2xl overflow-hidden border border-gray-200 dark:border-[#30363D]"
                style={{ minHeight: ribbonContentHeight + 44 }}
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    nestedScrollEnabled
                    contentContainerStyle={{ paddingHorizontal: 4 }}
                >
                    {Array.from({ length: WINDOW_DAYS }, (_, i) => i).map((dayOffset) => {
                        const dayItems = itemsByDay[dayOffset] ?? [];
                        const zoneBg = isDark ? DARK_ZONE_BG[dayOffset] : LIGHT_ZONE_BG[dayOffset];
                        const chipColor = getChipColor(dayOffset);
                        const extraCount = dayItems.length - MAX_CHIPS_VISIBLE;

                        return (
                            <View
                                key={dayOffset}
                                style={{
                                    width: COL_WIDTH,
                                    backgroundColor: zoneBg,
                                    borderRightWidth: dayOffset < WINDOW_DAYS - 1 ? 1 : 0,
                                    borderRightColor: isDark ? '#21262d40' : '#E5E7EB60',
                                }}
                            >
                                {/* Day label bar */}
                                <View
                                    style={{ backgroundColor: `${chipColor}30` }}
                                    className="py-2 items-center border-b border-gray-200/30 dark:border-[#30363D]/30"
                                >
                                    <Text
                                        style={{ color: chipColor, fontWeight: '700' }}
                                        className="text-xs"
                                        numberOfLines={1}
                                    >
                                        {getDayLabel(dayOffset)}
                                    </Text>
                                </View>

                                {/* Product chips */}
                                <View style={{ padding: 4, gap: 4 }}>
                                    {dayItems.slice(0, MAX_CHIPS_VISIBLE).map((item) => (
                                        <Pressable
                                            key={item.id}
                                            onPress={() => onSelectItem(item)}
                                            android_ripple={{ color: `${chipColor}40` }}
                                            style={{
                                                backgroundColor: `${chipColor}22`,
                                                borderColor: `${chipColor}66`,
                                                borderWidth: 1,
                                                borderRadius: 8,
                                                paddingHorizontal: 6,
                                                paddingVertical: 5,
                                                height: CHIP_HEIGHT,
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Text
                                                numberOfLines={1}
                                                style={{ color: chipColor, fontSize: 10, fontWeight: '600' }}
                                            >
                                                {item.name}
                                            </Text>
                                            {/* Source badge dot */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 1 }}>
                                                <View
                                                    style={{
                                                        width: 5,
                                                        height: 5,
                                                        borderRadius: 3,
                                                        backgroundColor: item.source === 'cooler' ? '#60A5FA' : '#34D399',
                                                        marginRight: 3,
                                                    }}
                                                />
                                                <Text style={{ color: chipColor, fontSize: 8, opacity: 0.8 }}>
                                                    {item.source}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    ))}

                                    {extraCount > 0 && (
                                        <View
                                            style={{
                                                height: CHIP_HEIGHT,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ color: chipColor, fontSize: 10, fontWeight: '700' }}>
                                                +{extraCount} more
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Legend */}
            <View className="flex-row items-center justify-center mt-3 gap-4 space-x-4">
                {[
                    { color: '#60A5FA', label: 'Cooler' },
                    { color: '#34D399', label: 'Floor' },
                ].map(({ color, label }) => (
                    <View key={label} className="flex-row items-center gap-1.5" style={{ gap: 5 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                        <Text className="text-gray-500 dark:text-brand-muted text-xs">{label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}
