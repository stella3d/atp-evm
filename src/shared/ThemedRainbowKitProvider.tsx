import React from 'react';
import { lightTheme, midnightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';


const rainbowThemes = { darkMode: midnightTheme(), lightMode: lightTheme() }; 

const ThemedRainbowKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RainbowKitProvider theme={rainbowThemes}>
      {children}
    </RainbowKitProvider>
  );
};

export default ThemedRainbowKitProvider;