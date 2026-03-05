import React from 'react';
import { View, Text, Modal, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Calendar } from 'react-native-calendars';

interface DatePickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectDate: (dateString: string) => void;
    currentDate?: string;
}

export function DatePickerModal({
    visible,
    onClose,
    onSelectDate,
    currentDate
}: DatePickerModalProps) {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Theme configuration for the calendar
    const calendarTheme = {
        backgroundColor: isDark ? '#1D2125' : '#FFFFFF',
        calendarBackground: isDark ? '#1D2125' : '#FFFFFF',
        textSectionTitleColor: isDark ? '#8B949E' : '#6B7280',
        selectedDayBackgroundColor: '#00C4A7', // brand-teal
        selectedDayTextColor: '#0D0F11', // brand-dark
        todayTextColor: '#00C4A7',
        dayTextColor: isDark ? '#E1E3E6' : '#111827',
        textDisabledColor: isDark ? '#30363D' : '#D1D5DB',
        dotColor: '#00C4A7',
        selectedDotColor: '#0D0F11',
        arrowColor: '#00C4A7',
        monthTextColor: isDark ? '#FFFFFF' : '#111827',
        textDayFontWeight: '500' as const,
        textMonthFontWeight: 'bold' as const,
        textDayHeaderFontWeight: '600' as const,
        textDayFontSize: 16,
        textMonthFontSize: 18,
        textDayHeaderFontSize: 14
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black/60 justify-center items-center px-4">
                <View className="bg-white dark:bg-[#1D2125] w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-[#30363D]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-[#30363D]">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">Select Expiry Date</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-brand-dark items-center justify-center -mr-2"
                        >
                            <Feather name="x" size={20} color={isDark ? '#E1E3E6' : '#4B5563'} />
                        </TouchableOpacity>
                    </View>

                    {/* Calendar Component */}
                    <View className="p-2">
                        <Calendar
                            current={currentDate}
                            onDayPress={(day: any) => {
                                onSelectDate(day.dateString);
                                onClose();
                            }}
                            theme={calendarTheme}
                            enableSwipeMonths={true}
                        />
                    </View>

                </View>
            </View>
        </Modal>
    );
}
