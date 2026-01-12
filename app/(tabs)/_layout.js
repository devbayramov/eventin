import { Tabs } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import "../../global.css"
import { usePathname } from "expo-router";
import { useGlobalModal } from '../components/GlobalModal'; 
import { useEffect, useRef } from 'react';
import { useTheme } from '../../context/theme';
import { useLanguage, translations } from '../../context/language';
import { View } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';

export default function Layout() {
  const pathname = usePathname();
  const { resetAllFilters } = useGlobalModal(); 
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  // Önceki path'i takip etmek için useRef kullanıyoruz
  const prevPathRef = useRef(pathname);
  
  useEffect(() => {
    const currentPath = pathname;
    const previousPath = prevPathRef.current;
    
    // Ana sekme adlarını içeren bir dizi oluştur
    const tabNames = ["home", "follows", "organiser", "documents", "profile"];
    
    // Mevcut ve önceki path'in sekme adlarını çıkart
    const currentTab = currentPath.split('/').pop();
    const previousTab = previousPath.split('/').pop();

    // Eğer hem mevcut hem de önceki path tabs sayfalarına aitse ve farklı tablar arasında geçiş yapıldıysa
    const isCurrentPathTab = tabNames.includes(currentTab);
    const isPreviousPathTab = tabNames.includes(previousTab);
    
    // Sadece bir sekme sayfasından başka bir sekme sayfasına geçiş yapıldığında filtreleri sıfırla
    if (isCurrentPathTab && isPreviousPathTab && currentTab !== previousTab) {
      resetAllFilters();
    }
    
    prevPathRef.current = pathname;
  }, [pathname]);

  const getScreenOptions = ({ route }) => {
    // Tab bar'ın varsayılan stilleri
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
      height: 50,
      paddingHorizontal: 10,
      justifyContent: "center",
      alignItems: "center",
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
        name="home"
        options={{
          tabBarLabel: t.tabs.home,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarLabel: t.tabs.documents,
          tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
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
