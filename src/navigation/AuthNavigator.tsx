import React from 'react';
import { NavigationContainer, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@/context';
import { JubileeDoorScreen, ForgotPasswordScreen } from '@/screens/Auth';
import { PrivacyPolicyScreen, TermsOfUseScreen } from '@/screens/Legal';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Unauthenticated navigation stack. Rendered by App when the user isn't signed
 * in; its own NavigationContainer so it never coexists with the main app stack.
 */
export const AuthNavigator: React.FC = () => {
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
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator initialRouteName="JubileeDoor" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="JubileeDoor" component={JubileeDoorScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
