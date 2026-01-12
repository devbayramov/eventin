// app/home.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions, 
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Modal,
  FlatList,
  Alert,
  PanResponder,
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, orderBy, doc, getDoc, deleteDoc, getCountFromServer } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import EventCard, { PlaceholderEventCard } from "../components/EventCard";
import { useGlobalModal } from "../components/GlobalModal";
import { useRouter } from "expo-router";
import { generateEventUrl } from "../components/GenerateUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/theme";
import { useLanguage, translations } from "../../context/language";
import { SafeAreaView } from "react-native-safe-area-context";
const { width } = Dimensions.get("window");

export default function Follows() {
  // State tanımlamaları
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [followedOrganisers, setFollowedOrganisers] = useState([]);
  const [followedOrganisersCount, setFollowedOrganisersCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFollowsModal, setShowFollowsModal] = useState(false);
  const [unfollowingId, setUnfollowingId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Bütün sahələr");
  const [noMoreEvents, setNoMoreEvents] = useState(false);
  const eventsPerPage = 15;
  const [isClosing, setIsClosing] = useState(false);
  
  // Router hook'u
  const router = useRouter();
  
  // GlobalModal hook'u
  const globalModal = useGlobalModal();
  const { 
    selectedRegion, 
    selectedSort, 
    selectedEventType,
    selectedPayment,
    selectedDocument,
    hasActiveFilters 
  } = globalModal;
  
  // Theme ve Language context'lerini kullan
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  
  // Scroll referansı
  const scrollViewRef = useRef(null);
  
  const pan = useRef(new Animated.Value(0)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          setIsClosing(true);
          Animated.timing(pan, {
            toValue: height,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            pan.setValue(0);
            setShowFollowsModal(false);
            setIsClosing(false);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;
  
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
  
  // Kullanıcı bilgisini alma
  const getCurrentUser = useCallback(async () => {
    let user = null;
    
    if (auth.currentUser) {
      user = auth.currentUser;
    } else {
      try {
        const userJSON = await AsyncStorage.getItem('user');
        if (userJSON) {
          const storageUser = JSON.parse(userJSON);
          if (storageUser && storageUser.uid) {
            user = storageUser;
          }
        }
      } catch (err) {
        console.error("AsyncStorage error:", err);
      }
    }
    
    setCurrentUser(user);
    return user;
  }, []);
  
  // Takip edilen organizatörleri getirme
  const fetchFollowedOrganisers = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      
      if (!user || !user.uid) {
        setFollowedOrganisers([]);
        setFollowedOrganisersCount(0);
        return;
      }
      
      const followsRef = collection(db, "users", user.uid, "follows");
      const followsSnapshot = await getDocs(followsRef);
      
      setFollowedOrganisersCount(followsSnapshot.size);
      
      if (followsSnapshot.empty) {
        setFollowedOrganisers([]);
        return;
      }
      
      const organisersPromises = followsSnapshot.docs.map(async (followDoc) => {
        const organiserId = followDoc.id;
        
        const organiserRef = doc(db, "users", organiserId);
        const organiserSnap = await getDoc(organiserRef);
        
        if (organiserSnap.exists()) {
          // Takipçi sayısını getir
          const followersRef = collection(db, "users", organiserId, "followers");
          const followersSnapshot = await getCountFromServer(followersRef);
          
          return {
            id: organiserId,
            ...organiserSnap.data(),
            followersCount: followersSnapshot.data().count
          };
        }
        return null;
      });
      
      const organisers = (await Promise.all(organisersPromises)).filter(Boolean);
      setFollowedOrganisers(organisers);
      
    } catch (error) {
      console.error("İzlənilən təşkilatlar yüklənərkən xəta:", error);
    }
  }, [getCurrentUser]);
  
  // Takip edilen organizatörlerin etkinliklerini getirme
  const fetchFollowedOrganiserEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const user = await getCurrentUser();
      
      if (!user || !user.uid) {
        setEvents([]);
        setFilteredEvents([]);
        setLoading(false);
        return;
      }
      
      const followsRef = collection(db, "users", user.uid, "follows");
      const followsSnapshot = await getDocs(followsRef);
      
      if (followsSnapshot.empty) {
        setEvents([]);
        setFilteredEvents([]);
        setLoading(false);
        return;
      }
      
      const organiserIds = followsSnapshot.docs.map(doc => doc.id);
      
      // Maksimum 10 ID ile sorgu yapalım (Firestore sınırı)
      let allEvents = [];
      
      // Her 10 ID için ayrı sorgu yapalım
      for (let i = 0; i < organiserIds.length; i += 10) {
        const batchIds = organiserIds.slice(i, i + 10);
        
        if (batchIds.length === 0) continue;
        
        try {
          // Tüm organizatörlerin etkinliklerini al
          const eventsRef = collection(db, "events");
          let eventsQuery;
          
          // Tek ID varsa 'in' kullanma - Firestore sorgu optimizasyonu
          if (batchIds.length === 1) {
            eventsQuery = query(
              eventsRef,
              where("eventOwnerId", "==", batchIds[0]),
              orderBy("eventstartdate", "asc")
            );
          } else {
            eventsQuery = query(
              eventsRef,
              where("eventOwnerId", "in", batchIds),
              orderBy("eventstartdate", "asc")
            );
          }
          
          const eventsSnapshot = await getDocs(eventsQuery);
          
          eventsSnapshot.forEach((doc) => {
            const event = { id: doc.id, ...doc.data() };
            
            // Aktif, onaylanmış ve halka açık etkinlikleri filtrele
            if (event.checkedEvent && event.eventTarget === "İctimaiyyətə açıq" && event.deActive === false) {
              // Etkinlik tarihini kontrol et
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              
              // Etkinlik türüne göre tarih kontrolü
              if (["Sərgi", "Könüllülük proqramı", "Təcrübə proqramı"].includes(event.eventType)) {
                const eventEndDate = new Date(event.eventenddate);
                if (eventEndDate > now) {
                  allEvents.push(event);
                }
              } else {
                const eventDate = new Date(event.eventstartdate);
                if (eventDate > today) {
                  allEvents.push(event);
                } else if (eventDate.toDateString() === today.toDateString()) {
                  const [hours, minutes] = event.eventstarttime.split(':').map(Number);
                  const eventDateTime = new Date(today);
                  eventDateTime.setHours(hours, minutes, 0, 0);
                  if (eventDateTime >= now) {
                    allEvents.push(event);
                  }
                }
              }
            }
          });
          
        } catch (batchError) {
          console.error(`Error fetching events for batch ${i/10 + 1}:`, batchError);
        }
      }
      
      setEvents(allEvents);
      applyFilters(allEvents);
      
    } catch (error) {
      console.error("Təşkilat tədbirləri yüklənərkən xəta:", error);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUser]);
  
  // Filtreleme fonksiyonu
  const applyFilters = useCallback((eventsList) => {
    if (!eventsList || eventsList.length === 0) {
      setFilteredEvents([]);
      setVisibleEvents([]);
      setPage(1);
      return;
    }

    let filtered = [...eventsList];
    
    // Arama filtreleme
    if (search) {
      filtered = filtered.filter(event => 
        event.eventname?.toLowerCase().includes(search.toLowerCase()) ||
        event.eventtext?.toLowerCase().includes(search.toLowerCase()) ||
        event.eventRegion?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtreleme yokken rastgele sırala
    const noFiltersActive = 
      selectedRegion === "Bütün bölgələr" && 
      selectedEventType === "Bütün növlər" && 
      selectedPayment === "Hamısı" && 
      selectedDocument === "Hamısı" &&
      selectedCategory === "Bütün sahələr" &&
      !selectedSort && 
      search === "";
    
    if (noFiltersActive) {
      // Basit rastgele sıralama
      filtered = [...eventsList].sort(() => 0.5 - Math.random());
    } else {
      // Kategori, bölge, etkinlik türü, ödeme ve belge filtreleri
      filtered = filtered.filter(event => {
        // Kategori eşleşmesini kontrol et (eventcategory veya category alanlarını kontrol et)
        const matchCategory = selectedCategory === "Bütün sahələr" || 
                              event.eventcategory === selectedCategory || 
                              event.category === selectedCategory;
                              
        const matchRegion = selectedRegion === "Bütün bölgələr" || event.eventRegion === selectedRegion;
        const matchEventType = selectedEventType === "Bütün növlər" || event.eventType === selectedEventType;
        const matchPayment = selectedPayment === "Hamısı" || event.payment === selectedPayment;
        const matchDocument = selectedDocument === "Hamısı" || event.eventDocument === selectedDocument;
        
        return matchCategory && matchRegion && matchEventType && matchPayment && matchDocument;
      });
      
      // Sıralama
      if (selectedSort) {
        filtered.sort((a, b) => {
          if (selectedSort === "nearToFar" || selectedSort === "farToNear") {
            const dateA = new Date(a.eventstartdate);
            const dateB = new Date(b.eventstartdate);
            return selectedSort === "nearToFar" ? dateA - dateB : dateB - dateA;
          } else if (selectedSort === "createdAt") {
            const dateA = new Date(a.createdate || 0);
            const dateB = new Date(b.createdate || 0);
            return dateB - dateA; // En yeni oluşturulanlar önce
          }
          return 0;
        });
      }
    }
    
    setFilteredEvents(filtered);
    setVisibleEvents(filtered.slice(0, eventsPerPage));
    setPage(1);
    setNoMoreEvents(filtered.length <= eventsPerPage);
  }, [search, selectedRegion, selectedEventType, selectedPayment, selectedDocument, selectedSort, selectedCategory]);
  
  // Daha fazla etkinlik yükleme
  const loadMoreEvents = useCallback(async () => {
    if (loadingMore || noMoreEvents) return;
    
    try {
      setLoadingMore(true);
      
      // Kısa bir gecikme ekleyerek loading ikonunun görünmesini sağlayalım
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const nextPage = page + 1;
      const startIndex = (nextPage - 1) * eventsPerPage;
      const endIndex = startIndex + eventsPerPage;
      const newEvents = filteredEvents.slice(startIndex, endIndex);
      
      if (newEvents.length === 0) {
        setNoMoreEvents(true);
        return;
      }
      
      setVisibleEvents(prev => [...prev, ...newEvents]);
      setPage(nextPage);
      
      // Eğer tüm filtrelenmiş eventler yüklendiyse noMoreEvents'i true yap
      if (startIndex + newEvents.length >= filteredEvents.length) {
        setNoMoreEvents(true);
      }
      
    } catch (error) {
      console.error("Daha fazla etkinlik yüklenirken hata:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [page, filteredEvents, loadingMore, noMoreEvents]);
  
  // Scroll olayını izleme
  const handleScroll = useCallback(({ nativeEvent }) => {
    const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
    const paddingToBottom = 200;
    const isCloseToBottom = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
      
    if (isCloseToBottom && !loadingMore && !noMoreEvents) {
      loadMoreEvents();
    }
  }, [loadingMore, noMoreEvents, loadMoreEvents]);
  
  // Takip bırakma işlemi
  const handleUnfollow = async (organiserId) => {
    if (!currentUser || !currentUser.uid) return;
    
    try {
      setUnfollowingId(organiserId);
      
      // Kullanıcının follows koleksiyonundan organizatörü sil
      await deleteDoc(doc(db, 'users', currentUser.uid, 'follows', organiserId));
      
      // Organizatörün followers koleksiyonundan kullanıcıyı sil
      await deleteDoc(doc(db, 'users', organiserId, 'followers', currentUser.uid));
      
      // Yerel state'i güncelle
      setFollowedOrganisers(prev => prev.filter(org => org.id !== organiserId));
      setFollowedOrganisersCount(prev => Math.max(0, prev - 1));
      
      // Etkinlikleri yeniden getir
      fetchFollowedOrganiserEvents();
      
    } catch (error) {
      console.error("İzləmədən çıxma xətası:", error);
      Alert.alert(translations[language]?.errors?.errorTitle || 'Xəta', 
                 translations[language]?.errors?.unfollowError || 'İzləmədən çıxmaq mümkün olmadı');
    } finally {
      setUnfollowingId(null);
    }
  };
  
  // Arama işlemi
  const handleSearch = (text) => {
    setSearch(text);
    applyFilters(events);
  };
  
  // Yenileme işlemi
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchFollowedOrganisers(),
        fetchFollowedOrganiserEvents(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error("Yeniləmə xətası:", error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Event kartına tıklama işlevi
  const handleEventPress = (event) => {
    try {
      router.push({
        pathname: generateEventUrl(event),
      });
    } catch (error) {
      console.error("Navigation xətası:", error);
      Alert.alert(translations[language]?.errors?.errorTitle || "Xəta", 
                 translations[language]?.errors?.navigationError || "Tədbir detallarina keçərkən xəta baş verdi.");
    }
  };
  
  // İlk yükleme
  useEffect(() => {
    const initialize = async () => {
      await Promise.all([
        getCurrentUser(),
        fetchFollowedOrganisers(),
        fetchFollowedOrganiserEvents(),
        fetchCategories()
      ]);
    };
    
    initialize();
  }, []);
  
  // Filtreleri uygulama
  useEffect(() => {
    applyFilters(events);
  }, [events, search, selectedRegion, selectedEventType, selectedPayment, selectedDocument, selectedSort, selectedCategory]);
  
  // Modal'ı açma fonksiyonu
  const openModal = () => {
    setShowFollowsModal(true);
    Animated.spring(pan, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  // Modal'ı kapatma fonksiyonu
  const closeModal = () => {
    setIsClosing(true);
    Animated.timing(pan, {
      toValue: height,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      pan.setValue(0);
      setShowFollowsModal(false);
      setIsClosing(false);
    });
  };
  
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
       <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
      

      <View style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
        {/* Arama ve Filtreler */}
        <View className="flex-row px-4 py-2 items-center justify-between">
          <View className="flex-row flex-1 rounded-lg px-3 h-12 mr-2 items-center border" 
                style={{ 
                  backgroundColor: isDarkMode ? '#1f2937' : 'white',
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
                }}>
            <Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#9CA3AF'} />
            <TextInput
              value={search}
              onChangeText={handleSearch}
              placeholder={translations[language]?.search?.searchEvent || "Tədbir axtar"}
              className="flex-1 ml-2"
              style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#9CA3AF'}
            />
            {search !== "" && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color={isDarkMode ? '#9ca3af' : '#9CA3AF'} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            className={`p-3 h-12 rounded-lg mr-2 border`}
            style={{ 
              backgroundColor: hasActiveFilters ? '#4F46E5' : (isDarkMode ? '#1f2937' : 'white'),
              borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
            }}
            onPress={globalModal.showModal}
          >
            <Ionicons 
              name="funnel-outline" 
              size={20} 
              color={hasActiveFilters ? "#FFFFFF" : (isDarkMode ? '#e5e7eb' : '#4F46E5')} 
            />
          </TouchableOpacity>
        </View>

        {/* Kategoriler */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-2">
          <View className="mr-2">
            <TouchableOpacity 
              className={`px-4 py-2 rounded-full border`}
              style={{
                backgroundColor: selectedCategory === "Bütün sahələr" 
                  ? '#4F46E5' 
                  : (isDarkMode ? '#1f2937' : 'white'),
                borderColor: selectedCategory === "Bütün sahələr"
                  ? '#4F46E5'
                  : (isDarkMode ? '#374151' : '#e5e7eb')
              }}
              onPress={() => setSelectedCategory("Bütün sahələr")}
            >
              <Text style={{ 
                color: selectedCategory === "Bütün sahələr" 
                  ? '#ffffff' 
                  : (isDarkMode ? '#e5e7eb' : '#374151') 
              }}>
                {translations[language]?.categories?.allCategories || "Bütün sahələr"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {categories.map((category, index) => (
            <View   
            key={category} 
            className={`${index === categories.length - 1 ? 'mr-4' : 'mr-2'}`}
          >
              <TouchableOpacity 
                className={`px-4 py-2 rounded-full border`}
                style={{
                  backgroundColor: selectedCategory === category 
                    ? '#4F46E5' 
                    : (isDarkMode ? '#1f2937' : 'white'),
                  borderColor: selectedCategory === category
                    ? '#4F46E5'
                    : (isDarkMode ? '#374151' : '#e5e7eb')
                }}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={{ 
                  color: selectedCategory === category 
                    ? '#ffffff' 
                    : (isDarkMode ? '#e5e7eb' : '#374151') 
                }}>
                  {category}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
      
      {/* Başlık - Ortada */}
      <View className="py-2 items-center justify-center" style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
        <TouchableOpacity 
          className="flex-row items-center" 
          onPress={openModal}
        >
          <Text className="text-xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
            {translations[language]?.organisers?.followedOrganisers || "İzlədiyim təşkilatlar"} ({followedOrganisersCount})
          </Text>
          <Ionicons name="chevron-down" size={20} color="#4F46E5" style={{ marginLeft: 5 }} />
        </TouchableOpacity>
      </View>
      
      {/* Etkinlik Listesi */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
        }
        onScroll={handleScroll}
        contentContainerStyle={{ paddingBottom: 60 }}
        scrollEventThrottle={16}
      >
        {loading ? (
          <View className="px-4 py-4">
            {[...Array(4)].map((_, index) => (
              <PlaceholderEventCard key={index} isDarkMode={isDarkMode} />
            ))}
          </View>
        ) : visibleEvents.length === 0 ? (
          <View className="items-center justify-center py-2 px-6 ">
          <View className="w-full items-center">
            <Image 
              source={require("../../assets/notFindSearch.png")} 
              style={{ width: width * 0.9, height: width * 0.7 }}
              resizeMode="contain"
            />
              <Text className="text-center mt-4" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                {followedOrganisersCount === 0 && (translations[language]?.organisers?.noOrganisersFollowed || "Heç bir təşkilatı izləmirsiniz. İzlədiyiniz təşkilatların tədbirləri burada görünəcək.")}
                  
              </Text>
          </View>
          </View>
        ) : (
          <View className="pt-2">
            {visibleEvents.map((item, index) => (
              <EventCard 
                key={`${item.eventid || item.id}-${index}`}
                item={item} 
                onPress={() => handleEventPress(item)}
                isDarkMode={isDarkMode}
              />
            ))}
            {loadingMore && !noMoreEvents && (
              <View className="py-4 items-center">
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* İzlenen Teşkilatlar Modal */}
      <Modal
        visible={showFollowsModal && !isClosing}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          className="flex-1 bg-black/50 justify-end"
          onPress={closeModal}
        >
          <Animated.View 
            {...panResponder.panHandlers}
            style={[
              {
                transform: [{ translateY: pan }],
                opacity: pan.interpolate({
                  inputRange: [0, height],
                  outputRange: [1, 0.5],
                }),
              },
            ]}
          >
            <View 
              className="rounded-t-3xl p-4"
              style={{ 
                maxHeight: height * 0.7,
                backgroundColor: isDarkMode ? '#1f2937' : 'white'
              }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold" style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                  {translations[language]?.organisers?.followedOrganisers || "İzlədiyim təşkilatlar"} ({followedOrganisersCount})
                </Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color={isDarkMode ? '#9ca3af' : '#6B7280'} />
                </TouchableOpacity>
              </View>
              
              {followedOrganisers.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-center" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                    {translations[language]?.organisers?.noOrganisersFollowed || "Heç bir təşkilatı izləmirsiniz."}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={followedOrganisers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View className="flex-row justify-between items-center py-3 border-b" 
                          style={{ borderColor: isDarkMode ? '#374151' : '#f3f4f6' }}>
                      <View className="flex-row items-center flex-1">
                        <Image 
                          source={{ uri: item.logoURL || 'https://via.placeholder.com/40' }} 
                          className="w-10 h-10 rounded-full bg-gray-200"
                        />
                        <View className="ml-3 flex-1">
                          <Text className="font-semibold" 
                                style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }} 
                                numberOfLines={1}>
                            {item.companyName || translations[language]?.organisers?.organisation || 'Təşkilat'}
                          </Text>
                          <Text className="text-xs" style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                            {item.followersCount || 0} {translations[language]?.organisers?.followers || 'izləyici'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: isDarkMode ? '#ef444422' : '#fef2f2' }}
                        onPress={() => handleUnfollow(item.id)}
                        disabled={unfollowingId === item.id}
                      >
                        {unfollowingId === item.id ? (
                          <ActivityIndicator size="small" color="#4F46E5" />
                        ) : (
                          <Text style={{ color: '#ef4444', fontWeight: '500' }}>
                            {translations[language]?.organisers?.unfollow || "İzləmədən çıx"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const height = Dimensions.get('window').height;
