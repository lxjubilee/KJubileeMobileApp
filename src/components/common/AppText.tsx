import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useTheme } from '@/context';
import type { TypographyVariant } from '@/theme';

type ColorToken = 'text' | 'textSecondary' | 'textMuted' | 'primary' | 'accent' | 'danger';

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  weight?: keyof ReturnType<typeof useTheme>['fontWeights'];
}

/**
 * Themed Text primitive. All text in the app should use this so typography and
 * color stay consistent and theme changes propagate everywhere.
 */
export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = 'text',
  weight,
  style,
  ...rest
}) => {
  const theme = useTheme();
  const composed: TextStyle = {
    ...theme.typography[variant],
    color: theme.colors[color],
    ...(weight ? { fontWeight: theme.fontWeights[weight] } : null),
  };
  return <Text {...rest} style={[composed, style]} />;
};
