import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from "react-native-screens";
import { AuthProvider } from '../context/auth';
import { LanguageProvider } from '../context/language';
import { NotificationsProvider } from '../context/notifications';
import { ThemeProvider, useTheme } from '../context/theme';
import { auth } from '../firebaseConfig';
import "../global.css";
import { GlobalModalProvider } from "../utils/GlobalModal";

// Splash ekranının avtomatik gizlənməsini dayandır
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

// Deep linking üçün baza URL
const prefix = Linking.createURL('/');

// Tema rəngləri
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

// StatusBar
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

// Tema stiller 
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
    
    // Firebase auth dinləyicisi
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // Auth yükləndikdən sonra splash ekranını gizlət
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
              <NotificationsProvider>
                <GlobalModalProvider>
                  <RootLayoutNav user={user} />
                </GlobalModalProvider>
              </NotificationsProvider>
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

    // istifadəçi yoxdursa və auth qrupunda və ya index səhifəsindədirsə, əsas səhifəyə yönlendir
    if (!user && !inAuthGroup && !inIndexPage) {
      router.replace('/');
    } 

    else if (user && (inIndexPage || inAuthGroup)) {
      router.replace('/(tabs)/home');
    }
  }, [user, segments]);

  return (
    <ThemedStack />
  );
} 