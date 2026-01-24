import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

export const ThemeType = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

const ThemeContext = createContext({
  theme: ThemeType.SYSTEM,
  currentTheme: 'light', 
  setTheme: () => {},
  isDarkMode: false
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(ThemeType.SYSTEM);
  const colorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState( colorScheme || 'light');


  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme !== null) {
          setTheme(savedTheme);
        } else {
          setTheme(ThemeType.SYSTEM);
        }
      } catch (error) {
        console.error('Tema tercihi yüklenirken hata:', error);
        setTheme(ThemeType.SYSTEM);
      }
    };

    loadThemePreference();
  }, []);

  useEffect(() => {
    const applyTheme = async () => {
      let effectiveTheme = 'light';

      if (theme === ThemeType.SYSTEM) {
        effectiveTheme = colorScheme || 'light';
      } else {
        effectiveTheme = theme;
      }

      setCurrentTheme(effectiveTheme);

      try {
        await AsyncStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        console.error('Tema tercihi kaydedilirken hata:', error);
      }
    };

    applyTheme();
  }, [theme, colorScheme]);
  const changeTheme = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider 
      value={{
        theme,
        currentTheme,
        setTheme: changeTheme,
        isDarkMode: currentTheme === 'dark'
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 