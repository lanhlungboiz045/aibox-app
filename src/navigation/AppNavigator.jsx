// navigation/AppNavigator.jsx — Bottom tab + stack navigation (JavaScript)
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '../screens/HomeScreen';
import { AIHubScreen } from '../screens/AIHubScreen';
import { ModelCatalogScreen } from '../screens/ModelCatalogScreen';
import { UsageDashboardScreen } from '../screens/UsageDashboardScreen';
import { CreditsTopupScreen } from '../screens/CreditsTopupScreen';
import { MarketsScreen } from '../screens/MarketsScreen';
import { MarketDetailScreen } from '../screens/MarketDetailScreen';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TransferScreen } from '../screens/TransferScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { QuestsScreen } from '../screens/QuestsScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { CreateMarketScreen } from '../screens/CreateMarketScreen';
import { TraderProfileScreen } from '../screens/TraderProfileScreen';
import { CopyTradeScreen } from '../screens/CopyTradeScreen';
import { AdminHomeScreen } from '../screens/admin/AdminHomeScreen';
import { AdminMarketsScreen } from '../screens/admin/AdminMarketsScreen';
import { AdminAIModelsScreen } from '../screens/admin/AdminAIModelsScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminRiskScreen } from '../screens/admin/AdminRiskScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcons = {
  Home: '\u{1F3E0}',
  AIHub: '\u{1F916}',
  Markets: '\u{1F4C8}',
  Portfolio: '\u{1F4BC}',
  Leaderboard: '\u{1F3C6}',
};

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Ẩn tab bar khi mở bàn phím để input chat không bị tab bar + keyboard chồng lên
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#1A1D24',
          borderTopColor: '#2A2E36',
          borderTopWidth: 1,
          // Tab bar là phần tử cuối màn hình nên phải tự chừa home indicator / nav bar
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          height: 56 + Math.max(insets.bottom, 6),
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#5C5C5C',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {tabIcons[route.name] || '\u{1F4B0}'}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="AIHub" component={AIHubScreen} options={{ title: 'AI Hub' }} />
      <Tab.Screen name="Markets" component={MarketsScreen} options={{ title: 'Markets' }} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portfolio' }} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Xếp hạng' }} />
    </Tab.Navigator>
  );
}

// Root stack (tabs + modal screens like Profile, Transfer, MarketDetail)
export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="MarketDetail" component={MarketDetailScreen} />
      <Stack.Screen name="ModelCatalog" component={ModelCatalogScreen} />
      <Stack.Screen name="UsageDashboard" component={UsageDashboardScreen} />
      <Stack.Screen name="CreditsTopup" component={CreditsTopupScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Transfer" component={TransferScreen} />
      <Stack.Screen name="Store" component={StoreScreen} />
      <Stack.Screen name="Quests" component={QuestsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CreateMarket" component={CreateMarketScreen} />
      <Stack.Screen name="TraderProfile" component={TraderProfileScreen} />
      <Stack.Screen name="CopyTrade" component={CopyTradeScreen} />
      {/* Admin CMS — vẫn nằm trong app vì đây là bản demo; production nên tách web CMS */}
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
      <Stack.Screen name="AdminMarkets" component={AdminMarketsScreen} />
      <Stack.Screen name="AdminAIModels" component={AdminAIModelsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminRisk" component={AdminRiskScreen} />
    </Stack.Navigator>
  );
}
