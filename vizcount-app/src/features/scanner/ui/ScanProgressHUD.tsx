import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface ScanProgressHUDProps {
    scanStep: 0 | 1 | 2 | 3;
}

export function ScanProgressHUD({ scanStep }: ScanProgressHUDProps) {
    if (scanStep === 0) return null;

    let text = 'Processing...';
    let subtext = 'Please hold the camera steady';

    if (scanStep === 1) {
        text = 'Extracting Details...';
    } else if (scanStep === 2) {
        text = 'Saving to Database...';
    } else if (scanStep === 3) {
        text = 'Scan Complete!';
        subtext = 'Item recorded successfully';
    }

    return (
        <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(250)}
            className="absolute inset-0 bg-black/40 items-center justify-center px-6"
            style={{ zIndex: 999, elevation: 999 }}
        >
            <View
                className="bg-slate-900 px-8 pt-8 pb-6 rounded-[32px] items-center w-full max-w-[320px] border border-slate-700/80 overflow-hidden"
                style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.8,
                    shadowRadius: 32,
                    elevation: 24
                }}
            >
                {/* subtle glossy highlight */}
                <View className="absolute top-0 left-0 right-0 h-24 bg-white/5" />

                <View className="w-16 h-16 rounded-full bg-slate-800/80 items-center justify-center mb-5 border border-slate-700/50">
                    {scanStep === 3 ? (
                        <FontAwesome name="check" size={32} color="#10b981" />
                    ) : (
                        <ActivityIndicator size="large" color="#818cf8" />
                    )}
                </View>

                <Text className="text-white text-xl font-bold tracking-tight text-center">{text}</Text>

                <Text className="text-slate-400 text-sm mt-2 text-center font-medium">
                    {subtext}
                </Text>

                {scanStep < 3 && (
                    <View className="mt-8 flex-row items-center justify-center gap-1.5">
                        <View className={`h-1.5 rounded-full ${scanStep >= 0 ? 'bg-indigo-500 w-6' : 'bg-slate-700 w-1.5'}`} />
                        <View className={`h-1.5 rounded-full ${scanStep >= 1 ? 'bg-indigo-500 w-6' : 'bg-slate-700 w-1.5'}`} />
                        <View className={`h-1.5 rounded-full ${scanStep >= 2 ? 'bg-indigo-500 w-6' : 'bg-slate-700 w-1.5'}`} />
                    </View>
                )}
            </View>
        </Animated.View>
    );
}
