// app/home.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { translations, useLanguage } from '../../context/language';
import { useTheme } from '../../context/theme';
import { db } from "../../firebaseConfig";
import { generateEventUrl } from "../../utils/GenerateUrl";
import { useGlobalModal } from "../../utils/GlobalModal";
import EventCard, { PlaceholderEventCard, PlaceholderUpcomingEventCard, UpcomingEventCard } from "../components/EventCard";
const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7; 
const SPACING = width * 0.05;

// AnimatedDot component - hooks kurallarına uygun şekilde tanımlandı
const AnimatedDot = ({ index, scrollX }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING),
      index * (CARD_WIDTH + SPACING),
      (index + 1) * (CARD_WIDTH + SPACING),
    ];

    const dotWidth = interpolate(
      scrollX.value,
      inputRange,
      [8, 16, 8],
      "clamp"
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      "clamp"
    );

    return {
      width: withTiming(dotWidth, { duration: 300 }),
      opacity: withTiming(opacity, { duration: 300 }),
    };
  });

  return (
    <Animated.View
      className="h-2 rounded-full bg-indigo-600 mx-1"
      style={animatedStyle}
    />
  );
};

// Filtreleme fonksiyonu
const isValidEvent = (event) => {
  if (!event) {
    return false;
  }


  if (!event.checkedEvent || event.eventTarget !== "İctimaiyyətə açıq" || event.deActive) {
    return false;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Bugünün başlangıcı
  
  // Etkinlik tarihlerini alalım
  let startDate = null;
  let endDate = null;
  
  try {
    if (event.eventstartdate) startDate = new Date(event.eventstartdate);
    if (event.eventenddate) endDate = new Date(event.eventenddate);
  } catch (error) {
    return false;
  }
  
  // Geçersiz tarih kontrolü
  if (startDate && isNaN(startDate.getTime())) {
    startDate = null;
  }
  if (endDate && isNaN(endDate.getTime())) {
    endDate = null;
  }
  
  // Etkinlik türüne göre farklı kontroller yapılacak
  const eventType = event.eventType || "";
 
  // Sergi, Gönüllülük programı veya Staj programı için bitiş tarihi kontrolü
  if (["Sərgi", "Könüllülük proqramı", "Təcrübə proqramı"].includes(eventType)) {
    if (!endDate || endDate < today) {
      return false;
    }
  } 
  // Diğer etkinlik türleri için başlangıç tarihi kontrolü
  else {
    if (!startDate || startDate < today) {
      if (startDate && 
          startDate.getDate() === today.getDate() && 
          startDate.getMonth() === today.getMonth() && 
          startDate.getFullYear() === today.getFullYear()) {
        const eventTime = event.eventstarttime || "00:00";
        const [hours, minutes] = eventTime.split(":").map(Number);
        
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
       
        if (hours < currentHour || (hours === currentHour && minutes < currentMinute)) {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  
  return true;
};


export default function Home() {
  // Bütün state'leri en üstte tanımlıyoruz
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [upcomingEventsLoading, setUpcomingEventsLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [noMoreEvents, setNoMoreEvents] = useState(false);
  const [totalEventCount, setTotalEventCount] = useState(0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Aktif filtre durumunu izlemek için yeni state
  const [hasActiveUserFilter, setHasActiveUserFilter] = useState(false);
  
  // Theme ve Language context'lerini kullan
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  // expo-router'dan router hook'unu burada tanımlıyoruz
  const router = useRouter();
  
  // GlobalModal hook'unu kullan
  const globalModal = useGlobalModal();
  const {
    selectedRegion,
    setSelectedRegion,
    selectedSort,
    setSelectedSort,
    selectedEventType,
    setSelectedEventType,
    selectedPayment,
    setSelectedPayment,
    selectedDocument,
    setSelectedDocument,
    selectedCategory,
    hasActiveFilters
  } = globalModal;
  
  // sortOrder state'ini selectedSort ile senkronize et
  const [sortOrder, setSortOrder] = useState("");
  
  // Ref'leri state'lerden sonra tanımlıyoruz
  const scrollX = useSharedValue(0);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);
  const scrollViewRef = useRef(null);
  
  useEffect(() => {
    if (selectedSort) {
      setSortOrder(selectedSort);
    } else {
      setSortOrder("");
    }
  }, [selectedSort]);
  
  // Events filtreleme fonksiyonu
  const filterEvents = useCallback((events) => {
    return events.filter((event) => {
      if (!event.checkedEvent || event.eventTarget !== "İctimaiyyətə açıq" || event.deActive !== false) {
        return false;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Etkinlik türüne göre tarih kontrolü
      if (["Sərgi", "Könüllülük proqramı", "Təcrübə proqramı"].includes(event.eventType)) {
        const eventEndDate = new Date(event.eventenddate);
        if (eventEndDate <= now) return false;
      } else {
        const eventDate = new Date(event.eventstartdate);
        let validEvent = false;

        if (eventDate > today) {
          validEvent = true;
        } else if (eventDate.toDateString() === today.toDateString()) {
          const [hours, minutes] = event.eventstarttime.split(':').map(Number);
          const eventDateTime = new Date(today);
          eventDateTime.setHours(hours, minutes, 0, 0);
          if (eventDateTime >= now) validEvent = true;
        }

        if (!validEvent) return false;
      }

      // Arama ve bölge filtreleri
      const matchSearch = event.eventname?.toLowerCase().includes(search.toLowerCase()) ||
                         event.eventtext?.toLowerCase().includes(search.toLowerCase()) ||
                         event.eventRegion?.toLowerCase().includes(search.toLowerCase());
      const matchRegion = selectedRegion === "Bütün bölgələr" || event.eventRegion === selectedRegion;
      const matchEventType = selectedEventType === "Bütün növlər" || event.eventType === selectedEventType;

      // Ödeme ve belge filtrelerini uygula
      const matchPayment = selectedPayment === "Hamısı" || event.payment === selectedPayment;
      const matchDocument = selectedDocument === "Hamısı" || event.eventDocument === selectedDocument;

      // Kateqoriya filtresini uygula
      // Əsas kateqoriyaların alt kateqoriyaları
      const eylenceSubcategories = ["Konsert", "Teatr", "Festival", "Film", "Oyun gecəsi", "Stand-up", "Musiqi", "Rəqs"];
      const karyeraSubcategories = ["Seminar", "Konfrans", "Workshop", "Networking", "Təlim", "Mentorluq", "İş yarmarkası", "Startap"];

      let matchCategory = false;
      const eventCategory = event.eventcategory || event.category;

      if (selectedCategory === "Hamısı") {
        matchCategory = true;
      } else if (selectedCategory === "Əyləncə") {
        // Əyləncə seçildikdə, Əyləncə və ya onun alt kateqoriyalarına uyğun olanları göstər
        matchCategory = eventCategory === "Əyləncə" || eylenceSubcategories.includes(eventCategory);
      } else if (selectedCategory === "Karyera") {
        // Karyera seçildikdə, Karyera və ya onun alt kateqoriyalarına uyğun olanları göstər
        matchCategory = eventCategory === "Karyera" || karyeraSubcategories.includes(eventCategory);
      } else {
        // Alt kateqoriya seçildikdə
        matchCategory = eventCategory === selectedCategory;
      }

      return matchSearch && matchRegion && matchEventType && matchPayment && matchDocument && matchCategory;
    });
  }, [search, selectedRegion, selectedEventType, selectedPayment, selectedDocument, selectedCategory]);

  // Events sıralama fonksiyonu
  const sortEvents = useCallback((events) => {
    // Filtreleme yokken rastgele sırala
    const noFiltersActive = 
      selectedRegion === "Bütün bölgələr" && 
      selectedEventType === "Bütün növlər" && 
      selectedPayment === "Hamısı" && 
      selectedDocument === "Hamısı" &&
      !sortOrder && 
      search === "";
    
    if (noFiltersActive) {
      // Basit rastgele sıralama
      return [...events].sort(() => 0.5 - Math.random());
    }
    
    if (!sortOrder) return events;

    return [...events].sort((a, b) => {
      if (sortOrder === "nearToFar" || sortOrder === "farToNear") {
        const dateA = new Date(a.eventstartdate);
        const dateB = new Date(b.eventstartdate);
        return sortOrder === "nearToFar" ? dateA - dateB : dateB - dateA;
      } else if (sortOrder === "createdAt") {
        const dateA = new Date(a.createdate || 0);
        const dateB = new Date(b.createdate || 0);
        return dateB - dateA; // En yeni oluşturulanlar önce
      }
      return 0;
    });
  }, [sortOrder, selectedRegion, selectedEventType, selectedPayment, selectedDocument, search]);
  
  
  // Yaklaşan etkinlikleri getirme fonksiyonu
  const fetchUpcomingEvents = useCallback(async () => {
    try {
      setUpcomingEventsLoading(true);
      setError(null);
      
      // Tüm aktif etkinlikleri çek
      const eventsQuery = query(
        collection(db, "events"),
        where("deActive", "==", false),
        limit(100) // Daha fazla veri çekip client-side filtreleme yapacağız
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      
      const currentDate = new Date();
      const oneWeekLater = new Date(currentDate);
      oneWeekLater.setDate(oneWeekLater.getDate() + 7);
      
      const events = [];
      
      querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() };
        
        try {
          if (isValidEvent(event)) {
            const eventDate = new Date(event.eventstartdate);
            
            // Bugünden sonra ve bir hafta içinde olan etkinlikleri ekle
            if (eventDate >= currentDate && eventDate <= oneWeekLater) {
              events.push(event);
            }
          }
        } catch (err) {
          console.error("Etkinlik işleme hatası:", event.id, err);
        }
      });
      
      // Tarihe göre sırala (en yakın tarihten en uzak tarihe)
      events.sort((a, b) => {
        const dateA = new Date(a.eventstartdate);
        const dateB = new Date(b.eventstartdate);
        return dateA - dateB;
      });
      

      const upcomingList = events.slice(0, 10);
      
      setUpcomingEvents(upcomingList);
    } catch (error) {
      console.error("❌ Yakın etkinlikler hatası:", error.message);
      setError("Yakın etkinlikler yüklenirken bir sorun oluştu.");
    } finally {
      setUpcomingEventsLoading(false);
    }
  }, []);
  
  // Tüm etkinlikleri getirme fonksiyonu
  const fetchEvents = useCallback(async () => {
    try {
      // Yükleme işlemi başladığında UI'da placeholder'lar gösterilecek
      setLoading(true);
      setError(null);
      setNoMoreEvents(false);
      setLastDoc(null);
      // Mevcut etkinlikleri temizle ki placeholder'lar görünsün
      setFilteredEvents([]);

      // Firebase'den veri çekme
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("eventstartdate")
      );

      const querySnapshot = await getDocs(eventsQuery);

      // Veriler çekildikten sonraki işlemler
      const events = [];
      querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() };
        events.push(event);
      });

      // Tüm etkinlikleri sakla
      setAllEvents(events);
      
      // Etkinliklerin işlenmesi için küçük bir gecikme ekleyerek placeholder'ların görünmesini sağla
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Filtreleme ve sıralama işlemleri
      const filteredEventsList = filterEvents(events);
      let sortedEventsList = sortEvents(filteredEventsList);
      
      // Sıralanmış/filtrelenmiş verileri her zaman rastgele karıştır
      const shuffledEvents = [...sortedEventsList].sort(() => 0.5 - Math.random());
      
      // İlk 20 eventi göster
      setFilteredEvents(shuffledEvents.slice(0, 20));
      
      // Toplam filtrelenmiş etkinlik sayısını ayarla
      setTotalEventCount(filteredEventsList.length);
      
      // Eğer toplam event sayısı 20'den fazlaysa, daha fazla event var demektir
      setNoMoreEvents(filteredEventsList.length <= 20);

    } catch (error) {
      console.error("❌ Tədbirlər xəta:", error.message);
      setError("Etkinlikler yüklenirken bir sorun oluştu.");
    } finally {
      // Tüm işlemler bittikten sonra loading durumunu kaldır
      setLoading(false);
    }
  }, [filterEvents, sortEvents]);
  
  // Daha fazla etkinlik yükleme
  const loadMoreEvents = useCallback(async () => {
    if (loadingMore || noMoreEvents || search.trim() !== "") return;
    
    try {
      setLoadingMore(true);
      
      // Kısa bir gecikme ekleyerek loading ikonunun görünmesini sağlayalım
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mevcut filteredEvents uzunluğunu al
      const currentLength = filteredEvents.length;
      
      // Önce bütün eventleri filtrele ve sırala
      const filteredEventsList = filterEvents(allEvents);
      const sortedEventsList = sortEvents(filteredEventsList);
      
      // Filtreden sonra yeterli event kalmadıysa
      if (currentLength >= filteredEventsList.length) {
        setNoMoreEvents(true);
        return;
      }
      
      // Sıralanmış eventlerden henüz gösterilmemiş olanları
      const remainingEvents = sortedEventsList.filter(
        event => !filteredEvents.some(fe => fe.id === event.id)
      );
      
      // Kalan eventleri karıştır
      const shuffledRemainingEvents = [...remainingEvents].sort(() => 0.5 - Math.random());
      
      // Karıştırılmış eventlerden ilk 20'sini al
      const nextEvents = shuffledRemainingEvents.slice(0, 20);
      
      if (nextEvents.length === 0) {
        setNoMoreEvents(true);
        return;
      }
      
      // Yeni eventleri ekle
      setFilteredEvents(prev => [...prev, ...nextEvents]);
      
      // Eğer tüm filtrelenmiş eventler yüklendiyse noMoreEvents'i true yap
      if (currentLength + nextEvents.length >= filteredEventsList.length) {
        setNoMoreEvents(true);
      }
      
    } catch (error) {
      console.error("❌ Daha çox tədbir xəta:", error.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, noMoreEvents, allEvents, filteredEvents, filterEvents, sortEvents]);
  
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // Scroll olayını izleyen fonksiyon
  const handleMainScroll = useCallback(({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    
    // Scroll pozisyonunu hesapla
    const paddingToBottom = 200; // Alt kısımda daha fazla boşluk bırak
    const isCloseToBottom = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    // Eğer sayfa sonuna yaklaşıldıysa ve yükleme yapılmıyorsa
    if (isCloseToBottom && !loadingMore && !noMoreEvents) {
      loadMoreEvents();
    }
  }, [loadingMore, noMoreEvents, loadMoreEvents]);

  
  // Yenileme fonksiyonu
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSearch(""); // Aramayı sıfırla
    setNoMoreEvents(false); // Event yüklemeyi yeniden etkinleştir
    try {
      // Eğer filtreleme işlemi yoksa, her iki veri tipini de getir
      // Aksi halde sadece ana etkinlikleri getir
      if (!hasActiveUserFilter) {
        await Promise.all([
          fetchUpcomingEvents(),
          fetchEvents()
        ]);
      } else {
        await fetchEvents();
      }
    } catch (error) {
      console.error("Yenileme hatası:", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUpcomingEvents, fetchEvents, hasActiveUserFilter]);
  
  // Filtreleme state'ini güncelleyen fonksiyon
  const updateFilterState = useCallback(() => {
    const isFiltered =
      search.trim() !== "" ||
      selectedRegion !== "Bütün bölgələr" ||
      selectedEventType !== "Bütün növlər" ||
      selectedPayment !== "Hamısı" ||
      selectedDocument !== "Hamısı" ||
      selectedCategory !== "Hamısı" ||
      sortOrder !== "";

    // Filtre durumu değişirse:
    if (isFiltered !== hasActiveUserFilter) {
      // Filtre kaldırıldığında ve yakın etkinlikler gösterilecekse
      if (!isFiltered && hasActiveUserFilter) {
        // Önce placeholder göster, sonra yakın etkinlikleri getir
        setUpcomingEventsLoading(true);
        setUpcomingEvents([]);
        fetchUpcomingEvents();
      }

      // State'i güncelle
      setHasActiveUserFilter(isFiltered);
    }
  }, [search, selectedRegion, selectedEventType, selectedPayment, selectedDocument, selectedCategory, sortOrder, hasActiveUserFilter, fetchUpcomingEvents]);
  
  // Arama işlemi
  const handleSearch = useCallback((text) => {
    setSearch(text);
    // Arama işleminde sadece state'i güncelle, filtreleme useEffect içinde zaten yapılacak
  }, []);
  
  // Filtreleri uygulama ve etkinlikleri yeniden getirme
  useEffect(() => {
    if (allEvents.length > 0) {
      // Filtreleme işlemi başlarken loading'i aktif yap
      setLoading(true);
      
      // Filtrelenmiş etkinlikleri temizle ki, placeholder gösterilsin
      setFilteredEvents([]);
      
      // Etkinliklerin yeniden işlenmesi için küçük bir gecikme ekle
      setTimeout(() => {
        try {
          // Filtreleme ve sıralama işlemleri
          const filteredEventsList = filterEvents(allEvents);
          const sortedEventsList = sortEvents(filteredEventsList);
          
          // Sıralanmış verileri her zaman karıştır
          const shuffledEvents = [...sortedEventsList].sort(() => 0.5 - Math.random());
          
          // Filtrelenmiş etkinlikleri güncelle
          setFilteredEvents(shuffledEvents.slice(0, 20));
          setTotalEventCount(filteredEventsList.length);
          setNoMoreEvents(filteredEventsList.length <= 20);
        } catch (error) {
          console.error("Filtreleme hatası:", error);
        } finally {
          // İşlemler bittikten sonra loading durumunu kaldır
          setLoading(false);
        }
      }, 300); // Filtre uygulanırken placeholderlar görünebilsin
    }
  }, [selectedRegion, selectedEventType, selectedPayment, selectedDocument, selectedCategory, sortOrder, search, allEvents, filterEvents, sortEvents]);
  
  // Veri yüklenmemişse fetchEvents çağır
  useEffect(() => {
    if (allEvents.length > 0) {
      return;
    }

    fetchEvents();
  }, [allEvents.length, fetchEvents]);

  // İlk yükleme
  useEffect(() => {
    // İlk yüklemede bütün verileri sırayla getir
    const loadInitialData = async () => {
      try {
        // Önce ana etkinlikleri getir
        if (allEvents.length === 0) {
          await fetchEvents();
        }

        // Eğer filtre yoksa, ana veriler geldikten sonra yakın etkinlikleri getir
        if (!hasActiveUserFilter) {
          fetchUpcomingEvents();
        } else {
          // Filtre varsa yakın etkinlikleri temizle
          setUpcomingEvents([]);
        }
      } catch (error) {
        console.error("İlk yükleme hatası:", error);
      }
    };

    loadInitialData();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchUpcomingEvents, fetchEvents, hasActiveUserFilter, allEvents.length]);
  
  // Filtrelerin değişimini izle ve filtreleme durumunu güncelle
  useEffect(() => {
    updateFilterState();
  }, [updateFilterState]);
  
  // GlobalModal'dan filtrelerin değişimini de izle
  useEffect(() => {
    updateFilterState();
  }, [selectedRegion, selectedEventType, selectedPayment, selectedDocument, sortOrder, updateFilterState]);
  
  // Auto scroll için ayrı useEffect
  useEffect(() => {
    if (upcomingEvents.length === 0) return;
    
    let currentIndex = 0;
    
    timerRef.current = setInterval(() => {
      if (currentIndex < upcomingEvents.length - 1) {
        currentIndex += 1;
      } else {
        currentIndex = 0;
      }
      
      flatListRef.current?.scrollToIndex({
        index: currentIndex,
        animated: true,
      });
    }, 3000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [upcomingEvents]);
  
  // Event kartına tıklama işlevi
  const handleEventPress = (event) => {
    try {
      router.push({
        pathname: generateEventUrl(event),
       
      });
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Xəta", "Tədbir detallarina keçərkən xəta baş verdi.");
    }
  };

  // Upcoming events slider render
  const renderUpcomingEvents = () => {
    if (upcomingEventsLoading) {
      return (
        <View className="flex-row px-2" style={{ 
          paddingLeft: (width - CARD_WIDTH) / 2 - SPACING / 2, 
          paddingRight: (width - CARD_WIDTH) / 2 - SPACING / 2 
        }}>
          {[...Array(3)].map((_, index) => (
            <View key={index} style={{ 
              width: CARD_WIDTH, 
              marginRight: index < 2 ? SPACING : 0 
            }}>
              <PlaceholderUpcomingEventCard isDarkMode={isDarkMode} />
            </View>
          ))}
        </View>
      );
    }

    if (upcomingEvents.length === 0) {
      return (
        <View className="flex-row items-center justify-center py-8">
          <View className="items-center px-6 w-full">
            <Image 
              source={require("../../assets/notFindSearch.png")} 
              style={{ width: width * 0.7, height: width * 0.7 }}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    return (
      <>
        <Animated.FlatList
          ref={flatListRef}
          data={upcomingEvents}
          keyExtractor={(item) => (item.eventid || item.id).toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + SPACING}
          decelerationRate="fast"
          contentContainerStyle={{ 
            paddingLeft: (width - CARD_WIDTH) / 2 - SPACING / 2, 
            paddingRight: (width - CARD_WIDTH) / 2 - SPACING / 2 
          }}
          style={{ overflow: 'visible' }} 
          getItemLayout={(data, index) => ({
            length: CARD_WIDTH + SPACING,
            offset: (CARD_WIDTH + SPACING) * index,
            index,
          })}
          onScrollToIndexFailed={info => {
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ 
                index: info.index, 
                animated: true 
              });
            });
          }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          renderItem={({ item, index }) => (
            <View style={{ 
              width: CARD_WIDTH, 
              marginRight: SPACING,
              zIndex: index === Math.floor(scrollX.value / (CARD_WIDTH + SPACING)) ? 1 : 0, // Aktif kartı öne getir
            }}>
              <UpcomingEventCard 
                item={item} 
                onPress={handleEventPress}
                isDarkMode={isDarkMode}
              />
            </View>
          )}
        />
        
        {/* Indicator dots */}
        {upcomingEvents.length > 1 && (
          <View className="flex-row justify-center mt-3">
            {upcomingEvents.map((_, index) => (
              <AnimatedDot key={index.toString()} index={index} scrollX={scrollX} />
            ))}
          </View>
        )}
      </>
    );
  };

  // Tüm etkinlikler render
  const renderAllEvents = () => {
    if (loading) {
      // İlk yüklemede veya filtreleme yapılırken placeholder'ları göster (filtre varsa filteredEvents boşaltılmış olabilir)
      return (
        <View className="px-4">
          {[...Array(4)].map((_, index) => (
            <PlaceholderEventCard key={index} isDarkMode={isDarkMode} />
          ))}
        </View>
      );
    }

    if (filteredEvents.length === 0) {
      return (
        <View className="items-center justify-center py-2 px-6">
          <View className="w-full items-center">
            <Image 
              source={require("../../assets/notFindSearch.png")} 
              style={{ width: width * 0.7, height: width * 0.7 }}
              resizeMode="contain"
            />
          </View>
        </View>
      );
    }

    return filteredEvents.map((item, index) => (
      <EventCard 
        key={`${item.eventid || item.id}-${index}`}
        item={item} 
        onPress={handleEventPress}
        isDarkMode={isDarkMode}
      />
    ));
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
     <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
     
  
      
      {/* Üst bölüm - Sabit kalacak */}
      <View className={isDarkMode ? 'w-full bg-gray-900' : 'w-full bg-gray-50'}>
        {/* Search ve Notification bar */}
        <View className="flex-row px-4 py-2 items-center justify-between">
          <View className={`flex-row flex-1 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg px-3 h-12 mr-2 items-center border`}>
            <Ionicons name="search" size={20} color={isDarkMode ? "#9CA3AF" : "#9CA3AF"} />
            <TextInput
              value={search}
              onChangeText={handleSearch}
              placeholder={t.events.search}
              className={`flex-1 ml-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
            />
            {search !== "" && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={20} color={isDarkMode ? "#6B7280" : "#9CA3AF"} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            className={`p-3 h-12 rounded-lg mr-2 border ${
              hasActiveFilters 
                ? 'bg-indigo-600 border-indigo-700' 
                : isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
            }`}
            onPress={globalModal.showModal}
          >
            <Ionicons 
              name="funnel-outline" 
              size={20} 
              color={hasActiveFilters ? "#FFFFFF" : isDarkMode ? "#818CF8" : "#4F46E5"} 
            />
          </TouchableOpacity>
          <TouchableOpacity className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} p-3 h-12 rounded-lg border`}>
            <Ionicons name="notifications-outline" size={20} color={isDarkMode ? "#818CF8" : "#4F46E5"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ana scroll view - Kalan içerik */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4F46E5"]}
            tintColor={isDarkMode ? "#818CF8" : "#4F46E5"}
          />
        }
      >
        {/* Upcoming Events Slider - sadece filtreleme yoksa ve event varsa göster */}
        {!hasActiveUserFilter && (upcomingEventsLoading || upcomingEvents.length > 0) && (
          <View>
            <View className="px-4 mb-2 py-2">
              <Text className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} text-center`}>
                {t.events.upcoming}
              </Text>
            </View>
            
            {renderUpcomingEvents()}
          </View>
        )}
        
        {/* All Events */}
        <View className="my-4">
          <View className="px-4 mt-4 mb-3 flex-row justify-between items-center">
            <Text className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {t.events.all}
            </Text>
            <Text className={`text-sm text-indigo-600`}>
              {totalEventCount} {t.events.title.toLowerCase()}
              {selectedEventType !== "Bütün növlər" ? ` - ${selectedEventType}` : ""}
              {selectedPayment !== "Hamısı" ? ` - ${selectedPayment}` : ""}
              {selectedDocument !== "Hamısı" ? ` - ${selectedDocument}` : ""}
            </Text>
          </View>
          
          {renderAllEvents()}
          
          {loadingMore && !noMoreEvents && (
            <View className="items-center">
              <ActivityIndicator size="large" color={isDarkMode ? "#818CF8" : "#4F46E5"} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Hata mesajı */}
      {error && (
        <View className={`absolute top-0 left-0 right-0 mx-4 my-2 p-2 ${isDarkMode ? 'bg-red-900' : 'bg-red-100'} rounded-lg`}>
          <Text className={`${isDarkMode ? 'text-red-200' : 'text-red-700'} text-sm text-center`}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
