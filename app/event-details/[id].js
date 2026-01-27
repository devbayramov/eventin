import { Ionicons } from "@expo/vector-icons";
import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, orderBy, query, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Clipboard,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from "date-fns";
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { translations, useLanguage } from '../../context/language';
import { useTheme as useAppTheme } from '../../context/theme';
import { auth, db } from "../../firebaseConfig";
import { generateEventUrl } from '../../utils/GenerateUrl';
import { UpcomingEventCard } from "../components/EventCard";
import RegisterModal from "../components/RegisterModal";
const { width } = Dimensions.get('window');



const EventDetailsPlaceholder = () => {
  const { isDarkMode } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row justify-between items-center px-4 bg-transparent absolute z-20 left-0 right-0" style={{ top: insets.top + 8 }}>
        <TouchableOpacity className={`p-2 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} rounded-full`}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#fff" : "#333"} />
        </TouchableOpacity>
        
        <TouchableOpacity className={`p-2 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} rounded-full`}>
          <Ionicons name="share-social-outline" size={24} color={isDarkMode ? "#fff" : "#333"} />
        </TouchableOpacity>
      </View>
      
      <ScrollView className="flex-1">
        {/* Placeholder Görsel */}
        <View className={`w-full h-[60vw] ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <View className={`w-full h-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
        </View>
        
        {/* Placeholder Başlık */}
        <View className="px-4 mb-3 mt-2">
          <View className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-4/5`} />
        </View>
        
        {/* Placeholder Bilgiler */}
        <View className={`px-4 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-4 mx-4`}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <View className={`w-5 h-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full`} />
              </View>
              <View className={`w-[100px] h-[18px] ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded`} />
              <View className={`flex-1 h-[18px] ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded ml-2`} />
            </View>
          ))}
        </View>
        
        {/* Placeholder Açıklama */}
        <View className="px-4 mb-6">
          <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2`} />
          <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-2 w-[90%]`} />
          <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-[60%]`} />
        </View>
        
        {/* Placeholder Organizatör */}
        <View className="px-4 mb-6">
          <View className={`h-5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-[120px] mb-4`} />
          
          <View className="flex-row w-full justify-between">
            {/* Logo Bölümü */}
            <View className="items-center justify-center w-[60px]">
              <View className={`w-[50px] h-[50px] rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
            </View>
            
            {/* Bilgi Bölümü */}
            <View className="flex-1 ml-2">
              <View className={`h-[18px] ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-4/5 mb-[5px]`} />
              <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-3/5 mb-[5px]`} />
              <View className={`h-3.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-2/5`} />
            </View>
            
            {/* İzle/İzlenir Bölümü */}
            <View className="items-center justify-center w-[100px]">
              <View className={`w-full py-2.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg items-center mb-[5px]`}>
                <View className={`h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-white'} w-1/2 rounded`} />
              </View>
              <View className={`h-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded w-[70%]`} />
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View className="absolute left-0 right-0 p-4 z-20 bg-transparent" style={{ bottom: insets.bottom + 8 }}>
        <View className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg py-3.5 items-center`}>
          <View className={`h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-white'} w-[30%] rounded`} />
        </View>
      </View>
    </View>
  );
};

