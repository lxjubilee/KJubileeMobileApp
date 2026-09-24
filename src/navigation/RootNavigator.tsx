import React from 'react';
import { NavigationContainer, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/context';
import {
  StationListScreen,
  FavoriteStationsScreen,
  StationDetailScreen,
  BandArticlesScreen,
  BandArticleDetailScreen,
} from '@/screens';
import { JubileeDoorScreen, ForgotPasswordScreen } from '@/screens/Auth';
import { PrivacyPolicyScreen, TermsOfUseScreen } from '@/screens/Legal';
import { MainTabNavigator } from './MainTabNavigator';
import { linking } from './linking';
import { navigationRef } from './navigationRef';
import { ShareDeepLinks } from './useShareDeepLinks';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const theme = useTheme();

  const navTheme: NavTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.text,
      primary: theme.colors.primary,
      border: theme.colors.border,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        {/* Detail screens push full-screen over the tabs, Netflix-style. */}
        <Stack.Screen name="StationList" component={StationListScreen} />
        <Stack.Screen name="FavoriteStations" component={FavoriteStationsScreen} />
        <Stack.Screen name="StationDetail" component={StationDetailScreen} />
        {/* The Heavenly Band — the written half of the network. */}
        <Stack.Screen name="BandArticles" component={BandArticlesScreen} />
        <Stack.Screen name="BandArticleDetail" component={BandArticleDetailScreen} />
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          {/* The door is a modal because signing in is now something you leave
              as well as enter: a sheet can be swiped away, and the dismissal
              lands back on whatever the listener was already doing. */}
          <Stack.Screen name="JubileeDoor" component={JubileeDoorScreen} />
        </Stack.Group>
        {/* Pushed from inside the door — cards, not modals, so they stack over
            it rather than replacing the sheet. */}
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      </Stack.Navigator>
      {/* Resolves incoming frequency links -> open the Dial on that station. */}
      <ShareDeepLinks navRef={navigationRef} />
    </NavigationContainer>
  );
};
