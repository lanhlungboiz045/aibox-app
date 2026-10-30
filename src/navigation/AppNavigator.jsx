// navigation/AppNavigator.jsx — Stack navigation (JavaScript)
// Điều hướng: KHÔNG dùng bottom tab bar. 5 màn chính nằm cùng stack, chuyển màn bằng
// AppDrawer (nút ☰ ở header mọi màn). Các màn phụ vẫn push lên stack như cũ.
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '../screens/HomeScreen';
import { AIHubScreen } from '../screens/AIHubScreen';
import { TaiXiuScreen } from '../screens/TaiXiuScreen';
import { ModelCatalogScreen } from '../screens/ModelCatalogScreen';
import { UsageDashboardScreen } from '../screens/UsageDashboardScreen';
import { CreditsTopupScreen } from '../screens/CreditsTopupScreen';
import { AISettingsScreen } from '../screens/AISettingsScreen';
import { APIKeysScreen } from '../screens/APIKeysScreen';
import { LogsScreen } from '../screens/LogsScreen';
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
import { RoleGate } from './RoleGate';
import { useApp } from '../context/AppContext';

const Stack = createNativeStackNavigator();

const AdminHomeRoute = props => <RoleGate {...props} screen={AdminHomeScreen} allowedRoles={['admin']} />;
const AdminMarketsRoute = props => <RoleGate {...props} screen={AdminMarketsScreen} allowedRoles={['admin']} />;
const AdminAIModelsRoute = props => <RoleGate {...props} screen={AdminAIModelsScreen} allowedRoles={['admin']} />;
const AdminUsersRoute = props => <RoleGate {...props} screen={AdminUsersScreen} allowedRoles={['admin']} />;
const AdminRiskRoute = props => <RoleGate {...props} screen={AdminRiskScreen} allowedRoles={['admin']} />;
const AISettingsRoute = props => <RoleGate {...props} screen={AISettingsScreen} allowedRoles={['admin']} />;

export function AppNavigator() {
  const { state } = useApp();
  const isAdmin = state.user?.role === 'admin';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      {/* ── 5 màn chính: vào bằng drawer ── */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AIHub" component={AIHubScreen} />
      <Stack.Screen name="Markets" component={MarketsScreen} />
      <Stack.Screen name="Portfolio" component={PortfolioScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="TaiXiu" component={TaiXiuScreen} />

      {/* ── Màn phụ ── */}
      <Stack.Screen name="MarketDetail" component={MarketDetailScreen} />
      <Stack.Screen name="ModelCatalog" component={ModelCatalogScreen} />
      <Stack.Screen name="UsageDashboard" component={UsageDashboardScreen} />
      <Stack.Screen name="CreditsTopup" component={CreditsTopupScreen} />
      <Stack.Screen name="AISettings" component={AISettingsRoute} />
      <Stack.Screen name="APIKeys" component={APIKeysScreen} />
      <Stack.Screen name="Logs" component={LogsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Transfer" component={TransferScreen} />
      <Stack.Screen name="Store" component={StoreScreen} />
      <Stack.Screen name="Quests" component={QuestsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="CreateMarket" component={CreateMarketScreen} />
      <Stack.Screen name="TraderProfile" component={TraderProfileScreen} />
      <Stack.Screen name="CopyTrade" component={CopyTradeScreen} />
      {/* Admin CMS — vẫn nằm trong app vì đây là bản demo; production nên tách web CMS */}
      {isAdmin ? <Stack.Screen name="AdminHome" component={AdminHomeRoute} /> : null}
      {isAdmin ? <Stack.Screen name="AdminMarkets" component={AdminMarketsRoute} /> : null}
      {isAdmin ? <Stack.Screen name="AdminAIModels" component={AdminAIModelsRoute} /> : null}
      {isAdmin ? <Stack.Screen name="AdminUsers" component={AdminUsersRoute} /> : null}
      {isAdmin ? <Stack.Screen name="AdminRisk" component={AdminRiskRoute} /> : null}
    </Stack.Navigator>
  );
}
