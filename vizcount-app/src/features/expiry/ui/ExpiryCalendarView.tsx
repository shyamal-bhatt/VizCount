import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ExpiryItem } from '../useExpiryDB';

// --- Types ---
interface ExpiryCalendarViewProps {
    items: ExpiryItem[];
    onSelectItem: (item: ExpiryItem) => void;
}

interface DayItemsSheetProps {
    dateStr: string;
    items: ExpiryItem[];
    onSelectItem: (item: ExpiryItem) => void;
}

// --- Helpers ---

/** Returns YYYY-MM-DD string for a unix ms timestamp */
function toDateStr(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

/** Determine dot colour based on days until expiry */
function getDotColor(daysUntilExpiry: number): string {
    if (daysUntilExpiry < 0) return '#FF3B30';
    if (daysUntilExpiry === 0) return '#FF3B30';
    if (daysUntilExpiry <= 3) return '#FF8C42';
    if (daysUntilExpiry <= 7) return '#FFBF00';
    return '#34D399';
}

function formatShortDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDaysLabel(days: number): string {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days}d`;
}

// --- Day items inline sheet ---
function DayItemsSheet({ dateStr, items, onSelectItem }: DayItemsSheetProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (items.length === 0) return (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 13 }}>
                No expiries on {formatDisplayDate(dateStr)}
            </Text>
        </View>
    );

    return (
        <View>
            <Text
                style={{
                    color: isDark ? '#8B949E' : '#6B7280',
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 6,
                }}
            >
                {formatDisplayDate(dateStr)} · {items.length} item{items.length > 1 ? 's' : ''}
            </Text>
            {items.map((item) => {
                const dotColor = getDotColor(item.daysUntilExpiry);
                return (
                    <Pressable
                        key={item.id}
                        onPress={() => onSelectItem(item)}
                        android_ripple={{ color: `${dotColor}30` }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: isDark ? '#21262d' : '#F3F4F6',
                        }}
                    >
                        {/* Urgency stripe */}
                        <View
                            style={{
                                width: 3,
                                height: 36,
                                borderRadius: 2,
                                backgroundColor: dotColor,
                                marginRight: 12,
                            }}
                        />
                        {/* Info */}
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{ color: isDark ? '#E1E3E6' : '#111827', fontWeight: '600', fontSize: 14 }}
                                numberOfLines={1}
                            >
                                {item.name}
                            </Text>
                            <Text style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 11, marginTop: 2 }}>
                                PID {item.pid} · {formatShortDate(item.expiresAt)}
                            </Text>
                        </View>
                        {/* Source badge */}
                        <View
                            style={{
                                backgroundColor: item.source === 'cooler' ? '#60A5FA18' : '#34D39918',
                                borderWidth: 1,
                                borderColor: item.source === 'cooler' ? '#60A5FA40' : '#34D39940',
                                borderRadius: 99,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                marginRight: 8,
                            }}
                        >
                            <Text
                                style={{
                                    color: item.source === 'cooler' ? '#60A5FA' : '#34D399',
                                    fontSize: 10,
                                    fontWeight: '700',
                                }}
                            >
                                {item.source === 'cooler' ? '❄️' : '🏪'}
                            </Text>
                        </View>
                        {/* Days pill */}
                        <View
                            style={{
                                backgroundColor: `${dotColor}20`,
                                borderWidth: 1,
                                borderColor: `${dotColor}50`,
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                minWidth: 52,
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: dotColor, fontSize: 10, fontWeight: '700' }}>
                                {formatDaysLabel(item.daysUntilExpiry)}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}
        </View>
    );
}

// --- Main Component ---
export function ExpiryCalendarView({ items, onSelectItem }: ExpiryCalendarViewProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const today = toDateStr(Date.now());
    const [selectedDate, setSelectedDate] = useState<string>(today);

    // Build markedDates from items — multi-dot marking
    const markedDates = useMemo(() => {
        const map: Record<string, { dots: Array<{ color: string; key: string }>; marked: boolean; selected?: boolean }> = {};

        items.forEach((item) => {
            const key = toDateStr(item.expiresAt);
            if (!map[key]) map[key] = { dots: [], marked: true };
            const color = getDotColor(item.daysUntilExpiry);
            // Avoid duplicate dot colours for the same day
            if (!map[key].dots.find((d) => d.color === color)) {
                map[key].dots.push({ color, key: `${key}-${color}` });
            }
        });

        // Mark selected date
        const existing = map[selectedDate] ?? { dots: [], marked: false };
        map[selectedDate] = {
            ...existing,
            selected: true,
        };

        return map;
    }, [items, selectedDate]);

    // Items for the selected day
    const selectedDayItems = useMemo(() => {
        if (!selectedDate) return [];
        return items.filter((item) => toDateStr(item.expiresAt) === selectedDate);
    }, [items, selectedDate]);

    const handleDayPress = useCallback((day: DateData) => {
        setSelectedDate(day.dateString);
        console.log('[User Action] ExpiryCalendar - Day Pressed', { date: day.dateString });
    }, []);

    // Theme aligned with the app palette
    const calendarTheme = useMemo(() => ({
        backgroundColor: 'transparent',
        calendarBackground: isDark ? '#1D2125' : '#FFFFFF',
        textSectionTitleColor: isDark ? '#8B949E' : '#6B7280',
        todayTextColor: '#00C4A7',
        todayBackgroundColor: isDark ? '#00C4A720' : '#00C4A715',
        selectedDayBackgroundColor: '#00C4A7',
        selectedDayTextColor: '#FFFFFF',
        dayTextColor: isDark ? '#E1E3E6' : '#111827',
        textDisabledColor: isDark ? '#30363D' : '#D1D5DB',
        dotColor: '#00C4A7',
        selectedDotColor: '#FFFFFF',
        arrowColor: '#00C4A7',
        disabledArrowColor: isDark ? '#30363D' : '#D1D5DB',
        monthTextColor: isDark ? '#E1E3E6' : '#111827',
        indicatorColor: '#00C4A7',
        textDayFontWeight: '500' as const,
        textMonthFontWeight: '700' as const,
        textDayHeaderFontWeight: '600' as const,
        textDayFontSize: 14,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 12,
    }), [isDark]);

    return (
        <View>
            {/* Calendar widget */}
            <View
                style={{
                    marginHorizontal: 16,
                    marginTop: 12,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isDark ? '#30363D' : '#E5E7EB',
                }}
            >
                <Calendar
                    current={today}
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    markingType="multi-dot"
                    theme={calendarTheme}
                    enableSwipeMonths
                    style={{ borderRadius: 16 }}
                />
            </View>

            {/* Legend */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 16,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                }}
            >
                {[
                    { color: '#FF3B30', label: 'Expired / Today' },
                    { color: '#FF8C42', label: '≤ 3 Days' },
                    { color: '#FFBF00', label: '≤ 7 Days' },
                    { color: '#34D399', label: '14+ Days' },
                ].map(({ color, label }) => (
                    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                        <Text style={{ color: isDark ? '#8B949E' : '#6B7280', fontSize: 10 }}>{label}</Text>
                    </View>
                ))}
            </View>

            {/* Day detail list */}
            <View
                style={{
                    marginHorizontal: 16,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isDark ? '#30363D' : '#E5E7EB',
                    backgroundColor: isDark ? '#1D2125' : '#FFFFFF',
                    marginBottom: 16,
                }}
            >
                <DayItemsSheet
                    dateStr={selectedDate}
                    items={selectedDayItems}
                    onSelectItem={onSelectItem}
                />
            </View>
        </View>
    );
}
