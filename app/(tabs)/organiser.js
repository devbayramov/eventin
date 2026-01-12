import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  Animated,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import OrganiserCard, { FavoriteOrganiserCard, PlaceholderOrganiserCard, PlaceholderFavoriteOrganiserCard } from "../components/OrganiserCard";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useTheme } from '../../context/theme';
import { useLanguage, translations } from '../../context/language';

const { width } = Dimensions.get("window");


export default function Organiser() {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  // State'ler
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Bütün sahələr");
  const [loading, setLoading] = useState(true);
  const [followersLoading, setFollowersLoading] = useState(true);
  const [allOrganisers, setAllOrganisers] = useState([]);
  const [filteredOrganisers, setFilteredOrganisers] = useState([]);
  const [totalOrganiserCount, setTotalOrganiserCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [popularOrganisers, setPopularOrganisers] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularFollowersLoading, setPopularFollowersLoading] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const currentIndex = useRef(0);
  const timerRef = useRef(null);
  const scrollViewRef = useRef(null);
  const router = useRouter();
  
  
  const fetchCategories = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "categories"));
      let categoriesList = querySnapshot.docs.map((doc) => doc.data().name);
      
      // Kategori listesini özel sıralamaya göre düzenle
      // 1. "Texnologiya" kategorisini başa taşı
      const texnologiyaIndex = categoriesList.findIndex(cat => cat === "Texnologiya");
      if (texnologiyaIndex !== -1) {
        // "Texnologiya" kategorisini listeden çıkar
        const texnologiya = categoriesList.splice(texnologiyaIndex, 1)[0];
        // Listenin başına ekle
        categoriesList.unshift(texnologiya);
      }
      
      // 2. "Digər" kategorisini sona taşı
      const digerIndex = categoriesList.findIndex(cat => cat === "Digər");
      if (digerIndex !== -1) {
        // "Digər" kategorisini listeden çıkar
        const diger = categoriesList.splice(digerIndex, 1)[0];
        // Listenin sonuna ekle
        categoriesList.push(diger);
      }
      
      setCategories(categoriesList);
    } catch (error) {
      console.error("❌ Kategoriler yüklenirken hata:", error.message);
    }
  }, []);
  
  // Organizatörleri getirme
  const fetchOrganisers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Collection referansı
      const organisersRef = collection(db, "users");
      
      // Sadece organizatörleri getir
      const q = query(
        organisersRef,
        where("registerType", "==", "organiser"),
        orderBy("createdAt", "desc")
      );
      
      // Toplam organizatör sayısını al
      const countQuery = query(
        organisersRef,
        where("registerType", "==", "organiser")
      );
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalOrganiserCount(countSnapshot.data().count);
      
      // Organizatörleri getir
      const querySnapshot = await getDocs(q);
      
      // Organizerleri takipçi sayısı olmadan al - böylece hızlıca gösterebiliriz
      const organisers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        followersCount: 0 // İlk başta takipçi sayısını 0 olarak ayarla
      }));
      
      setAllOrganisers(organisers);
      setFilteredOrganisers(organisers);
      setLoading(false);
      
      // Takipçi sayılarını ayrı olarak getir
      setFollowersLoading(true);
      
      // Her bir organizatör için takipçi sayısını getir
      const organisersWithFollowers = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const organiserData = { id: doc.id, ...doc.data() };
          
          // Takipçi sayısını kontrol et
          try {
            const followersRef = collection(db, "users", doc.id, "followers");
            const followersSnapshot = await getCountFromServer(followersRef);
            return {
              ...organiserData,
              followersCount: followersSnapshot.data().count
            };
          } catch (error) {
            console.error("Takipçi sayısı hatası:", error);
            return {
              ...organiserData,
              followersCount: 0
            };
          }
        })
      );
      
      // Takipçi sayıları alındıktan sonra güncelleyelim
      setAllOrganisers(organisersWithFollowers);
      setFilteredOrganisers(organisersWithFollowers);
      
    } catch (error) {
      console.error("Organizatörleri getirme hatası:", error);
      setError("Təşkilatçıları yükləmədə xəta yarandı");
    } finally {
      setLoading(false);
      setFollowersLoading(false);
    }
  }, []);
  
  // Popüler organizatörleri getirme
  const fetchPopularOrganisers = useCallback(async () => {
    try {
      setPopularLoading(true);
      
      // Collection referansı
      const organisersRef = collection(db, "users");
      
      // Sadece organizatörleri getir
      const q = query(
        organisersRef,
        where("registerType", "==", "organiser")
      );
      
      const querySnapshot = await getDocs(q);
      
      // Önce tüm organizatörleri takipçi sayısı olmadan al
      const organisers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        followersCount: 0 // İlk başta takipçi sayısını 0 olarak ayarla
      }));
      
      // Hızlı başlangıç için organizerleri göster (10 tane)
      const initialPopular = organisers.slice(0, 10);
      setPopularOrganisers(initialPopular);
      setPopularLoading(false);
      
      // Takipçi sayılarını ayrı olarak getir
      setPopularFollowersLoading(true);
      
      // Her bir organizatör için takipçi sayısını getir
      const organisersWithFollowers = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const organiserData = { id: doc.id, ...doc.data() };
          
          // Takipçi sayısını kontrol et
          try {
            const followersRef = collection(db, "users", doc.id, "followers");
            const followersSnapshot = await getCountFromServer(followersRef);
            return {
              ...organiserData,
              followersCount: followersSnapshot.data().count
            };
          } catch (error) {
            return {
              ...organiserData,
              followersCount: 0
            };
          }
        })
      );
      
      // Takipçi sayısına göre sırala ve en az 1 takipçisi olanları filtrele
      const popular = organisersWithFollowers
        .filter(org => org.followersCount > 0)
        .sort((a, b) => b.followersCount - a.followersCount)
        .slice(0, 10); // En çok takipçisi olan 10 organizatör
      
      setPopularOrganisers(popular.length > 0 ? popular : initialPopular);
      
    } catch (error) {
      console.error("Popüler organizatörleri getirme hatası:", error);
    } finally {
      setPopularLoading(false);
      setPopularFollowersLoading(false);
    }
  }, []);

  // Otomatik kaydırma için timer
  useEffect(() => {
    if (popularOrganisers.length > 1) {
      timerRef.current = setInterval(() => {
        currentIndex.current = (currentIndex.current + 1) % popularOrganisers.length;
        flatListRef.current?.scrollToIndex({
          index: currentIndex.current,
          animated: true
        });
      }, 3000); // 3 saniyede bir kaydır

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [popularOrganisers]);

  // İlk yükleme
  useEffect(() => {
    fetchOrganisers();
    fetchPopularOrganisers();
    fetchCategories();
  }, [fetchOrganisers, fetchPopularOrganisers, fetchCategories]);
  
  // Arama ve filtreleme
  useEffect(() => {
    if (!allOrganisers || allOrganisers.length === 0) return;
    
    // Arama ve kategori filtreleme
    const filtered = allOrganisers.filter(organiser => {
      // İsim araması
      const nameMatch = organiser.companyName && 
        organiser.companyName.toLowerCase().includes(search.toLowerCase());
      
      // Kategori filtresi
      const categoryMatch = selectedCategory === "Bütün sahələr" || 
        (organiser.sector && organiser.sector === selectedCategory);
      
      return nameMatch && categoryMatch;
    });
    
    setFilteredOrganisers(filtered);
  }, [allOrganisers, search, selectedCategory]);
  
  // Yenileme fonksiyonu
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSearch("");
    
    try {
      await Promise.all([
        fetchOrganisers(),
        fetchPopularOrganisers(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error("Yenileme hatası:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrganisers, fetchPopularOrganisers, fetchCategories]);
  
  // Organizatöre tıklama
  const handleOrganiserPress = (organiser) => {
    if (!organiser?.id) {
      Alert.alert(t.general.error, t.organisers.notFound);
      return;
    }

    try {
      router.navigate(`/organisers/${organiser.id}`);
    } catch (error) {
      console.error('Navigasiya xətası:', error);
      Alert.alert(t.general.error, t.organisers.navigationError);
    }
  };
  
  // Placeholders render
  const renderPlaceholders = (count, Component) => {
    return (
      <View className="flex-row flex-wrap justify-between">
        {Array(count).fill(0).map((_, index) => (
          <View key={`placeholder-${index}`} className="w-[49%] mb-4">
            <Component />
          </View>
        ))}
      </View>
    );
  };
  
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
      

      {/* Üst bölüm - Sabit kalacak */}
      <View >
        {/* Search ve Notification bar */}
        <View className="flex-row px-4 py-2 items-center justify-between">
          <View className={`flex-row flex-1 rounded-lg px-3 h-12 mr-2 items-center border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <Ionicons name="search" size={20} color={isDarkMode ? "#9CA3AF" : "#9CA3AF"} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t.organisers.searchPlaceholder}
              className={`flex-1 ml-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}
              placeholderTextColor="#9CA3AF"
              style={{ color: isDarkMode ? '#E5E7EB' : '#1F2937' }}
            />
            {search !== "" && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Kategoriler */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
          <View className="mr-2">
            <TouchableOpacity 
              className={`px-4 py-2 rounded-full border ${
                selectedCategory === "Bütün sahələr" 
                  ? "bg-indigo-600 border-indigo-600" 
                  : isDarkMode 
                    ? "bg-gray-800 border-gray-700" 
                    : "bg-white border-gray-300"
              }`}
              onPress={() => setSelectedCategory("Bütün sahələr")}
            >
              <Text className={`${selectedCategory === "Bütün sahələr" ? "text-white" : isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                {t.general.allCategories}
              </Text>
            </TouchableOpacity>
          </View>
          
          {categories.map((category, index) => (
            <View   
            key={category} 
            className={`${index === categories.length - 1 ? 'mr-4' : 'mr-2'}`}
          >
              <TouchableOpacity 
                className={`px-4 py-2 rounded-full border ${
                  selectedCategory === category 
                    ? "bg-indigo-600 border-indigo-600" 
                    : isDarkMode 
                      ? "bg-gray-800 border-gray-700" 
                      : "bg-white border-gray-300"
                }`}
                onPress={() => setSelectedCategory(category)}
              >
                <Text className={`${selectedCategory === category ? "text-white" : isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                  {category}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
        }
        className={isDarkMode ? 'bg-gray-900' : 'bg-white'}
      >
        {/* Favori Təşkilatçılar Bölümü */}
        <View className="mt-2 px-4">
          <Text className={`text-lg font-bold text-center mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {t.organisers.favorite}
          </Text>
          
          {popularLoading ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="pl-3 p-1"
            >
              <View className="flex-row">
                {Array(3).fill(0).map((_, index) => (
                  <View key={`placeholder-${index}`} className="w-[calc(100%-32px)] mr-4">
                    <PlaceholderFavoriteOrganiserCard isDarkMode={isDarkMode} />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : popularOrganisers.length > 0 ? (
            <Animated.FlatList
              ref={flatListRef}
              data={popularOrganisers}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={width - 32}
              snapToAlignment="center"
              contentContainerStyle={{ 
                paddingHorizontal: 16
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              onMomentumScrollEnd={(event) => {
                const contentOffset = event.nativeEvent.contentOffset.x;
                const index = Math.round(contentOffset / (width - 32));
                
                if (index >= Math.ceil(popularOrganisers.length / 2)) {
                  flatListRef.current?.scrollToIndex({
                    index: 0,
                    animated: false
                  });
                }
              }}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                // İki kartı yan yana göster, son tek kart durumunu da kontrol et
                if (index % 2 === 0) {
                  const nextItem = popularOrganisers[index + 1];
                  return (
                    <View style={{ width: width - 32, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View className="mb-1" style={{ width: '49%' }}>
                        <FavoriteOrganiserCard 
                          item={item}
                          onPress={() => handleOrganiserPress(item)}
                          isDarkMode={isDarkMode}
                          t={t}
                          followersLoading={popularFollowersLoading}
                        />
                      </View>
                      
                      {nextItem && (
                        <View className="mb-1" style={{ width: '49%' }}>
                          <FavoriteOrganiserCard 
                            item={nextItem}
                            onPress={() => handleOrganiserPress(nextItem)}
                            isDarkMode={isDarkMode}
                            t={t}
                            followersLoading={popularFollowersLoading}
                          />
                        </View>
                      )}
                    </View>
                  );
                }
                return null; // Tek indeksli öğeleri atla, çünkü onları çift indekslilerle birlikte render ediyoruz
              }}
              getItemLayout={(data, index) => ({
                length: width - 32,
                offset: (width - 32) * Math.floor(index / 2),
                index,
              })}
              initialScrollIndex={0}
            />
          ) : (
            <View className={`w-[calc(100%-32px)] p-4 items-center justify-center rounded-xl h-30 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Ionicons name="people-outline" size={32} color={isDarkMode ? "#6B7280" : "#9ca3af"} />
              <Text className={`mt-2 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {t.organisers.noFavorites}
              </Text>
            </View>
          )}
        </View>
        
        {/* Təşkilatçılar */}
        <View className="mt-8 px-4 pb-24">
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {t.organisers.title}
            </Text>
            
            <Text className={`text-indigo-500 text-sm ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>
              {totalOrganiserCount} {t.organisers.organiserCount}
            </Text>
          </View>
          
          {loading ? (
            <View className="flex justify-between">
              {renderPlaceholders(4, () => <PlaceholderOrganiserCard isDarkMode={isDarkMode} />)}
            </View>
          ) : filteredOrganisers.length > 0 ? (
            <View className="flex-row flex-wrap justify-between">
              {filteredOrganisers.map((organiser) => (
                <View key={organiser.id} className="w-[49%]">
                  <OrganiserCard 
                    item={organiser}
                    onPress={() => handleOrganiserPress(organiser)}
                    isDarkMode={isDarkMode}
                    t={t}
                    followersLoading={followersLoading}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View className={`p-4 items-center justify-center rounded-xl h-30 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Ionicons name="alert-circle-outline" size={32} color={isDarkMode ? "#6B7280" : "#9ca3af"} />
              <Text className={`mt-2 text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {t.organisers.noResults}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 