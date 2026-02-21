import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00C4A7', // brand teal
        tabBarInactiveTintColor: '#8B949E', // brand muted
        tabBarStyle: {
          backgroundColor: isDark ? '#16191C' : '#FCFBF4', // dark vs light
          borderTopColor: isDark ? '#1D2125' : '#E5E7EB', // card vs border-gray-200
        },
        headerStyle: {
          backgroundColor: isDark ? '#16191C' : '#FCFBF4',
          shadowColor: 'transparent', // removes border
          elevation: 0,
        },
        headerTintColor: isDark ? '#E1E3E6' : '#11181C',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShown: false, // Custom header will be in index.tsx
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => <TabBarIcon name="camera" color={color} />,
        }}
      />
      <Tabs.Screen
        name="manual"
        options={{
          title: 'Manual',
          tabBarIcon: ({ color }) => <TabBarIcon name="pencil-square-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare',
          tabBarIcon: ({ color }) => <TabBarIcon name="exchange" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expiry"
        options={{
          title: 'Expiry',
          tabBarIcon: ({ color }) => <TabBarIcon name="clock-o" color={color} />,
        }}
      />
    </Tabs>
  );
}
