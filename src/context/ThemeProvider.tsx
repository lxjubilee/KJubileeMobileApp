import React, { createContext, useContext, useMemo } from 'react';
import { defaultTheme, Theme } from '@/theme';

const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * Provides the active theme to the tree. Currently always dark; designed so a
 * future light theme + toggle can be introduced by swapping the value here.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useMemo(() => defaultTheme, []);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => useContext(ThemeContext);