const UnfollowPopup = ({ visible, onConfirm, onCancel, isDarkMode, t }) => {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View className={`w-4/5 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-5 items-center shadow-md`}>
          <Text className={`text-[18px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-5 text-center`}>
            {t?.organisers?.unfollowConfirm || "İzləməyi dayandırmaq istədiyinizə əminsiniz?"}
          </Text>
          
          <View className="flex-row justify-between w-full">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center mx-1 ${isDarkMode ? 'bg-green-600' : 'bg-green-500'}`}
              onPress={onConfirm}
            >
              <Text className="text-white font-bold text-[16px]">{t?.general?.confirm || "Təsdiqlə"}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center mx-1 ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
              onPress={onCancel}
            >
              <Text className="text-white font-bold text-[16px]">{t?.general?.cancel || "Bağla"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function EventDetails() {
  const params = useLocalSearchParams();
  const id = params.id && params.id.includes('_') ? params.id.split('_').pop() : params.id;
  const router = useRouter();
  const { isDarkMode } = useAppTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [organizerInfo, setOrganizerInfo] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [addressCopied, setAddressCopied] = useState(false);
  const scrollViewRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUnfollowPopup, setShowUnfollowPopup] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // State variables
  const [userInfo, setUserInfo] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredUserCount, setRegisteredUserCount] = useState(0);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    const backAction = () => {
      try {
        router.back();
      } catch (error) {
        console.error("Geri navigasyon hatası:", error);
        router.navigate('/(tabs)/home'); 
      }
      return true;
    };
  
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
  
    return () => backHandler.remove();
  }, [router]);

  
  useEffect(() => {
    if (!event) return;
    async function incrementViews() {
      try {
        const eventRef = doc(db, "events", id);
        await updateDoc(eventRef, { views: increment(1) });
      } catch (error) {
        console.error("View artırılarkən xəta:", error);
      }
    }
    incrementViews();
  }, [event,id]);

  useEffect(() => {
    async function getUserData() {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        try {
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setUserInfo(userData);
          }
        } catch (err) {
          console.error("Error fetching user data from Firebase:", err);
        }
      } else {
        try {
          const userJSON = await AsyncStorage.getItem('user');
          if (userJSON) {
            const storageUser = JSON.parse(userJSON);
            if (storageUser) {
              setUserInfo(storageUser);
            }
          }
        } catch (err) {
          console.error("Error fetching user data from AsyncStorage:", err);
        }
      }
    }
    getUserData();
  }, [userInfo,id]);
  
  useEffect(() => {
    async function checkUserRegistration() {
      if (id && userInfo) {
        const registeredUsersCollectionRef = collection(
          db,
          "events",
          id,
          "registeredUsers"
        );
        try {
          const registeredUsersSnapshot = await getDocs(
            registeredUsersCollectionRef
          );
          setRegisteredUserCount(registeredUsersSnapshot.size);

          if (userInfo.uid) {
            const userQuery = query(
              registeredUsersCollectionRef,
              where("userId", "==", userInfo.uid)
            );
            const userQuerySnapshot = await getDocs(userQuery);
            setIsRegistered(!userQuerySnapshot.empty);
          }
        } catch (error) {
          console.error("Qeydiyyat məlumatlarını yoxlama xətası:", error);
        }
      }
    }
    checkUserRegistration(); 
  }, [userInfo, id]);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!id) {
      
        return;
      }
      
      try {
        const eventRef = doc(db, "events", id);
        const eventSnap = await getDoc(eventRef);
        
        if (eventSnap.exists()) {
          const eventData = { id: eventSnap.id, ...eventSnap.data() };
          setEvent(eventData);
          fetchRelatedEvents(eventData);
          fetchOrganizerInfo(eventData);
        } else {
          setHasError(true);
          Alert.alert("Xəta", "Tədbir tapılmadı");
        }
      } catch (error) {
        console.error("Etkinlik detaylarını getirme hatası:", error);
        Alert.alert("Xəta", "Tədbir məlumatlarını əldə etmək mümkün olmadı");
        setHasError(true);
      } finally {
        setLoading(false);
        
      }
    };
    
    fetchEventDetails();
  }, [id]);
  
  const fetchRelatedEvents = async (event) => {
    if (!event || !event.eventcategory) {
      setRelatedEvents([]);
      return;
    }
    
    try {
      const eventsRef = collection(db, "events");
      const q = query(
        eventsRef,
        where("eventcategory", "==", event.eventcategory),
        where("checkedEvent", "==", true),
        where("eventTarget", "==", "İctimaiyyətə açıq"),
        where("deActive", "==", false),
        orderBy("createdAt", "desc"),
        limit(6)
      );
      
      const querySnapshot = await getDocs(q);
      const relatedEventsData = [];
      
      querySnapshot.forEach((doc) => {
        const eventData = { id: doc.id, ...doc.data() };
        if (eventData.id !== event.id) {
          relatedEventsData.push(eventData);
        }
      });
      
      setRelatedEvents(relatedEventsData.slice(0, 5));
    } catch (error) {
      console.error("İlgili etkinlikleri getirme hatası:", error);
      setRelatedEvents([]);
    }
  };
  
  const fetchOrganizerInfo = async (event) => {
    if (!event || !event.eventOwnerId) {
      setOrganizerInfo({
        fullName: event?.eventOwnerName || "Təşkilatçı",
        logoURL: event?.eventOwnerLogoURL || "",
        about: event?.organizerAbout || "Təşkilatçı haqqında",
        sector: event?.eventOwnerSector || "Kateqoriya"
      });
      setFollowersCount(0);
      setIsFollowing(false);
      setIsLoading(false);
      return;
    }
    
    try {
      const organizerRef = doc(db, "users", event.eventOwnerId);
      const organizerSnap = await getDoc(organizerRef);
      
      if (organizerSnap.exists()) {
        const organizerData = organizerSnap.data();
        setOrganizerInfo({
          ...organizerData,
          fullName: organizerData.fullName || event.eventOwnerName || "Təşkilatçı",
          logoURL: organizerData.logoURL || event.eventOwnerLogoURL || "",
          about: organizerData.about || event.organizerAbout || "Təşkilatçı haqqında",
          sector: organizerData.sector || event.eventOwnerSector || "Kateqoriya"
        });
        
        const followersRef = collection(organizerRef, "followers");
        const followersSnap = await getDocs(followersRef);
        setFollowersCount(followersSnap.size);
        
        let userId = null;
        
        if (auth.currentUser) {
          userId = auth.currentUser.uid;
        } else {
          try {
            const userJSON = await AsyncStorage.getItem('user');
            if (userJSON) {
              const storageUser = JSON.parse(userJSON);
              if (storageUser && storageUser.uid) {
                userId = storageUser.uid;
              }
            }
          } catch (err) {
            console.error("AsyncStorage error in fetchOrganizerInfo:", err);
          }
        }
        
        if (userId) {
          try {
            const currentUserFollowingRef = doc(followersRef, userId);
            const currentUserFollowingSnap = await getDoc(currentUserFollowingRef);
            setIsFollowing(currentUserFollowingSnap.exists());
          } catch (checkFollowError) {
            console.error("Check follow status error:", checkFollowError);
            setIsFollowing(false);
          }
        } else {
          setIsFollowing(false);
        }
      } else {
        setOrganizerInfo({
          fullName: event.eventOwnerName || "Təşkilatçı",
          logoURL: event.eventOwnerLogoURL || "",
          about: event.organizerAbout || "Təşkilatçı haqqında",
          sector: event.eventOwnerSector || "Kateqoriya"
        });
        setFollowersCount(0);
        setIsFollowing(false);
      }
    } catch (error) {
      console.error("Organizatör bilgilerini getirme hatası:", error);
      setOrganizerInfo({
        fullName: event.eventOwnerName || "Təşkilatçı",
        logoURL: event.eventOwnerLogoURL || "",
        about: event.organizerAbout || "Təşkilatçı haqqında",
        sector: event.eventOwnerSector || "Kateqoriya"
      });
      setFollowersCount(0);
      setIsFollowing(false);
    }finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text) => {
    if (!text) return;
    
    try {
      Clipboard.setString(text);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Adres kopyalandı', ToastAndroid.SHORT);
      } else {
        Alert.alert(t.general.info, t.general.addressCopied || 'Adres kopyalandı');
      }
    } catch (error) {
      console.error("Clipboard error:", error);
      Alert.alert(t.general.error, t.general.addressCopyError || 'Adres kopyalanırken hata oluştu');
    }
    
    setAddressCopied(true);
    setTimeout(() => {
      setAddressCopied(false);
    }, 2000);
  };
  
  const addToCalendar = (type) => {
    if (!event) return;
    
    try {
      const eventTitle = event.eventname || t.events.untitledEvent;
      const eventDescription = event.eventtext || '';
      const location = event.eventlocation || t.events.onlineEvent;
      
      const startDate = new Date(event.eventstartdate);
      if (event.eventstarttime) {
        const [hours, minutes] = event.eventstarttime.split(':');
        startDate.setHours(Number(hours), Number(minutes));
      }
      
      let endDate = new Date(startDate);
      if (event.eventenddate) {
        endDate = new Date(event.eventenddate);
        if (event.eventendtime) {
          const [hours, minutes] = event.eventendtime.split(':');
          endDate.setHours(Number(hours), Number(minutes));
        } else {
          endDate.setHours(23, 59, 59);
        }
      } else {
        endDate.setHours(endDate.getHours() + 1);
      }
      
      if (!Linking.canOpenURL(`${type}://`)) {
        Alert.alert(t.general.error, t.general.calendarAppMissing || 'Takvim uygulaması bulunamadı');
        return;
      }
      
      Alert.alert(t.general.success, t.general.eventAddedToCalendar || 'Etkinlik takviminize eklendi');
    } catch (error) {
      console.error('Calendar error:', error);
      Alert.alert(t.general.error, t.general.calendarError || 'Takvime eklerken hata oluştu');
    }
  };

  const shareEvent = async () => {
    if (!event) return;

    try {
      const eventUrl = generateEventUrl(event);
      const message = `${event.eventname} tədbiri haqqında məlumat almaq üçün keçid edin: ${eventUrl}`;
      
      await Share.share({
        message: message,
        url: eventUrl,
        title: `${event.eventname} - Eventin`
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(t.general.error, t.events.shareError);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Tarix bilinmir";
      return format(date, "dd MMM yyyy");
    } catch (error) {
      console.error("Tarix formatı xətası:", error);
      return "Tarix bilinmir";
    }
  };
  
  const handleRelatedEventPress = (selectedEvent) => {
    router.replace(generateEventUrl(selectedEvent));
  };
  
  const handleOrganizerPress = () => {
    if (event && event.eventOwnerId) {
      router.push(`/organisers/${event.eventOwnerId}`);
    }
  };

  const toggleFollow = async () => {
    if (!event || !event.eventOwnerId) {
      return;
    }
    
    try {
      setIsLoading(true);
      let userId = null;
      
      if (auth.currentUser) {
        userId = auth.currentUser.uid;
      } else {
        try {
          const userJSON = await AsyncStorage.getItem('user');
          if (userJSON) {
            const storageUser = JSON.parse(userJSON);
            if (storageUser && storageUser.uid) {
              userId = storageUser.uid;
            }
          }
        } catch (err) {
          console.error("AsyncStorage error:", err);
        }
      }
      
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const organizerRef = doc(db, "users", event.eventOwnerId);
        const followerRef = doc(collection(organizerRef, "followers"), userId);
        
        if (isFollowing) {
          setShowUnfollowPopup(true);
          setIsLoading(false);
          return;
        } else {
          await setDoc(followerRef, {
            followerId: userId,
            createdAt: new Date()
          });
          
          const organiserId = event.eventOwnerId;
          const followDocRef = doc(db, "users", userId, "follows", organiserId);
          await setDoc(followDocRef, {
            organiserId,
            followedAt: new Date(),
          });
          
          setIsFollowing(true);
          setFollowersCount(prevCount => prevCount + 1);
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        Alert.alert('Xəta', 'Əməliyyatı yerinə yetirmək mümkün olmadı');
      }
    } catch (error) {
      console.error("Takip işlemi hatası:", error);
      Alert.alert('Xəta', 'Əməliyyatı yerinə yetirmək mümkün olmadı');
    } finally {
      setIsLoading(false);
    }
  };
  
  
  const handleUnfollow = async () => {
    setShowUnfollowPopup(false);
    
    try {
      setIsLoading(true);
      
      let userId = null;
      
      if (auth.currentUser) {
        userId = auth.currentUser.uid;
      } else {
        try {
          const userJSON = await AsyncStorage.getItem('user');
          if (userJSON) {
            const storageUser = JSON.parse(userJSON);
            if (storageUser && storageUser.uid) {
              userId = storageUser.uid;
            }
          }
        } catch (err) {
          console.error("AsyncStorage error:", err);
        }
      }

      if (!userId || !event || !event.eventOwnerId) {
        setShowUnfollowPopup(false);
        return;
      }

      await deleteDoc(doc(db, 'users', userId, 'follows', event.eventOwnerId));
      
      await deleteDoc(doc(db, 'users', event.eventOwnerId, 'followers', userId));
      
      setIsFollowing(false);
      setFollowersCount(prevCount => Math.max(0, prevCount - 1));
      
     
      
    } catch (error) {
      console.error('Unfollow error:', error);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneClick = () => {
    if (event && event.eventregisternumber) {
      Linking.openURL(`tel:${event.eventregisternumber}`);
    }
  };
  
  const handleRegisterSuccess = () => {
    setIsRegistered(true);
    setRegisteredUserCount(prev => prev + 1);
  };

  if (loading) {
    return <EventDetailsPlaceholder />;
  }
  
  if (hasError || !event) {
    return (
      <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-5`}>
      
        <View className="flex-row justify-between items-center">
          <TouchableOpacity 
            className="p-2"
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#fff" : "#333"} />
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 justify-center items-center">
          <Ionicons name="alert-circle-outline" size={60} color="#6366F1" className="mb-5" />
          <Text className={`text-[18px] text-center mb-5 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} font-bold`}>{t.events.eventNotFound}</Text>
          <Text className={`text-[14px] text-center mb-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t.events.eventMayDeleted}</Text>
          <TouchableOpacity 
            className={`py-3 px-5 ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} rounded-lg w-4/5 items-center`}
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold">{t.events.goBack}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />

      <Stack.Screen options={{ headerShown: false }} />

      {/* Üst Başlık ve Butonlar */}
      <View className="flex-row justify-between items-center px-4 bg-transparent absolute z-20 left-0 right-0" style={{ top: insets.top}}>
        <TouchableOpacity 
          className={`p-2 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} rounded-full`}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#fff" : "#333"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          className={`p-2 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} rounded-full`}
          onPress={shareEvent}
        >
          <Ionicons name="share-social-outline" size={24} color={isDarkMode ? "#fff" : "#333"} />
        </TouchableOpacity>
      </View>
      
      <ScrollView className="flex-1" ref={scrollViewRef} contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}>
        <View className={`w-full h-[60vw] ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} mb-4`}>
          <Image 
            source={{ 
              uri: imageError
                ? "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-event-image.png?alt=media&token=baf5e7d5-6ee0-4c0e-bb14-e823279ef051"
                : event.eventimage 
                  ? event.eventimage 
                  : "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-event-image.png?alt=media&token=baf5e7d5-6ee0-4c0e-bb14-e823279ef051" 
            }} 
            className={`w-full h-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        </View>
        
        {/* Etkinlik Adı */}
        <Text className={`text-[22px] font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} px-4 mb-3`}>{event.eventname}</Text>
        
        {/* Etkinlik Bilgileri */}
        <View className={`px-4 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-xl p-4`}>
          <View className="flex-row items-center mb-3">
            <View className="w-6 items-center mr-2">
              <Ionicons name="language-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            </View>
            <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.language}: </Text>
            <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.eventlanguage || "Azərbaycan dili"}</Text>
          </View>

          <View className="flex-row items-center mb-3">
            <View className="w-6 items-center mr-2">
              <Ionicons name="calendar-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            </View>
            <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.startDate}: </Text>
            <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(event.eventstartdate)} {event.eventstarttime ? `/ ${event.eventstarttime}` : ""}</Text>
          </View>
          
          {event.ageStart ? (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="people-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.ageRange}: </Text>
              <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.ageStart} {t.events.years} - {event.ageEnd} {t.events.years}</Text>
            </View>
          ) : (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="calendar-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.endDate}: </Text>
              <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(event.eventenddate)} {event.eventendtime ? `/ ${event.eventendtime}` : ""}</Text>
            </View>
          )}
          
          {/* Son kayıt tarihi */}
          {event.eventregisterenddate && (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="time-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.lastRegistration}: </Text>
              <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(event.eventregisterenddate)}</Text>
            </View>
          )}
          
          <View className="flex-row items-center mb-3">
            <View className="w-6 items-center mr-2">
              <Ionicons name="business-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            </View>
            <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.eventType}: </Text>
            <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.eventType || "Qapalı məkan"}</Text>
          </View>
          
          <View className="flex-row items-center mb-3">
            <View className="w-6 items-center mr-2">
              <Ionicons name="document-text-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            </View>
            <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.provideDocument}: </Text>
            <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.eventDocument || t.events.documentless}</Text>
          </View>
          
          <View className="flex-row items-center mb-3">
            <View className="w-6 items-center mr-2">
              <Ionicons name="cash-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            </View>
            <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.paymentSystem}: </Text>
            <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {event.payment || t.events.free}
              {event.payment === "Ödənişli" && event.paymentPrice ? (
                <Text className={`text-[15px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-bold`}> / {event.paymentPrice} ₼</Text>
              ) : null}
            </Text>
          </View>
          
          {event.eventArea && (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="map-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.region}: </Text>
              <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.eventArea}</Text>
            </View>
          )}
          
          {event.eventlocation ? (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="location-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.address}: </Text>
              <TouchableOpacity 
                onPress={() => copyToClipboard(event.eventlocation || "Online")}
                className="flex-1 flex-row items-center"
              >
                <Text className={`flex-1 text-[15px] ${addressCopied ? (isDarkMode ? 'text-green-400' : 'text-green-500') : (isDarkMode ? 'text-indigo-400' : 'text-indigo-500')}`}>
                  {event.eventRegion && 
                   event.eventRegion !== "Bütün bölgələr" && 
                   event.eventRegion !== "Beynəlxalq" ? 
                   `${event.eventRegion}, ` : ""}
                  {event.eventlocation || "Online"}
                </Text>
                <Ionicons 
                  name={addressCopied ? "checkmark-circle" : "copy-outline"} 
                  size={18} 
                  color={addressCopied ? (isDarkMode ? "#4ADE80" : "#22C55E") : (isDarkMode ? "#818cf8" : "#6366F1")} 
                  className="ml-2"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="globe-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.onlineEvent}: </Text>
              <TouchableOpacity 
                onPress={() => {
                  if (event.onlineURL) {
                    let url = event.onlineURL;
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                    }
                    
                    Linking.canOpenURL(url)
                      .then(supported => {
                        if (supported) {
                          return Linking.openURL(url);
                        } else {
                          Alert.alert(t.general.error, t.events.linkError);
                        }
                      })
                      .catch(err => {
                        console.error("URL açma hatası:", err);
                        Alert.alert(t.general.error, t.events.linkError);
                      });
                  }
                }}
              >
                <Text className={`text-[15px] ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'} underline font-medium`}>
                  {t.events.goToLink}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {event.eventdresscode && (
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="shirt-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>{t.events.dressCode}: </Text>
              <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{event.eventdresscode}</Text>
            </View>
          )}
          
          {/* Qeydiyyat sayı bölümü */}
          {event && !event.eventregisternumber && !event.registerURL && (
            <>
            <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="people-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>
                {event.noPlace  ? t.events.participants : t.events.registrationCount}:
              </Text>
              {event.totalPlace === 10000 ? (<>
                <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{t.events.unlimited}</Text>
              </>) : (
                <>
                 
                    <View className="flex-row">
                      <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                       <Text className={isDarkMode ? 'text-green-400' : 'text-green-600'}>{event.totalPlace}</Text> {t.events.people} / {" "}
                      </Text>
                      <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Text className={`${event.currentPlace === 0 ? (isDarkMode ? "text-red-400" : "text-red-600") : (isDarkMode ? "text-yellow-400" : "text-yellow-600")}`}>
                          {registeredUserCount !== 0 ? event.totalPlace - registeredUserCount : event.totalPlace}
                        </Text> {t.events.people}
                      </Text>
                    </View>
                  
                </>
              )}
            </View>
            {event.noPlace && !event.eventregisternumber && !event.registerURL && <View className="flex-row items-center mb-3">
              <View className="w-6 items-center mr-2">
                <Ionicons name="people-outline" size={20} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              </View>
              <Text className={`text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold w-[120px]`}>
                {t.events.wantGoCount}:
              </Text>
              <Text className={`flex-1 text-[15px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Text className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}>{registeredUserCount}</Text> {t.events.people}
              </Text>
            </View>}
              </>
          )}
         
        </View>
        
        {/* Etkinlik Açıklaması */}
        <Text className={`text-[15px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} px-4 mb-6 leading-[22px]`}>{event.eventtext}</Text>
        
        {/* Organizatör Bölümü */}
        <View className="px-4 mb-6">
          <Text className={`text-[18px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>{t.organisers.organizer}</Text>
          
          <View className="flex-row w-full justify-between">
            {/* Logo Bölümü */}
            <View className="items-center justify-center w-[60px]">
              <Image 
                source={{ 
                  uri: organizerInfo?.logoURL || 
                  event.eventOwnerLogoURL || 
                  "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-organizer-logo.png?alt=media" 
                }} 
                className={`w-[50px] h-[50px] rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                resizeMode="contain"
              />
            </View>
            
            {/* Bilgi Bölümü */}
            <View className="flex-1 ml-2">
              <Text className={`text-[16px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-0.5`}>
                {organizerInfo?.fullName || event.eventOwnerName || t.organisers.unnamed}
              </Text>
              <Text className={`text-[14px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-0.5`}>
                {organizerInfo?.sector || event.eventOwnerSector || t.general.category}
              </Text>
              <TouchableOpacity onPress={handleOrganizerPress}>
                <Text className={`text-[13px] ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} numberOfLines={2}>
                   {t.documents.goToOrganizerProfile}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* İzle/İzlenir Bölümü */}
            <View className="items-center justify-center w-[100px]">
              <TouchableOpacity
                onPress={() => {
                  if (isFollowing) {
                    setShowUnfollowPopup(true);
                  } else {
                    toggleFollow();
                  }
                }}
                disabled={isLoading}
                className={`w-full py-2.5 rounded-lg items-center mb-[5px] ${isFollowing ? (isDarkMode ? 'bg-green-600' : 'bg-green-500') : (isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500')} ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-bold text-[14px]">
                    {isFollowing ? t.organisers.following : t.organisers.follow}
                  </Text>
                )}
              </TouchableOpacity>
              
              <Text className={`text-[12px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center`}>{t.organisers.followers}: {followersCount}</Text>
            </View>
          </View>
        </View>
        
        {/* Takvime Ekle Bölümü */}
        <View className="px-4 mb-6">
          <Text className={`text-[18px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>{t.general.addToCalendar || 'Təqvimə əlavə et'}</Text>
          
          <View className="flex-row justify-between">
            <TouchableOpacity 
              className={`flex-1 items-center justify-center py-2.5 mx-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}
              onPress={() => addToCalendar('google')}
            >
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text className={`mt-1.5 text-[13px] ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Google</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 items-center justify-center py-2.5 mx-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}
              onPress={() => addToCalendar('apple')}
            >
              <Ionicons name="logo-apple" size={24} color={isDarkMode ? "#fff" : "#000"} />
              <Text className={`mt-1.5 text-[13px] ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Apple</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`flex-1 items-center justify-center py-2.5 mx-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}
              onPress={() => addToCalendar('outlook')}
            >
              <Ionicons name="mail-outline" size={24} color="#0078D4" />
              <Text className={`mt-1.5 text-[13px] ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>Outlook</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* İlgili Etkinlikler */}
        {relatedEvents.length > 0 && (
          <View className="px-4 mb-28">
            <Text className={`text-[18px] font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>{t.events.relatedEvents || 'Əlaqəli tədbirlər'}</Text>
            
            <FlatList
              data={relatedEvents}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <UpcomingEventCard
                  item={item}
                  isDarkMode={isDarkMode}
                  onPress={handleRelatedEventPress}
                />
              )}
            />
          </View>
        )}
      </ScrollView>
      
      {/* Alt Kayıt Butonu */}
      <View className="p-4 bg-transparent absolute z-20 left-0 right-0" style={{ bottom: insets.bottom  }}>
        {event?.registerURL ? (
          <TouchableOpacity 
            className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} active:opacity-80`}
            onPress={() => {
              let url = event.registerURL;
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
              }
              Linking.openURL(url);
            }}
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold text-[16px]">{t.events.registerRedirect}</Text>
          </TouchableOpacity>
        ) : event?.eventregisternumber ? (
          <TouchableOpacity 
            className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} active:opacity-80`}
            onPress={handlePhoneClick}
            activeOpacity={0.7}
          >
            <Text className="text-white font-bold text-[16px]">
              {t.events.registerPhone}: {event.eventregisternumber}
            </Text>
          </TouchableOpacity>
        ) : (!event.deActive && 
           !event.archived && 
           event.checkedEvent && 
           new Date(event.eventenddate) > new Date() &&
           (!event.eventregisterenddate || new Date(event.eventregisterenddate) > new Date())) ? (
          userInfo ? (
            userInfo?.deActive ? (
              <TouchableOpacity 
                className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-red-600' : 'bg-red-500'}`}
                disabled={true}
                activeOpacity={1}
              >
                <Text className="text-white font-bold text-[16px]">{t.events.accountDeactivated}</Text>
              </TouchableOpacity>
            ) : isRegistered ? (
                <TouchableOpacity 
                  className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-yellow-600' : 'bg-yellow-500'}`}
                  disabled={true}
                  activeOpacity={1}
                >
                  <Text className="text-white font-bold text-[16px]">{t.events.alreadyRegistered}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} active:opacity-80`}
                  onPress={() => setShowRegisterModal(true)}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-bold text-[16px]">
                    {event.noPlace ? t.events.participate : t.events.register}
                  </Text>
                </TouchableOpacity>
              )
          ) : (
            <TouchableOpacity 
              className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-indigo-600' : 'bg-indigo-500'} active:opacity-80`}
              onPress={() => setShowRegisterModal(true)}
              activeOpacity={0.8}
            >
              <Text className="text-white font-bold text-[16px]">
                {event.noPlace ? t.events.participate : t.events.register}
              </Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity 
            className={`py-3.5 items-center rounded-lg ${isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-200 border border-gray-300'}`}
            disabled={true}
            activeOpacity={1}
          >
            <Text className={`${isDarkMode ? 'text-red-400' : 'text-red-500'} font-bold text-[16px]`}>{t.events.registrationClosed}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Kayıt Modalı */}
      <RegisterModal
        isVisible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        event={event}
        onRegisterSuccess={handleRegisterSuccess}

      />
      
      {/* Unfollow Modal */}
      <UnfollowPopup 
        visible={showUnfollowPopup}
        onConfirm={handleUnfollow}
        onCancel={() => setShowUnfollowPopup(false)}
        isDarkMode={isDarkMode}
        t={t}
      />
    </View>
  );
} 