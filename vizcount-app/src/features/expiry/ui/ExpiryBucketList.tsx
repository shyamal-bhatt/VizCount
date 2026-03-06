import React, { useRef, useState } from 'react';
import { View, Text, Pressable, SectionList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ExpiryBuckets, ExpiryItem } from '../useExpiryDB';

// --- Types ---

interface ExpiryBucketListProps {
    buckets: ExpiryBuckets;
    onSelectItem: (item: ExpiryItem) => void;
    viewMode?: 'ribbon' | 'calendar';
    ListHeaderComponent?: React.ReactElement;
    ListFooterComponent?: React.ReactElement;
}

interface BucketConfig {
    key: keyof ExpiryBuckets;
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    darkBgColor: string;
    icon: string;
}

// --- Config ---

const BUCKET_CONFIG: BucketConfig[] = [
    {
        key: 'expired',
        label: 'Expired',
        emoji: '🔴',
        color: '#FF3B30',
        bgColor: '#FFEEEE',
        darkBgColor: '#3D0D0A',
        icon: 'alert-circle',
    },
    {
        key: 'today',
        label: 'Expires Today',
        emoji: '🟠',
        color: '#FF8C42',
        bgColor: '#FFF3E8',
        darkBgColor: '#3D2006',
        icon: 'clock-alert',
    },
    {
        key: 'threeDays',
        label: 'Within 3 Days',
        emoji: '🟡',
        color: '#FFBF00',
        bgColor: '#FFF8E0',
        darkBgColor: '#3D2C00',
        icon: 'clock-outline',
    },
    {
        key: 'sevenDays',
        label: 'Within 7 Days',
        emoji: '🟢',
        color: '#57BB5F',
        bgColor: '#EAF7C0',
        darkBgColor: '#243A1C',
        icon: 'calendar-check-outline',
    },
    {
        key: 'later',
        label: '14+ Days',
        emoji: '⚪',
        color: '#0EA5E9',
        bgColor: '#EFF9FF',
        darkBgColor: '#063052',
        icon: 'calendar-blank-outline',
    },
];

// --- Helper ---

function formatDate(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDaysLabel(days: number): string {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days}d`;
}

// --- Sub-components ---

function BucketHeader({ config, count }: { config: BucketConfig; count: number }) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (count === 0) return null;

    return (
        <View
            className="flex-row items-center justify-between px-4 py-2 mt-4"
            style={{
                backgroundColor: isDark ? config.darkBgColor : config.bgColor,
                borderLeftWidth: 3,
                borderLeftColor: config.color,
            }}
        >
            <View className="flex-row items-center" style={{ gap: 8 }}>
                <MaterialCommunityIcons
                    name={config.icon as any}
                    size={16}
                    color={config.color}
                />
                <Text style={{ color: config.color }} className="font-bold text-sm">
                    {config.emoji} {config.label}
                </Text>
            </View>
            <View
                style={{
                    backgroundColor: `${config.color}22`,
                    borderColor: `${config.color}44`,
                    borderWidth: 1,
                }}
                className="px-2.5 py-0.5 rounded-full"
            >
                <Text style={{ color: config.color }} className="text-xs font-bold">
                    {count}
                </Text>
            </View>
        </View>
    );
}

function ExpiryRow({ item, color, onPress }: { item: ExpiryItem; color: string; onPress: () => void }) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Pressable
            onPress={onPress}
            android_ripple={{ color: `${color}30` }}
            className="px-4 py-3 flex-row items-center justify-between bg-white dark:bg-brand-dark border-b border-gray-100 dark:border-[#21262d]"
        >
            {/* Left: Name + source badge */}
            <View className="flex-1 mr-3">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text
                        className="text-gray-900 dark:text-white font-semibold text-sm"
                        numberOfLines={1}
                        style={{ maxWidth: '80%' }}
                    >
                        {item.name}
                    </Text>
                    {/* Source badge */}
                    <View
                        style={{
                            backgroundColor: item.source === 'cooler' ? '#60A5FA20' : '#34D39920',
                            borderColor: item.source === 'cooler' ? '#60A5FA50' : '#34D39950',
                            borderWidth: 1,
                        }}
                        className="px-2 py-0.5 rounded-full"
                    >
                        <Text
                            style={{ color: item.source === 'cooler' ? '#60A5FA' : '#34D399' }}
                            className="text-xs font-bold"
                        >
                            {item.source === 'cooler' ? '❄️ Cooler' : '🏪 Floor'}
                        </Text>
                    </View>
                </View>
                <Text className="text-gray-400 dark:text-brand-muted text-xs mt-0.5">
                    PID {item.pid}  •  {formatDate(item.expiresAt)}
                </Text>
            </View>

            {/* Right: Days remaining pill */}
            <View
                style={{ backgroundColor: `${color}20`, borderColor: `${color}50`, borderWidth: 1 }}
                className="rounded-xl px-3 py-1.5 items-center min-w-[64px]"
            >
                <Text style={{ color }} className="text-xs font-bold">
                    {formatDaysLabel(item.daysUntilExpiry)}
                </Text>
            </View>
        </Pressable>
    );
}

// --- Main Component ---

export function ExpiryBucketList({ buckets, onSelectItem, viewMode = 'ribbon', ListHeaderComponent, ListFooterComponent }: ExpiryBucketListProps) {
    const listRef = useRef<any>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const allEmpty = BUCKET_CONFIG.every((c) => buckets[c.key].length === 0);

    const sections = React.useMemo(() => {
        if (viewMode !== 'ribbon') return [];
        return BUCKET_CONFIG.map(config => ({
            config,
            data: buckets[config.key]
        })).filter(s => s.data.length > 0);
    }, [buckets, viewMode]);

    return (
        <View style={{ flex: 1 }}>
            <SectionList
                ref={listRef}
                onScroll={(e: any) => {
                    const offsetY = e.nativeEvent.contentOffset.y;
                    if (offsetY > 100 && !showScrollTop) setShowScrollTop(true);
                    else if (offsetY <= 100 && showScrollTop) setShowScrollTop(false);
                }}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
                sections={sections}
                keyExtractor={item => item.id}
                ListHeaderComponent={ListHeaderComponent}
                ListFooterComponent={ListFooterComponent}
                renderSectionHeader={({ section }) => (
                    <BucketHeader config={section.config} count={section.data.length} />
                )}
                renderItem={({ item, section }) => (
                    <ExpiryRow item={item} color={section.config.color} onPress={() => onSelectItem(item)} />
                )}
                ListEmptyComponent={() => {
                    if (viewMode !== 'ribbon') return null;
                    if (!allEmpty) return null;
                    return (
                        <View className="items-center justify-center py-16 px-8">
                            <Text className="text-5xl mb-4">🗓️</Text>
                            <Text className="text-gray-700 dark:text-white text-base font-semibold mb-2 text-center">
                                No expiries tracked
                            </Text>
                            <Text className="text-gray-400 dark:text-brand-muted text-sm text-center">
                                Scan cooler items or add floor entries with best-before dates to see them here.
                            </Text>
                        </View>
                    );
                }}
            />
            {/* Scroll to Top FAB */}
            {showScrollTop && (
                <TouchableOpacity
                    className="absolute right-6 bg-[#00C4A7] w-12 h-12 rounded-full items-center justify-center shadow-lg transform translate-y-[-10px]"
                    style={{ elevation: 5, zIndex: 100, bottom: 20 }}
                    onPress={() => {
                        listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
                    }}
                >
                    <Feather name="arrow-up" size={24} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>
    );
}
