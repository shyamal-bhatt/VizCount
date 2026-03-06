import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import withObservables from '@nozbe/with-observables';

import { database } from '@/db';
import { ScannedItem } from '@/db/models/ScannedItem';
import { SalesFloor } from '@/db/models/SalesFloor';
import { StockPulseHeader } from '@/src/shared/ui/StockPulseHeader';

import { useExpiryDB, ExpiryItem } from './useExpiryDB';
import { ExpiryRibbon } from './ui/ExpiryRibbon';
import { ExpiryBucketList } from './ui/ExpiryBucketList';
import { ExpiryDetailSheet } from './ui/ExpiryDetailSheet';
import { ExpiryCalendarView } from './ui/ExpiryCalendarView';
import { RotationAlertBanner } from './ui/RotationAlertBanner';

// --- Types ---

interface ExpiryFeatureProps {
    scannedItems: ScannedItem[];
    floorItems: SalesFloor[];
}

type ViewMode = 'ribbon' | 'calendar';

// --- Sub: Stat pill ---

interface StatPillProps {
    count: number;
    label: string;
    color: string;
    iconName: keyof typeof Feather.glyphMap;
}

function StatPill({ count, label, color, iconName }: StatPillProps) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: `${color}15`,
                borderColor: `${color}40`,
                borderWidth: 1,
                borderRadius: 14,
                padding: 12,
                alignItems: 'center',
            }}
        >
            <Feather name={iconName} size={18} color={color} style={{ marginBottom: 4 }} />
            <Text style={{ color, fontWeight: '800', fontSize: 18 }}>{count}</Text>
            <Text style={{ color, opacity: 0.7, fontSize: 10, fontWeight: '600', marginTop: 1 }}>{label}</Text>
        </View>
    );
}

// --- Sub: View toggle ---

interface ViewToggleProps {
    current: ViewMode;
    onChange: (v: ViewMode) => void;
    isDark: boolean;
}

const VIEW_OPTIONS: { key: ViewMode; label: string; icon: string }[] = [
    { key: 'ribbon', label: 'Ribbon', icon: 'view-sequential' },
    { key: 'calendar', label: 'Calendar', icon: 'calendar-month-outline' },
];

