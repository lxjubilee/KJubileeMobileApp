import React from 'react';
import { NavigationContainer, DarkTheme, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/context';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { Welcome } from '@/screens/Onboarding/Welcome';
import { JubileeDoorScreen, ForgotPasswordScreen } from '@/screens/Auth';
import { PrivacyPolicyScreen, TermsOfUseScreen } from '@/screens/Legal';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

type WelcomeNav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

/** Wraps the welcome slides: advancing marks onboarding done + opens the door. */
const WelcomeRoute: React.FC = () => {
  const navigation = useNavigation<WelcomeNav>();
  return (
    <Welcome
      onGetStarted={() => {
        void storage.setItem(STORAGE_KEYS.ONBOARDING_DONE, true);
        navigation.navigate('JubileeDoor');
      }}
    />
  );
};

interface AuthNavigatorProps {
  /** First-run starts at Welcome; returning/signed-out users at the door. */
  initialRoute: 'Welcome' | 'JubileeDoor';
}

/**
 * Unauthenticated navigation stack. Rendered by App when the user isn't signed
 * in; its own NavigationContainer so it never coexists with the main app stack.
 */
export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ initialRoute }) => {
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
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeRoute} />
        <Stack.Screen name="JubileeDoor" component={JubileeDoorScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
