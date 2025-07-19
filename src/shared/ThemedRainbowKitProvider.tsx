import React from 'react';
import { lightTheme, midnightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { userPrefersDarkMode } from './common.ts';

const ThemedRainbowKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDarkMode = userPrefersDarkMode();
  return (
    <RainbowKitProvider theme={isDarkMode ? midnightTheme() : lightTheme()}>
      {children}
    </RainbowKitProvider>
  );
};

export default ThemedRainbowKitProvider;