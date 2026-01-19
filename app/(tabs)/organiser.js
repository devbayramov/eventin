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
  Alert,
  Modal
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
  
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Hamısı");
  const [loading, setLoading] = useState(true);
  const [followersLoading, setFollowersLoading] = useState(true);
  const [allOrganisers, setAllOrganisers] = useState([]);
  const [filteredOrganisers, setFilteredOrganisers] = useState([]);
  const [totalOrganiserCount, setTotalOrganiserCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [popularOrganisers, setPopularOrganisers] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularFollowersLoading, setPopularFollowersLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempCategory, setTempCategory] = useState("Hamısı");
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const currentIndex = useRef(0);
  const timerRef = useRef(null);
  const scrollViewRef = useRef(null);
  const router = useRouter();

  const categories = {
    "Əyləncə": [
      "Konsert",
      "Teatr",
      "Festival",
      "Film",
      "Oyun gecəsi",
      "Stand-up",
      "Musiqi",
      "Rəqs"
    ],
    "Karyera": [
      "Seminar",
      "Konfrans",
      "Workshop",
      "Networking",
      "Təlim",
      "Mentorluq",
      "İş yarmarkası",
      "Startap"
    ]
  };

  const hasActiveFilter = selectedCategory !== "Hamısı";

  const fetchOrganisers = useCallback(async () => {
    try {
      setLoading(true);
      
      const organisersRef = collection(db, "users");
      
      const q = query(
        organisersRef,
        where("registerType", "==", "organiser"),
        orderBy("createdAt", "desc")
      );
      
      const countQuery = query(
        organisersRef,
        where("registerType", "==", "organiser")
      );
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalOrganiserCount(countSnapshot.data().count);
      
      const querySnapshot = await getDocs(q);
      
      const organisers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        followersCount: 0 
      }));
      
      setAllOrganisers(organisers);
      setFilteredOrganisers(organisers);
      setLoading(false);
      
      setFollowersLoading(true);
      
      const organisersWithFollowers = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const organiserData = { id: doc.id, ...doc.data() };
          
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
  
  const fetchPopularOrganisers = useCallback(async () => {
    try {
      setPopularLoading(true);
      
      const organisersRef = collection(db, "users");
      
      const q = query(
        organisersRef,
        where("registerType", "==", "organiser")
      );
      
      const querySnapshot = await getDocs(q);
      
      // Önce tüm organizatörleri takipçi sayısı olmadan al
      const organisers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        followersCount: 0 
      }));
      
      const initialPopular = organisers.slice(0, 10);
      setPopularOrganisers(initialPopular);
      setPopularLoading(false);
      
      setPopularFollowersLoading(true);
      
      const organisersWithFollowers = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const organiserData = { id: doc.id, ...doc.data() };
          
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
      
      const popular = organisersWithFollowers
        .filter(org => org.followersCount > 0)
        .sort((a, b) => b.followersCount - a.followersCount)
        .slice(0, 10); 
      
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
  }, [fetchOrganisers, fetchPopularOrganisers]);
  
  // Arama ve filtreleme
  useEffect(() => {
    if (!allOrganisers || allOrganisers.length === 0) return;

    // Əsas kateqoriyaların alt kateqoriyaları
    const eylenceSubcategories = ["Konsert", "Teatr", "Festival", "Film", "Oyun gecəsi", "Stand-up", "Musiqi", "Rəqs"];
    const karyeraSubcategories = ["Seminar", "Konfrans", "Workshop", "Networking", "Təlim", "Mentorluq", "İş yarmarkası", "Startap"];

    // Arama ve kategori filtreleme
    const filtered = allOrganisers.filter(organiser => {
      // İsim araması
      const nameMatch = organiser.companyName &&
        organiser.companyName.toLowerCase().includes(search.toLowerCase());

      // Kategori filtresi
      let categoryMatch = false;
      const organiserSector = organiser.sector;

      if (selectedCategory === "Hamısı") {
        categoryMatch = true;
      } else if (selectedCategory === "Əyləncə") {
        categoryMatch = organiserSector === "Əyləncə" || eylenceSubcategories.includes(organiserSector);
      } else if (selectedCategory === "Karyera") {
        categoryMatch = organiserSector === "Karyera" || karyeraSubcategories.includes(organiserSector);
      } else {
        categoryMatch = organiserSector === selectedCategory;
      }

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
        fetchPopularOrganisers()
      ]);
    } catch (error) {
      console.error("Yenileme hatası:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrganisers, fetchPopularOrganisers]);

  // Filter modalını açma
  const openFilterModal = () => {
    setTempCategory(selectedCategory);
    setShowFilterModal(true);
  };

  // Filter uygulama
  const applyFilter = () => {
    setSelectedCategory(tempCategory);
    setShowFilterModal(false);
  };

  // Filter sıfırlama
  const resetFilter = () => {
    setTempCategory("Hamısı");
  };
  
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
      

      <View>
        {/* Search ve Filter bar */}
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
          <TouchableOpacity
            className={`p-3 h-12 rounded-lg border`}
            style={{
              backgroundColor: hasActiveFilter ? '#4F46E5' : (isDarkMode ? '#1f2937' : 'white'),
              borderColor: isDarkMode ? '#374151' : '#e5e7eb'
            }}
            onPress={openFilterModal}
          >
            <Ionicons
              name="funnel-outline"
              size={20}
              color={hasActiveFilter ? "#FFFFFF" : (isDarkMode ? '#818CF8' : '#4F46E5')}
            />
          </TouchableOpacity>
        </View>
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
        {/* <View className="mt-2 px-4">
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
        </View> */}
        
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
              {renderPlaceholders(6, () => <PlaceholderOrganiserCard isDarkMode={isDarkMode} />)}
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

      {/* Kateqoriya Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="rounded-t-3xl"
            style={{
              backgroundColor: isDarkMode ? '#1f2937' : 'white',
              maxHeight: '80%'
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center p-4 border-b" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#9ca3af' : '#6B7280'} />
              </TouchableOpacity>
              <Text className="text-lg font-bold" style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                Kateqoriya
              </Text>
              {tempCategory !== "Hamısı" && (
                <TouchableOpacity onPress={resetFilter}>
                  <Text style={{ color: '#4F46E5' }}>Sıfırla</Text>
                </TouchableOpacity>
              )}
              {tempCategory === "Hamısı" && <View style={{ width: 50 }} />}
            </View>

            {/* Categories List */}
            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Əsas kateqoriyalar - 3 buton yan-yana */}
              <View className="flex-row" style={{ marginBottom: 16 }}>
                {/* Hamısı butonu */}
                <TouchableOpacity
                  className="flex-row items-center justify-center py-2 px-3"
                  style={{
                    flex: 1,
                    backgroundColor: tempCategory === "Hamısı" ? '#4F46E5' : (isDarkMode ? '#374151' : '#f3f4f6'),
                    borderRadius: 8,
                    marginRight: 4
                  }}
                  onPress={() => setTempCategory("Hamısı")}
                >
                  <Ionicons
                    name="apps"
                    size={16}
                    color={tempCategory === "Hamısı" ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151')}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{
                    fontWeight: '600',
                    fontSize: 13,
                    color: tempCategory === "Hamısı" ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151')
                  }}>
                    Hamısı
                  </Text>
                </TouchableOpacity>

                {/* Əyləncə butonu */}
                <TouchableOpacity
                  className="flex-row items-center justify-center py-2 px-3"
                  style={{
                    flex: 1,
                    backgroundColor: tempCategory === "Əyləncə" ? '#4F46E5' : (isDarkMode ? '#374151' : '#f3f4f6'),
                    borderRadius: 8,
                    marginHorizontal: 4
                  }}
                  onPress={() => setTempCategory("Əyləncə")}
                >
                  <Ionicons
                    name="musical-notes"
                    size={16}
                    color={tempCategory === "Əyləncə" ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151')}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{
                    fontWeight: '600',
                    fontSize: 13,
                    color: tempCategory === "Əyləncə" ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151')
                  }}>
                    Əyləncə
                  </Text>
                </TouchableOpacity>

                {/* Karyera butonu */}
                <TouchableOpacity
                  className="flex-row items-center justify-center py-2 px-3"
                  style={{
                    flex: 1,
                    backgroundColor: tempCategory === "Karyera" ? '#4F46E5' : (isDarkMode ? '#374151' : '#f3f4f6'),
                    borderRadius: 8,
                    marginLeft: 4
                  }}
                  onPress={() => setTempCategory("Karyera")}
                >
                  <Ionicons
                    name="briefcase"
                    size={16}
                    color={tempCategory === "Karyera" ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151')}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{
                    fontWeight: '600',
                    fontSize: 13,
                    color: tempCategory === "Karyera" ? '#ffffff' : (isDarkMode ? '#e5e7eb' : '#374151')
                  }}>
                    Karyera
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Alt kateqoriyalar - 2 sütunda */}
              <View className="flex-row">
                {/* Əyləncə alt kateqoriyaları */}
                <View style={{ flex: 1, paddingRight: 8 }}>
                  {categories["Əyləncə"].map((category, index) => (
                    <TouchableOpacity
                      key={`eylence-${index}`}
                      className="flex-row justify-between items-center py-2 border-b"
                      style={{ borderColor: isDarkMode ? '#374151' : '#f3f4f6' }}
                      onPress={() => setTempCategory(category)}
                    >
                      <Text style={{
                        color: tempCategory === category ? '#4F46E5' : (isDarkMode ? '#e5e7eb' : '#374151'),
                        fontWeight: tempCategory === category ? 'bold' : 'normal',
                        fontSize: 14
                      }}>
                        {category}
                      </Text>
                      {tempCategory === category && (
                        <Ionicons name="checkmark" size={16} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Orta xətt */}
                <View style={{
                  width: 1,
                  backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
                }} />

                {/* Karyera alt kateqoriyaları */}
                <View style={{ flex: 1, paddingLeft: 8 }}>
                  {categories["Karyera"].map((category, index) => (
                    <TouchableOpacity
                      key={`karyera-${index}`}
                      className="flex-row justify-between items-center py-2 border-b"
                      style={{ borderColor: isDarkMode ? '#374151' : '#f3f4f6' }}
                      onPress={() => setTempCategory(category)}
                    >
                      <Text style={{
                        color: tempCategory === category ? '#4F46E5' : (isDarkMode ? '#e5e7eb' : '#374151'),
                        fontWeight: tempCategory === category ? 'bold' : 'normal',
                        fontSize: 14
                      }}>
                        {category}
                      </Text>
                      {tempCategory === category && (
                        <Ionicons name="checkmark" size={16} color="#4F46E5" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Tətbiq et butonu */}
            <View className="p-4" style={{ borderTopWidth: 1, borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
              <TouchableOpacity
                className="py-4 rounded-lg items-center"
                style={{ backgroundColor: '#4F46E5' }}
                onPress={applyFilter}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>
                  Tətbiq et
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 