function ViewToggle({ current, onChange, isDark }: ViewToggleProps) {
    return (
        <View
            style={{
                flexDirection: 'row',
                marginHorizontal: 16,
                marginTop: 12,
                marginBottom: 4,
                backgroundColor: isDark ? '#1D2125' : '#F3F4F6',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: isDark ? '#30363D' : '#E5E7EB',
                padding: 3,
                gap: 2,
            }}
        >
            {VIEW_OPTIONS.map(({ key, label, icon }) => {
                const isActive = current === key;
                return (
                    <Pressable
                        key={key}
                        onPress={() => onChange(key)}
                        android_ripple={{ color: '#00C4A730' }}
                        style={[
                            {
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 8,
                                borderRadius: 9,
                            },
                            isActive && {
                                backgroundColor: isDark ? '#0D0F11' : '#FFFFFF',
                                borderWidth: 1,
                                borderColor: isDark ? '#30363D' : '#E5E7EB',
                            },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={icon as any}
                            size={14}
                            color={isActive ? '#00C4A7' : isDark ? '#8B949E' : '#6B7280'}
                        />
                        <Text
                            style={{
                                color: isActive ? '#00C4A7' : isDark ? '#8B949E' : '#6B7280',
                                fontSize: 12,
                                fontWeight: isActive ? '700' : '500',
                                marginLeft: 4,
                            }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

// --- Main Feature ---

function ExpiryFeatureBase({ scannedItems, floorItems }: ExpiryFeatureProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const { items, buckets, totalCount, urgentCount, rotationAlerts } = useExpiryDB(scannedItems, floorItems);

    const [selectedItem, setSelectedItem] = useState<ExpiryItem | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('ribbon');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUrgency, setFilterUrgency] = useState<'All' | 'Urgent' | 'Soon' | 'Rotation'>('All');

    console.log('[ExpiryFeature] Rendered', {
        scannedItemsCount: scannedItems.length,
        floorItemsCount: floorItems.length,
        totalTracked: totalCount,
        urgent: urgentCount,
        rotationAlerts: rotationAlerts.length,
    });

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#16191C' : '#FCFBF4' }}>
            {/* Top header — handles status-bar safe area */}
            <StockPulseHeader />

            <ExpiryBucketList
                buckets={buckets}
                onSelectItem={setSelectedItem}
                viewMode={viewMode}
                ListHeaderComponent={
                    <>
                        {/* Section heading */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 16,
                                paddingVertical: 14,
                                borderBottomWidth: 1,
                                borderBottomColor: isDark ? '#21262d' : '#E5E7EB',
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <MaterialCommunityIcons name="clock-alert-outline" size={20} color="#00C4A7" />
                                <Text style={{ color: isDark ? '#FFFFFF' : '#111827', fontWeight: '700', fontSize: 16 }}>
                                    Expiry Tracker
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
                                {/* Search Input */}
                                <View style={{
                                    flexDirection: 'row', alignItems: 'center',
                                    backgroundColor: isDark ? '#1D2125' : '#F3F4F6',
                                    borderRadius: 8, paddingHorizontal: 8, height: 32, flex: 1, maxWidth: 150,
                                    borderWidth: 1, borderColor: isDark ? '#30363D' : '#E5E7EB'
                                }}>
                                    <Feather name="search" size={14} color={isDark ? "#8B949E" : "#9CA3AF"} />
                                    <TextInput
                                        style={{ flex: 1, color: isDark ? '#FFFFFF' : '#111827', fontSize: 12, marginLeft: 6, padding: 0 }}
                                        placeholder="Search..."
                                        placeholderTextColor={isDark ? "#4B5563" : "#9CA3AF"}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        selectionColor="#00C4A7"
                                    />
                                    {searchQuery.length > 0 && (
                                        <Pressable onPress={() => setSearchQuery('')}>
                                            <Feather name="x-circle" size={14} color={isDark ? "#8B949E" : "#9CA3AF"} />
                                        </Pressable>
                                    )}
                                </View>

                                {/* Filter Toggle */}
                                <Pressable
                                    onPress={() => {
                                        const modes: ('All' | 'Urgent' | 'Soon' | 'Rotation')[] = ['All', 'Urgent', 'Soon', 'Rotation'];
                                        setFilterUrgency(modes[(modes.indexOf(filterUrgency) + 1) % modes.length]);
                                    }}
                                    style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 4,
                                        backgroundColor: filterUrgency !== 'All' ? '#00C4A715' : (isDark ? '#1D2125' : '#F3F4F6'),
                                        borderRadius: 8, paddingHorizontal: 8, height: 32,
                                        borderWidth: 1, borderColor: filterUrgency !== 'All' ? '#00C4A750' : (isDark ? '#30363D' : '#E5E7EB')
                                    }}
                                >
                                    <Feather name="filter" size={14} color={filterUrgency !== 'All' ? '#00C4A7' : (isDark ? '#8B949E' : '#6B7280')} />
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: filterUrgency !== 'All' ? '#00C4A7' : (isDark ? '#8B949E' : '#6B7280') }}>
                                        {filterUrgency}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Summary stat pills */}
                        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
                            <StatPill
                                count={buckets.expired.length + buckets.today.length}
                                label="Urgent"
                                color="#FF3B30"
                                iconName="alert-triangle"
                            />
                            <StatPill
                                count={buckets.threeDays.length + buckets.sevenDays.length}
                                label="Soon"
                                color="#FFBF00"
                                iconName="clock"
                            />
                            <StatPill
                                count={totalCount}
                                label="Total"
                                color="#00C4A7"
                                iconName="package"
                            />
                            {rotationAlerts.length > 0 && (
                                <StatPill
                                    count={rotationAlerts.length}
                                    label="Rotation"
                                    color="#F59E0B"
                                    iconName="refresh-cw"
                                />
                            )}
                        </View>

                        {/* ── Rotation Alert Banner (only shown when violations exist) ── */}
                        <RotationAlertBanner alerts={rotationAlerts} />

                        {/* ── View Toggle ── */}
                        <ViewToggle current={viewMode} onChange={setViewMode} isDark={isDark} />

                        {/* ── Views ── */}
                        {viewMode === 'ribbon' && (
                            <>
                                <ExpiryRibbon items={items} onSelectItem={setSelectedItem} />
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        paddingHorizontal: 16,
                                        marginTop: 16,
                                        marginBottom: 4,
                                        gap: 8,
                                    }}
                                >
                                    <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#21262d' : '#E5E7EB' }} />
                                    <Text style={{ color: isDark ? '#8B949E' : '#9CA3AF', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        By Urgency
                                    </Text>
                                    <View style={{ flex: 1, height: 1, backgroundColor: isDark ? '#21262d' : '#E5E7EB' }} />
                                </View>
                            </>
                        )}
                    </>
                }
                ListFooterComponent={
                    viewMode === 'calendar' ? <ExpiryCalendarView items={items} onSelectItem={setSelectedItem} /> : undefined
                }
            />

            {/* ── Detail Sheet ── */}
            <ExpiryDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
        </View>
    );
}

// --- withObservables HOC ---

const enhance = withObservables([], () => ({
    scannedItems: database.collections.get<ScannedItem>('scanned_items').query(),
    floorItems: database.collections.get<SalesFloor>('sales_floor').query(),
}));

export const ExpiryFeature = enhance(ExpiryFeatureBase);
