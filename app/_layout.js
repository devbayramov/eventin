import 'react-native-gesture-handler';
import { Stack, Redirect, useRouter, useSegments, Slot } from "expo-router";
import { GlobalModalProvider } from "./components/GlobalModal";
import "../global.css";
import { useEffect, useState } from "react";
import { enableScreens } from "react-native-screens";
import { Platform, Text, View, ActivityIndicator, StatusBar } from "react-native";
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from "firebase/auth";
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '../context/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import linkingConfig from './linking';
import { ThemeProvider, useTheme } from '../context/theme';
import { LanguageProvider } from '../context/language';

// Splash ekranının otomatik olarak gizlenmesini engelle
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// Deep linking yapılandırması
const prefix = Linking.createURL('/');

// Tema renklerini tanımlama
const themeColors = {
  light: {
    background: '#fff',
    text: '#000',
    statusBar: 'light-content',
    statusBarBgColor: '#6366f1'
  },
  dark: {
    background: '#1f2937',
    text: '#fff',
    statusBar: 'light-content',
    statusBarBgColor: '#1f2937'
  }
};

// StatusBar bileşeni
function ThemeStatusBar() {
  const { isDarkMode } = useTheme();
  
  return (
    <StatusBar 
      barStyle={isDarkMode ? "light-content" : "dark-content"}
      backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"}
      translucent={false}
    />
  );
}

// Tema stiller bileşeni
function ThemedStack() {
  const { currentTheme, isDarkMode } = useTheme();
  
  return (
    <>
      <ThemeStatusBar />
      <Stack 
        screenOptions={{
          headerShown: false,
          contentStyle: { 
            backgroundColor: isDarkMode ? themeColors.dark.background : themeColors.light.background 
          },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [user, setUser] = useState(null);
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    enableScreens();
    
    // Firebase auth durumunu dinle
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Auth durumu belirlendikten hemen sonra splash ekranını gizle
      const hideSplash = async () => {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      };
      
      hideSplash();
    });

    return () => unsubscribe();
  }, []);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <GlobalModalProvider>
                <RootLayoutNav user={user} />
              </GlobalModalProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav({ user }) {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inIndexPage = segments.length === 0 || segments[0] === 'index';

    // Kullanıcı yoksa ve auth grubunda değilse, index sayfasına yönlendir
    if (!user && !inAuthGroup && !inIndexPage) {
      router.replace('/');
    } 
    // Kullanıcı varsa ve index sayfasında veya auth grubundaysa, home sayfasına yönlendir
    else if (user && (inIndexPage || inAuthGroup)) {
      router.replace('/(tabs)/home');
    }
  }, [user, segments]);

  return (
    <ThemedStack />
  );
} 