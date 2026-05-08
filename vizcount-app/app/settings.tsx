import { View } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { SettingsFeature } from '@/src/features/settings/SettingsFeature';

export default function SettingsScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View className="flex-1 bg-brand-light dark:bg-brand-dark">
            <Stack.Screen
                options={{
                    title: 'Settings',
                    headerShown: false,
                    presentation: 'modal',
                }}
            />
            <SettingsFeature />
        </View>
    );
}
