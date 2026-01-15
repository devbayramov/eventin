
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { TabBar, TabView } from 'react-native-tab-view';
import { translations, useLanguage } from '../../context/language';
import { useTheme } from '../../context/theme';
import { auth, db } from '../../firebaseConfig';
import { generateEventUrl } from '../../utils/GenerateUrl';
import EventCard, { PlaceholderEventCard } from '../components/EventCard';
const { width } = Dimensions.get('window');


export default function OrganiserDetails() {
  const layout = useWindowDimensions();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [organiser, setOrganiser] = useState(null);
  const [activeEvents, setActiveEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [showFollowOptions, setShowFollowOptions] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const scrollViewRef = useRef(null);
  const pathname = usePathname();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();

  // TabView için state
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'active', title: translations[language]?.organisers?.activeEvents || 'Aktiv Tədbirlər' },
    { key: 'past', title: translations[language]?.organisers?.pastEvents || 'Uğurlu Tədbirlər' },
  ]);
  
  // Pagination için state'ler
  const [visibleActiveEvents, setVisibleActiveEvents] = useState([]);
  const [visiblePastEvents, setVisiblePastEvents] = useState([]);
  const [activeEventsPage, setActiveEventsPage] = useState(1);
  const [pastEventsPage, setPastEventsPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const eventsPerPage = 15;
  
  // FlatList referansları
  const activeEventsListRef = useRef(null);
  const pastEventsListRef = useRef(null);
  
  // FlatList'ler için son pozisyonu hatırlamak için ref'ler
  const activeScrollY = useRef(0);
  const pastScrollY = useRef(0);
  const isLoadingRef = useRef(false);
  



// BackHandler'ı güncelleyin
useEffect(() => {
  const backAction = () => {
    try {    
      router.back();
    
    } catch (error) {
      router.navigate('/(tabs)/organiser');
    }
    return true;
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction
  );

  return () => backHandler.remove();
}, [router]);
  
  // EventCard tıklama işlevi
  const handleEventPress = useCallback((event) => {
    router.navigate({
      pathname: generateEventUrl(event),
     
    });
  }, [router]);
  
  // Debug için
  useEffect(() => {
    const checkCurrentUser = async () => {
      // Kullanıcı kimliğini al
      let user = null;
            
      if (auth.currentUser) {
        user = auth.currentUser;
      } else {
        // Auth'da kullanıcı yoksa AsyncStorage'ı kontrol et
        try {
          const userJSON = await AsyncStorage.getItem('user');
          if (userJSON) {
            const storageUser = JSON.parse(userJSON);
            if (storageUser && storageUser.uid) {
              user = storageUser;
            }
          }
        } catch (err) {
          console.error("AsyncStorage error in organiserDetails:", err);
        }
      }
      
      setCurrentUser(user);
      
      // Eğer kullanıcı girişi yapmışsa, takip durumunu kontrol et
      if (user && id) {
        checkFollowStatus(user.uid, id);
      }
    };
    
    checkCurrentUser();
  }, [id]);

  // Takip durumunu kontrol et
  const checkFollowStatus = async (userId, organiserId) => {
    try {
      const followRef = doc(db, 'users', organiserId, 'followers', userId);
      const followDoc = await getDoc(followRef);
      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.error("Takip durumu kontrol edilirken hata:", error);
      setIsFollowing(false);
    }
  };

  // TEST VERİSİ - Eğer Firebase bağlantısı sorunluysa
  const testOrganiser = {
    id: id,
    companyName: "Təşkilatçı yoxdur",
    about: "Təşkilatçı yoxdur",
    email: "test@example.com",
    logoURL: "https://via.placeholder.com/100"
  };

  // Organizatör məlumatlarını getir
  const fetchOrganiser = useCallback(async () => {
    try {
      // Önce direkt document id ile deneme
      const organiserRef = doc(db, 'users', id);
      const organiserSnap = await getDoc(organiserRef);
      
      if (organiserSnap.exists()) {
        const data = organiserSnap.data();
        setOrganiser({...data, id: id});
        
        // Takipçi sayısını getir
        const followersRef = collection(db, 'users', id, 'followers');
        const followersSnapshot = await getDocs(followersRef);
        setFollowersCount(followersSnapshot.size);
      } else {
        // Document ID ile bulunamadıysa, id alanına göre sorgula
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('id', '==', id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          const userId = querySnapshot.docs[0].id;
          setOrganiser({...data, id: userId});
          
          // Takipçi sayısını getir
          const followersRef = collection(db, 'users', userId, 'followers');
          const followersSnapshot = await getDocs(followersRef);
          setFollowersCount(followersSnapshot.size);
        } else {
          Alert.alert(translations[language]?.errors?.errorTitle || 'Xəta', 
            translations[language]?.organisers?.notFound || 'Təşkilatçı məlumatları tapılmadı');
          router.navigate('/(tabs)/organiser');
        }
      }
    } catch (error) {
      console.error('[organiserDetails] Organizatör verileri alınırken hata:', error);
      Alert.alert(translations[language]?.errors?.errorTitle || 'Xəta', 
        translations[language]?.organisers?.navigationError || 'Təşkilatçı məlumatları yüklənərkən xəta yarandı');
      router.navigate('/(tabs)/organiser');
    }
  }, [id, router, language]);

  // Tədbirləri getir
  const fetchEvents = useCallback(async () => {
    try {
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('createdBy', '==', id));
      const querySnapshot = await getDocs(q);
      
      const eventsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      return eventsList;
    } catch (error) {
      console.error('[organiserDetails] Etkinlik verileri alınırken hata:', error);
      Alert.alert('Xəta', 'Tədbirlər yüklənərkən xəta yarandı');
      return [];
    }
  }, [id, language]);

  // Tarih karşılaştırma yardımcı fonksiyonu
  const compareDates = useCallback((dateA, dateB) => {
    try {
      const a = new Date(dateA);
      const b = new Date(dateB);
      return a - b;
    } catch (error) {
      console.error('Tarih karşılaştırma hatası:', error);
      return 0;
    }
  }, []);

  // Daha fazla etkinlik yükleme fonksiyonu
  const loadMoreEvents = useCallback(async () => {
    if (isLoadingRef.current) return;
    
    try {
      setLoadingMore(true);
      isLoadingRef.current = true;
      
      // Biraz bekle (loading ikonunu göstermek için)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Scroll pozisyonunu kaydet
      let currentScrollY = index === 0 ? activeScrollY.current : pastScrollY.current;
      
      if (index === 0) { // Aktif tab
        if (visibleActiveEvents.length >= activeEvents.length) {
          setLoadingMore(false);
          isLoadingRef.current = false;
          return;
        }
        
        const nextPage = activeEventsPage + 1;
        const startIndex = (nextPage - 1) * eventsPerPage;
        const endIndex = startIndex + eventsPerPage;
        const newItems = activeEvents.slice(startIndex, endIndex);
        
        if (newItems.length === 0) {
          setLoadingMore(false);
          isLoadingRef.current = false;
          return;
        }
        
        setVisibleActiveEvents(prev => [...prev, ...newItems]);
        setActiveEventsPage(nextPage);
        
        // Pozisyonu koru
        if (activeEventsListRef.current) {
          activeEventsListRef.current.scrollTo({ y: currentScrollY, animated: false });
        }
      } else { // Past tab
        if (visiblePastEvents.length >= pastEvents.length) {
          setLoadingMore(false);
          isLoadingRef.current = false;
          return;
        }
        
        const nextPage = pastEventsPage + 1;
        const startIndex = (nextPage - 1) * eventsPerPage;
        const endIndex = startIndex + eventsPerPage;
        const newItems = pastEvents.slice(startIndex, endIndex);
        
        if (newItems.length === 0) {
          setLoadingMore(false);
          isLoadingRef.current = false;
          return;
        }
        
        setVisiblePastEvents(prev => [...prev, ...newItems]);
        setPastEventsPage(nextPage);
        
        // Pozisyonu koru
        if (pastEventsListRef.current) {
          pastEventsListRef.current.scrollTo({ y: currentScrollY, animated: false });
        }
      }
    } catch (error) {
      console.error('Daha fazla etkinlik yüklenirken hata:', error);
      Alert.alert(translations[language]?.errors?.errorTitle || 'Xəta', 
        translations[language]?.errors?.networkError || 'Daha çox tədbir yüklənərkən xəta yarandı');
    } finally {
      // Yükleme işlemi tamamlandı
      setTimeout(() => {
        setLoadingMore(false);
        isLoadingRef.current = false;
      }, 200);
    }
  }, [index, activeEvents, pastEvents, visibleActiveEvents.length, visiblePastEvents.length, activeEventsPage, pastEventsPage, eventsPerPage, language]);

  // Scroll olayını izleyen fonksiyon
  const handleScroll = useCallback(({ nativeEvent }) => {
    const { contentOffset, layoutMeasurement, contentSize } = nativeEvent;
    
    // Scroll pozisyonunu kaydet
    if (index === 0) {
      activeScrollY.current = contentOffset.y;
      
      // Sayfa sonuna gelince daha fazla yükle
      const paddingToBottom = 200; // Daha erken başlamak için değeri artırıyoruz
      const isCloseToBottom = 
        layoutMeasurement.height + contentOffset.y >= 
        contentSize.height - paddingToBottom;
        
      if (isCloseToBottom && !loadingMore && !loading && visibleActiveEvents.length < activeEvents.length) {
        loadMoreEvents();
      }
    } else {
      pastScrollY.current = contentOffset.y;
      
      // Sayfa sonuna gelince daha fazla yükle
      const paddingToBottom = 200; // Daha erken başlamak için değeri artırıyoruz
      const isCloseToBottom = 
        layoutMeasurement.height + contentOffset.y >= 
        contentSize.height - paddingToBottom;
        
      if (isCloseToBottom && !loadingMore && !loading && visiblePastEvents.length < pastEvents.length) {
        loadMoreEvents();
      }
    }
  }, [index, loadingMore, loading, loadMoreEvents, visibleActiveEvents.length, activeEvents.length, visiblePastEvents.length, pastEvents.length]);

  useEffect(() => {
    if (id) {
      const loadData = async () => {
        await fetchOrganiser();
        setLoading(true); // Sadece etkinlikler yüklenirken loading durumunu aktif et
        const events = await fetchEvents();
        
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Aktif etkinlikleri filtrele
        const active = events.filter(event => {
          if (!event.checkedEvent || event.eventTarget !== "İctimaiyyətə açıq") return false;
          
          let eventEnd;
          eventEnd = new Date(event.eventenddate);
          
          if (eventEnd.toDateString() === today.toDateString()) {
            const [hours, minutes] = event.eventstarttime ? event.eventstarttime.split(':').map(Number) : [0, 0];
            eventEnd.setHours(hours, minutes, 0, 0);
          }
          
          return eventEnd >= now;
        });
        
        // Bitmiş etkinlikleri filtrele
        const finished = events.filter(event => {
          if (!event.checkedEvent || event.eventTarget !== "İctimaiyyətə açıq") return false;
          
          let eventEnd;
          eventEnd = new Date(event.eventenddate);
          
          if (eventEnd.toDateString() === today.toDateString()) {
            const [hours, minutes] = event.eventstarttime ? event.eventstarttime.split(':').map(Number) : [0, 0];
            eventEnd.setHours(hours, minutes, 0, 0);
          }
          
          return eventEnd < now;
        });
        
        
        // Aktif etkinlikleri tarihe göre sırala (en yakın tarih ilk önce)
        const sortedActive = active.sort((a, b) => {
          const dateA = new Date(a.eventstartdate);
          const dateB = new Date(b.eventstartdate);
          return dateA - dateB;
        });
        
        // Bitmiş etkinlikleri tarihe göre sırala (en son biten ilk önce)
        const sortedFinished = finished.sort((a, b) => {
          const dateA = new Date(a.eventenddate);
          const dateB = new Date(b.eventenddate);
          return dateB - dateA;
        });
        
        setActiveEvents(sortedActive);
        setPastEvents(sortedFinished);
        
        // İlk sayfaları ayarla
        setVisibleActiveEvents(sortedActive.slice(0, eventsPerPage));
        setVisiblePastEvents(sortedFinished.slice(0, eventsPerPage));
        
        setLoading(false);
      };
      
      loadData();
    } else {
      console.error("[organiserDetails] ID parametresi eksik");
      setLoading(false);
      // ID yoksa test verisi kullan
      setOrganiser(testOrganiser);
    }
  }, [fetchOrganiser, fetchEvents, id]);
  
  // TabView ile sekme değişimi
  useEffect(() => {
    // Sekme değişiminde yükleme işlemlerini sıfırla
    isLoadingRef.current = false;
    setLoadingMore(false);
  }, [index]);
  
  // Organizatör bilgisi ve sosyal medya komponenti
  const OrganiserInfoComponent = () => (
    <View style={{padding: 10}}>
      {/* Hakkında bölümü */}
      <View style={{marginBottom: 8}}>
        <Text style={{color: isDarkMode ? '#d1d5db' : '#4b5563'}}>
          {organiser?.about || translations[language]?.organisers?.noInfo || 'Haqqında məlumat yoxdur'}
        </Text>
      </View>

      {/* Sosyal medya bölümü */}
      <View style={{
        flexDirection: 'row', 
        gap: 8, 
        marginBottom: 12,
        paddingBottom: 10, 
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
      }}>
        {/* Share butonu */}
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-social-outline" size={24} color="#6366f1" />
        </TouchableOpacity>
        
        {organiser?.instagram && (
          <TouchableOpacity onPress={() => Linking.openURL(organiser.instagram)}>
            <Ionicons name="logo-instagram" size={24} color="#E1306C" />
          </TouchableOpacity>
        )}
        {organiser?.facebook && (
          <TouchableOpacity onPress={() => Linking.openURL(organiser.facebook)}>
            <Ionicons name="logo-facebook" size={24} color="#4267B2" />
          </TouchableOpacity>
        )}
        {organiser?.linkedin && (
          <TouchableOpacity onPress={() => Linking.openURL(organiser.linkedin)}>
            <Ionicons name="logo-linkedin" size={24} color="#0077b5" />
          </TouchableOpacity>
        )}
        {organiser?.email && (
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${organiser.email}`)}>
            <Ionicons name="mail-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Farklı Route Bileşenleri - Tab İçeriği
  const renderActiveRoute = (props) => (
    <ScrollView
      ref={activeEventsListRef}
      contentContainerStyle={{padding: 8}}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      style={{backgroundColor: isDarkMode ? '#111827' : 'white'}}
    >
      <OrganiserInfoComponent />
      
      {loading ? (
        <>
          {[1, 2, 3].map((item) => (
            <PlaceholderEventCard key={`placeholder-active-${item}`} isDarkMode={isDarkMode} />
          ))}
        </>
      ) : visibleActiveEvents.length === 0 ? (
       
            <View className="w-full h-full items-center justify-center py-2 px-6 ">
              <View className="w-full items-center">
                <Image 
                  source={require("../../assets/activeEventsNotFind.png")} 
                  style={{ width: width * 0.7, height: width * 0.7 }}
                  resizeMode="contain"
                />
              </View>
            </View>
     
      ) : (
        <>
          {visibleActiveEvents.map((item, index) => (
            <View key={`active-${item.id}-${index}`} style={{ marginBottom: 16 }}>
              <EventCard item={item} onPress={() => handleEventPress(item)} isDarkMode={isDarkMode} />
            </View>
          ))}
          
          {visibleActiveEvents.length < activeEvents.length && (
            <View style={{padding: 10, alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#4F46E5" />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderPastRoute = (props) => (
    <ScrollView
      ref={pastEventsListRef}
      contentContainerStyle={{padding: 8}}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      style={{backgroundColor: isDarkMode ? '#111827' : 'white'}}
    >
      <OrganiserInfoComponent />
      
      {loading ? (
        <>
          {[1, 2, 3].map((item) => (
            <PlaceholderEventCard key={`placeholder-past-${item}`} isDarkMode={isDarkMode} />
          ))}
        </>
      ) : visiblePastEvents.length === 0 ? (
        <View className="w-full h-full items-center justify-center py-2 px-6 ">
        <View className="w-full items-center">
          <Image 
            source={require("../../assets/endEventsNotFind.png")} 
            style={{ width: width * 0.7, height: width * 0.7,  }}
            resizeMode="contain"
          />
        </View>
      </View>
      ) : (
        <>
          {visiblePastEvents.map((item, index) => (
            <View key={`past-${item.id}-${index}`} style={{ marginBottom: 16 }}>
              <EventCard item={item} onPress={() => handleEventPress(item)} isDarkMode={isDarkMode} />
            </View>
          ))}
          
          {visiblePastEvents.length < pastEvents.length && (
            <View style={{padding: 10, alignItems: 'center'}}>
              <ActivityIndicator size="large" color="#4F46E5" />
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
  
  // TabView için scene map ve render scene
  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'active':
        return renderActiveRoute();
      case 'past':
        return renderPastRoute();
      default:
        return null;
    }
  };
  
  // Custom TabBar
  const renderTabBar = props => (
    <TabBar
      {...props}
      indicatorStyle={{ 
        backgroundColor: '#6366f1',
        height: 3,
        width: '40%',
        marginLeft: '5%',
      }}
      style={{ 
        backgroundColor: isDarkMode ? '#111827' : 'white',
        shadowColor: 'transparent',
        elevation: 0,
        borderBottomWidth: 1, 
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb' 
      }}
      pressColor="transparent"
      pressOpacity={1}
      tabStyle={{ height: 48 }}
      labelStyle={{ 
        color: isDarkMode ? '#d1d5db' : '#6b7280', 
        fontWeight: '500',
        textTransform: 'none',
        fontSize: 14,
      }}
      activeColor="#6366f1"
      inactiveColor={isDarkMode ? '#d1d5db' : '#6b7280'}
      renderLabel={({ route, focused, color }) => (
        <Text style={{ 
          color, 
          fontWeight: focused ? 'bold' : '500',
          fontSize: 14,
        }}>
          {route.title} {route.key === 'active' ? 
            (activeEvents.length > 0 ? `(${activeEvents.length})` : '') : 
            (pastEvents.length > 0 ? `(${pastEvents.length})` : '')}
        </Text>
      )}
      indicatorContainerStyle={{ zIndex: 2 }}
    />
  );

  // Organizatörü paylaş
  const handleShare = async () => {
    try {
      const organiserUrl = `https://eventin.az/organisers/${id}`;
      await Share.share({
        message: `Eventin | ${organiser?.companyName} ${translations[language]?.organisers?.shareMessage || 'adlı təşkilatçını izləyin yeni tədbirlərdən xəbərdar olun!'} ${organiserUrl}`,
        url: organiserUrl,
        title: organiser?.companyName
      });
    } catch (error) {
      Alert.alert(translations[language]?.errors?.errorTitle || 'Xəta', 
        translations[language]?.errors?.shareError || 'Təşkilatçı paylaşılarkən xəta baş verdi.');
    }
  };

  // Takip et/bırak
  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert(
        translations[language]?.general?.login || 'Giriş',
        translations[language]?.organisers?.loginToFollow || 'Bu təşkilatçını izləmək üçün giriş etməlisiniz.',
        [
          { text: translations[language]?.general?.cancel || 'Vazgeç', style: 'cancel' },
          { text: translations[language]?.general?.login || 'Giriş yap', onPress: () => router.push('/login') }
        ]
      );
      return;
    }

    if (isFollowing) {
      // Popup menüyü göster
      setShowFollowOptions(true);
    } else {
      // Takip et
      try {
        // Organizatörün followers koleksiyonuna kullanıcıyı ekle
        await setDoc(doc(db, 'users', id, 'followers', currentUser.uid), {
          userId: currentUser.uid,
          followedAt: new Date()
        });
        
        // Kullanıcının follows koleksiyonuna organizatörü ekle
        await setDoc(doc(db, 'users', currentUser.uid, 'follows', id), {
          organiserId: id,
          followedAt: new Date()
        });
        
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      } catch (error) {
        console.error("Takip hatası:", error);
        Alert.alert('Hata', 'İzləmək prosesində bir xəta baş verdi.');
      }
    }
  };

  // Takibi bırak
  const handleUnfollow = async () => {
    if (!currentUser) return;
    
    try {
      // Organizatörün followers koleksiyonundan kullanıcıyı sil
      await deleteDoc(doc(db, 'users', id, 'followers', currentUser.uid));
      
      // Kullanıcının follows koleksiyonundan organizatörü sil
      await deleteDoc(doc(db, 'users', currentUser.uid, 'follows', id));
      
      setIsFollowing(false);
      setFollowersCount(prev => Math.max(0, prev - 1));
      setShowFollowOptions(false);
    } catch (error) {
      console.error("Takibi bırakma hatası:", error);
      Alert.alert(translations[language]?.errors?.errorTitle || 'Xəta', 
                 translations[language]?.errors?.unfollowError || 'İzləməkdən imtina prosesində bir xəta baş verdi.');
    }
  };

  // Tab değişim fonksiyonu
  const handleTabChange = (newIndex) => {
    setIndex(newIndex);
    setActiveTab(newIndex === 0 ? 'active' : 'past');
  };

  // Back button'a basınca gerçekleşecek işlem
  const handleBackPress = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={{flex: 1, backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>

        {/* Header with placeholder */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
        }}>
          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
            <TouchableOpacity onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
            </TouchableOpacity>
            <View style={{
              width: 48, 
              height: 48, 
              borderRadius: 24, 
              marginLeft: 16,
              backgroundColor: isDarkMode ? '#374151' : '#e5e7eb'
            }} />
            <View style={{marginLeft: 12, flex: 1}}>
              <View style={{
                height: 20, 
                width: 150, 
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', 
                borderRadius: 4,
                marginBottom: 4
              }} />
              <View style={{
                height: 16, 
                width: 80, 
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', 
                borderRadius: 4
              }} />
            </View>
          </View>
          <View style={{
            width: 80,
            height: 36,
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
            borderRadius: 8
          }} />
        </View>
        
        <View style={{flex: 1, padding: 16}}>
          {/* About placeholder */}
          <View style={{
            height: 20, 
            width: 120, 
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', 
            borderRadius: 4,
            marginBottom: 12
          }} />
          <View style={{
            height: 16, 
            width: '100%', 
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', 
            borderRadius: 4,
            marginBottom: 8
          }} />
          <View style={{
            height: 16, 
            width: '90%', 
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', 
            borderRadius: 4,
            marginBottom: 8
          }} />
          <View style={{
            height: 16, 
            width: '80%', 
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb', 
            borderRadius: 4,
            marginBottom: 20
          }} />
          
          {/* Placeholder Event Cards */}
          {[1, 2, 3, 4, 5].map((item) => (
            <PlaceholderEventCard key={`placeholder-${item}`} isDarkMode={isDarkMode} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: isDarkMode ? '#111827' : 'white'}}>
    <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />

      
   
      <Stack.Screen 
        options={{
          animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
          presentation: 'card',
          animationDuration: 200,
          gestureDirection: 'horizontal',
          gestureEnabled: false
        }}
      />
      
      {/* Sabit Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
      }}>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
          <TouchableOpacity onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Image
            source={{ uri: organiser?.logoURL || 'https://via.placeholder.com/50' }}
            style={{width: 48, height: 48, borderRadius: 24, marginLeft: 16}}
          />
          <View style={{marginLeft: 12, flex: 1}}>
            <Text 
              style={{
                fontSize: 18, 
                fontWeight: 'bold',
                flexWrap: 'wrap',
                color: isDarkMode ? '#fff' : '#000'
              }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {organiser?.companyName || translations[language]?.organisers?.unnamed || 'İsimsiz Organizatör'}
            </Text>
            <Text style={{color: isDarkMode ? '#9ca3af' : '#6b7280'}}>
              {followersCount} {translations[language]?.organisers?.followers || 'izləyici'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (isFollowing) {
              setShowFollowOptions(true);
            } else {
              handleFollow();
            }
          }}
          disabled={loading}
          style={{
            paddingVertical: 10,
            backgroundColor: isFollowing ? '#22C55E' : '#6366F1',
            borderRadius: 8,
            alignItems: 'center',
            marginBottom: 5,
            opacity: loading ? 0.7 : 1,
            width: 80
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 14
            }}>
              {isFollowing ? 
                translations[language]?.organisers?.following || 'İzlənir' : 
                translations[language]?.organisers?.follow || 'İzlə'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* TabView ile Tab İçeriği */}
      <View style={{ flex: 1 }}>
        <TabView
          navigationState={{ index, routes }}
          renderScene={renderScene}
          onIndexChange={handleTabChange}
          initialLayout={{ width: layout.width }}
          renderTabBar={renderTabBar}
          swipeEnabled={true}
          lazy={true}
          lazyPreloadDistance={1}
        />
      </View>
      
      {/* Takip Seçenekleri Popup */}
      <Modal
        visible={showFollowOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFollowOptions(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          activeOpacity={1}
          onPress={() => setShowFollowOptions(false)}
        >
          <View style={{
            width: width * 0.8,
            backgroundColor: isDarkMode ? '#1f2937' : 'white',
            borderRadius: 12,
            overflow: 'hidden',
            padding: 20,
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: isDarkMode ? '#fff' : '#333',
              marginBottom: 20,
              textAlign: 'center'
            }}>
              {translations[language]?.organisers?.unfollowConfirm || 'Təşkilatçını izləməkdən çıxmaq istədiyinizə əminsiniz?'}
            </Text>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '100%'
            }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginHorizontal: 5,
                  backgroundColor: '#10B981'
                }}
                onPress={handleUnfollow}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 16
                }}>
                  {translations[language]?.general?.confirm || 'Təsdiqlə'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginHorizontal: 5,
                  backgroundColor: '#EF4444'
                }}
                onPress={() => setShowFollowOptions(false)}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: 16
                }}>
                  {translations[language]?.profile?.close || 'Bağla'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
} 