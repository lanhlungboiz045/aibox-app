// App.jsx — Entry point cho AIBox app (JavaScript)
import React from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0F1115',
    card: '#1A1D24',
    text: '#FFFFFF',
    border: '#2A2E36',
    primary: '#6C5CE7',
  },
};

export default function App() {
  return (
    // initialMetrics: có sẵn insets ngay frame đầu, tránh content bị nhảy/che dưới notch
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppProvider>
        <NavigationContainer theme={navTheme}>
          <AppNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
