import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

// Tema için enum sabitleri
export const ThemeType = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

// Tema bağlamı (context) oluşturma
const ThemeContext = createContext({
  theme: ThemeType.SYSTEM,
  currentTheme: 'light', // Gerçek görüntülenen tema (light veya dark)
  setTheme: () => {},
  isDarkMode: false
});

// Theme Provider bileşeni
export const ThemeProvider = ({ children }) => {
  // Kullanıcı tercihi
  const [theme, setTheme] = useState(ThemeType.SYSTEM);
  // Sistem renk şeması
  const colorScheme = useColorScheme();
  // Efektif tema (görüntülenen)
  const [currentTheme, setCurrentTheme] = useState( colorScheme || 'light');


  // Kaydedilmiş tema tercihini al
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_KEY);
        if (savedTheme !== null) {
          setTheme(savedTheme);
        } else {
          // Eğer kaydedilmiş tema yoksa, sistem temasını kullan
          setTheme(ThemeType.SYSTEM);
        }
      } catch (error) {
        console.error('Tema tercihi yüklenirken hata:', error);
        // Hata durumunda da sistem teması kullan
        setTheme(ThemeType.SYSTEM);
      }
    };

    loadThemePreference();
  }, []);

  // Tema değişikliklerini işle
  useEffect(() => {
    const applyTheme = async () => {
      let effectiveTheme = 'light';

      if (theme === ThemeType.SYSTEM) {
        effectiveTheme = colorScheme || 'light';
      } else {
        effectiveTheme = theme;
      }

      setCurrentTheme(effectiveTheme);

      // Tema tercihini kaydet
      try {
        await AsyncStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        console.error('Tema tercihi kaydedilirken hata:', error);
      }
    };

    applyTheme();
  }, [theme, colorScheme]);

  // Tema değiştirme fonksiyonu
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

// Tema bağlamını kullanmak için hook
export const useTheme = () => useContext(ThemeContext); 