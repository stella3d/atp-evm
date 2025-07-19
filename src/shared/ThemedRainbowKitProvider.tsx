import React from 'react';
import { darkTheme, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';


const rainbowThemes = { darkMode: darkTheme(), lightMode: lightTheme() }; 

const ThemedRainbowKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RainbowKitProvider theme={rainbowThemes}>
      {children}
    </RainbowKitProvider>
  );
};

export default ThemedRainbowKitProvider;