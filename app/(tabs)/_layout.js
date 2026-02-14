import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { isLiquidGlassAvailable, GlassView } from 'expo-glass-effect';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { translations, useLanguage } from '../../context/language';
import { useTheme } from '../../context/theme';
import "../../global.css";
import { useGlobalModal } from '../../utils/GlobalModal';

const hasLiquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

export default function Layout() {
  const pathname = usePathname();
  const { resetAllFilters } = useGlobalModal(); 
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  const prevPathRef = useRef(pathname);
  
  useEffect(() => {
    const currentPath = pathname;
    const previousPath = prevPathRef.current;
    
    const tabNames = ["home", "follows", "organiser",  "profile"];
    
    const currentTab = currentPath.split('/').pop();
    const previousTab = previousPath.split('/').pop();

    const isCurrentPathTab = tabNames.includes(currentTab);
    const isPreviousPathTab = tabNames.includes(previousTab);
    
    if (isCurrentPathTab && isPreviousPathTab && currentTab !== previousTab) {
      resetAllFilters();
    }
    
    prevPathRef.current = pathname;
  }, [pathname]);

  const getScreenOptions = ({ route }) => {
    if (hasLiquidGlass) {
      return {
        headerShown: false,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 30,
          backgroundColor: "transparent",
          height: 60,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 10,
          marginHorizontal: 20,
          borderWidth: 0,
          elevation: 0,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <GlassView
            glassEffectStyle="regular"
            style={StyleSheet.absoluteFill}
          />
        ),
      };
    }

    const defaultTabBarStyle = {
      position: "absolute",
      bottom: 20,
      left: 20,
      right: 20,
      borderRadius: 30,
      backgroundColor: isDarkMode ? "rgba(17, 24, 39, 0.95)" : "rgba(223, 232, 247, 0.95)",
      backdropFilter: "blur(25px)",
      WebkitBackdropFilter: "blur(25px)",
      shadowColor: isDarkMode ? "#6366f1" : "#6366f1",
      shadowOffset: { width: 0, height: 0.5 },
      shadowOpacity: isDarkMode ? 0.4 : 0.6,
      shadowRadius: 15,
      elevation: 8,
      height: 60,
      paddingTop: 8,
      paddingBottom: 8,
      paddingHorizontal: 10,
      marginHorizontal: 20,
      borderWidth: 1.5,
      borderColor: isDarkMode ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.3)",
      overflow: 'hidden',
    };

    return {
      headerShown: false,
      tabBarStyle: defaultTabBarStyle,
      tabBarActiveTintColor: "#6366f1",
      tabBarInactiveTintColor: isDarkMode ? "#9ca3af" : "#9ca3af",
    };
  };
  
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={getScreenOptions}
    >
            <Tabs.Screen
        name="home"
        options={{
          tabBarLabel: t.tabs.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="organiser"
        options={{
          tabBarLabel: t.tabs.organisers,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="corporate-fare" size={size} color={color} />,
          href: {
            pathname: "/organiser"
          }
        }}
      />
      <Tabs.Screen
        name="follows"
        options={{
          tabBarLabel: t.tabs.follows,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="bookmark" size={size} color={color} />,
        }}
      />

    
      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: t.tabs.more,
          tabBarIcon: ({ color, size }) => <MaterialIcons name="widgets" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
