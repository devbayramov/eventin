import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,

  StatusBar,
  Animated,
  FlatList,
  Dimensions,
  Alert,
  Modal,
  Linking,
  Image
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, collection, getDocs, deleteDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import EventCard, { PlaceholderEventCard } from "./components/EventCard";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/theme';
import { useLanguage, translations } from '../context/language';

// Tab bileşeni
const Tab = ({ title, active, onPress, count }) => {
  const { isDarkMode } = useTheme();
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{ 
        flex: 1, 
        padding: 15, 
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: active ? '#6366f1' : 'transparent',
      }}
    >
      <Text 
        style={{ 
          color: active ? '#6366f1' : (isDarkMode ? '#9ca3af' : '#6b7280'),
          fontWeight: active ? 'bold' : 'normal',
          fontSize: 15,
        }}
      >
        {title} {count > 0 ? `(${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
};

export default function UserEvents() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const screenWidth = Dimensions.get('window').width;

  // State tanımlamaları
  const [loading, setLoading] = useState(true);
  const [successfulLoading, setSuccessfulLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [successfulEvents, setSuccessfulEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("registered");
  const [search, setSearch] = useState("");
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // User verileri için
  const [userData, setUserData] = useState(null);
  
  // Feedback modal ve stateleri
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // İptal modalı
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  
  // Bilet modalı
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  
  // Feedback verilmiş etkinlikleri takip etmek için
  const [feedbackGivenEvents, setFeedbackGivenEvents] = useState({});
  
  // Document modal stateleri
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showDocumentInfoModal, setShowDocumentInfoModal] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  
  // Firebase'den kullanıcı verilerini al
  useEffect(() => {
    const getUserData = async () => {
      try {
        if (auth.currentUser) {
          const userDocRef = doc(db, "users", auth.currentUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          }
        } else {
          // Auth'da kullanıcı yoksa AsyncStorage'dan kontrol et
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Firebase'den kullanıcıyı getir
            if (parsedUser.uid) {
              const userDocRef = doc(db, "users", parsedUser.uid);
              const userSnap = await getDoc(userDocRef);
              if (userSnap.exists()) {
                setUserData(userSnap.data());
              }
            }
          }
        }
      } catch (error) {
        console.error("Kullanıcı verileri alınamadı:", error);
      }
    };
    
    getUserData();
  }, [currentUser]);

  // Kullanıcı oturumunu kontrol et
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Önce auth'dan kontrol et
        if (auth.currentUser) {
          setCurrentUser(auth.currentUser);
          setAuthLoading(false);
          return;
        }
        
        // Auth'da yoksa AsyncStorage'dan kontrol et
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error("Kullanıcı bilgileri alınamadı:", error);
      } finally {
        setAuthLoading(false);
      }
    };
    
    checkUser();
  }, []);

  // Kayıtlı etkinlikleri getir
  useEffect(() => {
    if (!authLoading) {
      if (!currentUser) {
        router.push(`/`);
        return;
      }
      const fetchRegisteredEvents = async () => {
        try {
          const userRegRef = collection(
            db,
            "users",
            currentUser.uid,
            "userRegisteredEvents"
          );
          const userRegSnapshot = await getDocs(userRegRef);
          const eventIds = userRegSnapshot.docs.map((doc) => doc.data().eventId);

          const eventsList = [];
          for (let id of eventIds) {
            const eventDoc = await getDoc(doc(db, "events", id));
            if (eventDoc.exists()) {
              eventsList.push({ id: eventDoc.id, ...eventDoc.data() });
            }
          }
          
          // Etkinlikleri filtrele: Sadece bitiş tarihi bugün veya daha sonra olanları göster
          const now = new Date();
          const filteredList = eventsList.filter(event => {
            // Bitiş tarihi yoksa veya geçersizse göster
            if (!event.eventenddate) return true;
            
            // Bitiş tarihi bugünden önceyse gösterme
            if (new Date(event.eventenddate) < now) {
              return false;
            }
            
            return true;
          });
          
          setEvents(filteredList);
          if (activeTab === "registered") {
            setFilteredEvents(filteredList); // İlk yükleme için filtrelenmiş liste
          }
        } catch (error) {
          console.error("Qeydiyyatdan keçmiş tədbirləri yükləyərkən xəta:", error);
        } finally {
          setLoading(false);
        }
      };
      
      // Başarılı etkinlikleri getir
      const fetchSuccessfulEvents = async () => {
        try {
          setSuccessfulLoading(true);
          const successRef = collection(
            db,
            "users",
            currentUser.uid,
            "userSuccessEvents"
          );
          const successSnapshot = await getDocs(successRef);
          const docs = successSnapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          const confirmedDocs = docs.filter((doc) => doc.documentConfirmed);
          const eventsList = [];
          for (const docItem of confirmedDocs) {
            const eventDocSnap = await getDoc(doc(db, "events", docItem.eventId));
            if (eventDocSnap.exists()) {
              const eventData = { id: eventDocSnap.id, ...eventDocSnap.data() };
              eventsList.push(eventData);
              
              // Her etkinlik için feedback durumunu kontrol et
              checkUserFeedbackStatus(eventDocSnap.id);
            }
          }
          setSuccessfulEvents(eventsList);
          if (activeTab === "successful") {
            setFilteredEvents(eventsList); // Tab değişince filtrelenmemiş liste göster
          }
        } catch (error) {
          console.error("Uğurlu tədbirləri yükləyərkən xəta:", error);
        } finally {
          setSuccessfulLoading(false);
        }
      };
      
      // Her iki etkinlik listesini de yükle
      fetchRegisteredEvents();
      fetchSuccessfulEvents();
    }
  }, [currentUser, authLoading, router]);

  // Arama fonksiyonu
  useEffect(() => {
    // Aktif sekmeye göre doğru etkinlik listesini göster
    if (activeTab === "registered") {
      setFilteredEvents(events);
    } else if (activeTab === "successful") {
      setFilteredEvents(successfulEvents);
    }
    
    // Aramayı uygula
    if (search.trim()) {
      const currentList = activeTab === "registered" ? events : successfulEvents;
      const filtered = currentList.filter(event => 
        event.eventname?.toLowerCase().includes(search.toLowerCase()) ||
        event.eventRegion?.toLowerCase().includes(search.toLowerCase()) ||
        event.eventlocation?.toLowerCase().includes(search.toLowerCase()) ||
        event.eventcategory?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [activeTab, search, events, successfulEvents]);

  // Etkinliğe tıklanınca detay sayfasına git
  const handleEventPress = (event) => {
    router.push(`/event-details/${event.id}`);
  };

  // Geri butonuna basınca gerçekleşecek işlem
  const handleBackPress = () => {
    router.back();
  };

  // Tab'ı değiştir
  const changeTab = (tab) => {
    setActiveTab(tab);
  };

  // İptal et butonuna basınca
  const handleCancelEvent = (event) => {
    setSelectedEvent(event);
    setShowCancelModal(true);
  };

  // Bilete bax butonuna basınca
  const handleViewTicket = (event) => {
    setSelectedEvent(event);
    setShowTicketModal(true);
  };

  // PDF olarak indir
  const handleDownloadTicket = () => {
    // Gerçek bir PDF indirme işlevi burada olacak
    Alert.alert("Bildiriş", "Bilet PDF olaraq endirilib");
  };

  // Kayıt iptal işlemi 
  const handleCancelRegistration = async () => {
    if (!selectedEvent || !currentUser) return;
    try {
      setCancelLoading(true);
      const deletePromises = [];

      // Etkinliğin kayıtlı kullanıcılarından sil
      const eventRegRef = collection(
        db,
        "events",
        selectedEvent.id,
        "registeredUsers"
      );
      const eventRegSnapshot = await getDocs(eventRegRef);
      eventRegSnapshot.forEach((docSnap) => {
        if (docSnap.data().userId === currentUser.uid) {
          deletePromises.push(
            deleteDoc(
              doc(db, "events", selectedEvent.id, "registeredUsers", docSnap.id)
            )
          );
        }
      });

      // Kullanıcının kayıtlı etkinliklerinden sil
      const userRegRef = collection(
        db,
        "users",
        currentUser.uid,
        "userRegisteredEvents"
      );
      const userRegSnapshot = await getDocs(userRegRef);
      userRegSnapshot.forEach((docSnap) => {
        if (docSnap.data().eventId === selectedEvent.id) {
          deletePromises.push(
            deleteDoc(
              doc(db, "users", currentUser.uid, "userRegisteredEvents", docSnap.id)
            )
          );
        }
      });

      await Promise.all(deletePromises);
      
      // State'i güncelle
      setEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      setFilteredEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      
      setShowCancelModal(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Qeydiyyat ləğv edilərkən xəta:", error);
      Alert.alert(t.general.error, t.events.cancelError);
    } finally {
      setCancelLoading(false);
    }
  };

  // Senedsiz butonu için
  const handleDocumentless = (event) => {
    // Önce etkinliğin belge durumunu kontrol et
    if (event.eventDocument && event.eventDocument !== 'Sənədsiz') {
      // Etkinliğin belgesi var
      setSelectedEvent(event);
      setDocumentUrl(event.documentUrl || null);
      setShowDocumentModal(true);
    } else {
      // Etkinliğin belgesi yok
      setShowDocumentInfoModal(true);
    }
  };

  // Bax butonuna tıklanınca
  const handleViewDocument = async () => {
    setShowDocumentModal(false);
    router.push('/documents');
  };

  // Feedback durumunu kontrol et
  const checkUserFeedbackStatus = async (eventId) => {
    if (!eventId || !currentUser) return false;
    
    try {
      // Zaten local'de kontrol edilmiş mi?
      if (feedbackGivenEvents[eventId] !== undefined) {
        return feedbackGivenEvents[eventId];
      }
      
      // Kullanıcının başarılı etkinliklerinde feedback kontrolü
      const userSuccessEventRef = collection(db, "users", currentUser.uid, "userSuccessEvents");
      const userSuccessSnapshot = await getDocs(userSuccessEventRef);
      
      for (const doc of userSuccessSnapshot.docs) {
        if (doc.data().eventId === eventId && doc.data().feedback) {
          // Local state'i güncelle
          setFeedbackGivenEvents(prev => ({...prev, [eventId]: true}));
          return true;
        }
      }
      
      // Etkinlik içindeki feedback'lerde kontrol et
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (eventSnap.exists()) {
        const eventData = eventSnap.data();
        const feedbacks = eventData.EventFeedbacks || [];
        const hasFeedback = feedbacks.some(fb => fb.email === userData?.email);
        
        // Local state'i güncelle
        setFeedbackGivenEvents(prev => ({...prev, [eventId]: hasFeedback}));
        return hasFeedback;
      }
      
      // Local state'i güncelle - feedback yok
      setFeedbackGivenEvents(prev => ({...prev, [eventId]: false}));
      return false;
    } catch (error) {
      console.error("Feedback durumu kontrol edilirken hata:", error);
      setFeedbackGivenEvents(prev => ({...prev, [eventId]: false}));
      return false;
    }
  };

  // Feedback gönderme işlemi
  const handleConfirmFeedback = async () => {
    if (!selectedEvent) return;
    if (!feedback) {
      Alert.alert(t.general.error, "Zəhmət olmasa, əvvəlcə fikrinizi daxil edin.");
      return;
    }

    setFeedbackLoading(true);
    
    try {
      const feedbackData = {
        text: feedback,     
        email: userData?.email,       
        fullName: userData?.fullName,   
        phone: userData?.phone || "",      
        createdAt: new Date(),              
      };
  
      await updateDoc(doc(db, "events", selectedEvent.id), {
        EventFeedbacks: arrayUnion(feedbackData),
      });
      
      // Kullanıcının başarılı etkinliklerini güncelle
      const userSuccessEventRefs = collection(db, "users", currentUser.uid, "userSuccessEvents");
      const userSuccessSnapshot = await getDocs(userSuccessEventRefs);
      
      userSuccessSnapshot.docs.forEach(async (docSnapshot) => {
        if (docSnapshot.data().eventId === selectedEvent.id) {
          await updateDoc(doc(db, "users", currentUser.uid, "userSuccessEvents", docSnapshot.id), {
            feedback: true
          });
        }
      });
      
      // State'i güncelle
      setFeedbackGivenEvents(prev => ({...prev, [selectedEvent.id]: true}));
      setShowFeedbackModal(false);
      setFeedback("");

    } catch (error) {
      console.error("feedback əlavə edilərkən xəta:", error);
      Alert.alert(t.general.error, "Xəta baş verdi. Zəhmət olmasa, yenidən cəhd edin.");
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Rey bildir butonu için - değiştirilmiş
  const handleFeedback = async (event) => {
    setSelectedEvent(event);
    const hasFeedback = await checkUserFeedbackStatus(event.id);
    
    if (!hasFeedback) {
      setShowFeedbackModal(true);
    } else {
      Alert.alert(t.general.info, "Bu tədbir üçün artıq rəy bildirmisiniz.");
    }
  };

  // Kartı render et
  const renderEventCard = (item) => {
    const hasFeedback = feedbackGivenEvents[item.id] === true;
    const feedbackChecking = feedbackGivenEvents[item.id] === undefined;
    const hasDocument = item.eventDocument && item.eventDocument !== 'Sənədsiz';
    
    return (
      <View>
        {/* EventCard */}
        <EventCard 
          item={item} 
          onPress={() => handleEventPress(item)} 
          isDarkMode={isDarkMode} 
        />
        
        {/* Butonlar */}
        {activeTab === "registered" ? (
          <View style={{
            marginHorizontal: 4,
            marginTop: -8,
            marginBottom: 15,
            paddingHorizontal: 8,
          }}>
            <View style={{
              flexDirection: 'row',
              gap: 8,
            }}>
              <TouchableOpacity 
                onPress={() => handleViewTicket(item)}
                style={{
                  backgroundColor: isDarkMode ? '#3b82f6' : '#3b82f6',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '500',
                  fontSize: 14,
                }}>
                  Biletə bax
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => handleCancelEvent(item)}
                style={{
                  backgroundColor: isDarkMode ? '#ef4444' : '#ef4444',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                }}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '500',
                  fontSize: 14,
                }}>
                  {t.events.cancel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{
            flexDirection: 'row',
            marginHorizontal: 4,
            marginTop: -8,
            marginBottom: 15,
            paddingHorizontal: 8,
            gap: 8,
          }}>
            <TouchableOpacity 
              onPress={() => handleDocumentless(item)}
              style={{
                backgroundColor: hasDocument ? '#22c55e' : (isDarkMode ? '#374151' : '#e5e7eb'),
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                flex: 1,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: hasDocument ? 'white' : (isDarkMode ? 'white' : '#374151'),
                fontWeight: '500',
                fontSize: 14,
              }}>
                {hasDocument ? t.events.document : t.events.documentless}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => handleFeedback(item)}
              disabled={hasFeedback || feedbackChecking}
              style={{
                backgroundColor: hasFeedback 
                  ? (isDarkMode ? '#8b5cf6' : '#8b5cf6') 
                  : (isDarkMode ? '#3b82f6' : '#3b82f6'),
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 8,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
            >
              {feedbackChecking ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{
                  color: 'white',
                  fontWeight: '500',
                  fontSize: 14,
                }}>
                  {hasFeedback ? t.events.feedbackGiven : t.events.giveFeedback}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView 
      style={{ 
        flex: 1, 
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb'
      }}
    >

      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
      }}>
        <TouchableOpacity onPress={handleBackPress} style={{padding: 4}}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={{
          flex: 1,
          fontSize: 18,
          fontWeight: 'bold',
          textAlign: 'center',
          marginRight: 28, // Geri butonunu dengelemek için
          color: isDarkMode ? '#fff' : '#000',
        }}>
          {t.profile.myEvents}
        </Text>
      </View>
      
      {/* Arama Kutusu */}
      <View style={{
        padding: 16,
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
          borderRadius: 8,
          paddingHorizontal: 10,
        }}>
          <Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
          <TextInput
            style={{
              flex: 1,
              padding: 8,
              height: 40,
              color: isDarkMode ? '#fff' : '#000',
            }}
            placeholder={t.general.search}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#9ca3af'}
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Tablar */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
      }}>
        <Tab 
          title={t.events.registeredEvents} 
          active={activeTab === "registered"} 
          onPress={() => changeTab("registered")}
          count={events.length}
        />
        <Tab 
          title={t.events.successfulEvents} 
          active={activeTab === "successful"} 
          onPress={() => changeTab("successful")}
          count={successfulEvents.length}
        />
      </View>
      
      {/* İçerik */}
      <View style={{flex: 1}}>
        {/* Qeydiyyatlı Tədbirlər */}
        {activeTab === "registered" && (
          loading ? (
            <ScrollView contentContainerStyle={{paddingVertical: 8}}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item}>
                  <PlaceholderEventCard isDarkMode={isDarkMode} />
                </View>
              ))}
            </ScrollView>
          ) : (
            filteredEvents.length > 0 ? (
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => renderEventCard(item)}
                contentContainerStyle={{paddingVertical: 8}}
              />
            ) : (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
                {search ? (
                  <>
                    <Ionicons name="calendar-outline" size={50} color={isDarkMode ? "#6366f1" : "#6366f1"} />
                    <Text style={{
                      marginTop: 16,
                      fontSize: 16,
                      textAlign: 'center',
                      color: isDarkMode ? '#d1d5db' : '#6b7280',
                    }}>
                      {t.events.noEventsFound}
                    </Text>
                  </>
                ) : (
                  <Image 
                    source={require('../assets/notRegisteredEvents.png')} 
                    style={{
                      width: screenWidth * 0.9,
                      height: undefined,
                      aspectRatio: 1,
                      resizeMode: 'contain'
                    }}
                  />
                )}
              </View>
            )
          )
        )}
        
        {/* Uğurlu Tədbirlər */}
        {activeTab === "successful" && (
          successfulLoading ? (
            <ScrollView contentContainerStyle={{paddingVertical: 8}}>
              {[1, 2, 3, 4].map((item) => (
                <View key={item}>
                  <PlaceholderEventCard isDarkMode={isDarkMode} />

                </View>
              ))}
            </ScrollView>
          ) : (
            filteredEvents.length > 0 ? (
              <FlatList
                data={filteredEvents}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => renderEventCard(item)}
                contentContainerStyle={{paddingVertical: 8}}
              />
            ) : (
              <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
                {search ? (
                  <>
                    <Ionicons name="trophy-outline" size={50} color={isDarkMode ? "#6366f1" : "#6366f1"} />
                    <Text style={{
                      marginTop: 16,
                      fontSize: 16,
                      textAlign: 'center',
                      color: isDarkMode ? '#d1d5db' : '#6b7280',
                    }}>
                      {t.events.noEventsFound}
                    </Text>
                  </>
                ) : (
                  <Image 
                    source={require('../assets/notSuccessEvents.png')} 
                    style={{
                      width: screenWidth * 0.9,
                      height: undefined,
                      aspectRatio: 1,
                      resizeMode: 'contain'
                    }}
                  />
                )}
              </View>
            )
          )
        )}
      </View>
      
      {/* Feedback Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showFeedbackModal}
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#1f2937' : 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 16,
              marginBottom: 15,
              color: isDarkMode ? 'white' : '#1f2937',
              textAlign: 'center',
            }}>
              Tədbir haqqında fikirlərinizi və iradlarınızı təşkilatçı ilə buradan bölüşə bilərsiniz
            </Text>
            
            <TextInput
              style={{
                height: 150,
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#d1d5db',
                borderRadius: 8,
                padding: 10,
                textAlignVertical: 'top',
                marginBottom: 20,
                backgroundColor: isDarkMode ? '#374151' : 'white',
                color: isDarkMode ? 'white' : 'black',
              }}
              placeholder="Rəyinizi buraya yazın..."
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#9ca3af'}
              multiline={true}
              value={feedback}
              onChangeText={setFeedback}
            />
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity 
                style={{
                  backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 10,
                }}
                onPress={() => setShowFeedbackModal(false)}
              >
                <Text style={{
                  color: isDarkMode ? 'white' : '#1F2937',
                  fontWeight: '500',
                }}>
                  {t.general.cancel}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  backgroundColor: '#6366f1',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                }}
                onPress={handleConfirmFeedback}
                disabled={feedbackLoading}
              >
                {feedbackLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{
                    color: 'white',
                    fontWeight: '500',
                  }}>
                    {t.profile.send}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Document Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDocumentModal}
        onRequestClose={() => setShowDocumentModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#1f2937' : 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 16,
              marginBottom: 20,
              color: isDarkMode ? 'white' : '#1f2937',
              textAlign: 'center',
            }}>
              {t.events.documentAvailable}
            </Text>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity 
                style={{
                  backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 10,
                }}
                onPress={() => setShowDocumentModal(false)}
              >
                <Text style={{
                  color: isDarkMode ? 'white' : '#1F2937',
                  fontWeight: '500',
                }}>
                  {t.general.cancel}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  backgroundColor: '#6366f1',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                }}
                onPress={handleViewDocument}
              >
                <Text style={{
                  color: 'white',
                  fontWeight: '500',
                }}>
                  {t.events.viewDocument}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Document Info Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDocumentInfoModal}
        onRequestClose={() => setShowDocumentInfoModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#1f2937' : 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 16,
              marginBottom: 20,
              color: isDarkMode ? 'white' : '#1f2937',
              textAlign: 'center',
            }}>
              {t.events.documentNotAvailable}
            </Text>
            
            <TouchableOpacity 
              style={{
                backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => setShowDocumentInfoModal(false)}
            >
              <Text style={{
                color: isDarkMode ? 'white' : '#1F2937',
                fontWeight: '500',
              }}>
                {t.general.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* İptal Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCancelModal}
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#1f2937' : 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 10,
              color: isDarkMode ? 'white' : '#1f2937',
              textAlign: 'center',
            }}>
              {t.events.cancelTitle}
            </Text>
            
            <Text style={{
              fontSize: 16,
              marginBottom: 20,
              color: isDarkMode ? 'white' : '#1f2937',
              textAlign: 'center',
            }}>
              {t.events.cancelConfirmation}
            </Text>
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity 
                style={{
                  backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 10,
                }}
                onPress={() => setShowCancelModal(false)}
                disabled={cancelLoading}
              >
                <Text style={{
                  color: isDarkMode ? 'white' : '#1F2937',
                  fontWeight: '500',
                }}>
                  {t.general.cancel}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  backgroundColor: '#ef4444',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  opacity: cancelLoading ? 0.7 : 1,
                }}
                onPress={handleCancelRegistration}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={{
                    color: 'white',
                    fontWeight: '500',
                  }}>
                    {t.general.confirm}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bilet Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showTicketModal}
        onRequestClose={() => setShowTicketModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: isDarkMode ? '#1f2937' : 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 500,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
            {selectedEvent && (
              <>
                <View style={{
                  borderBottomWidth: 1,
                  borderBottomColor: isDarkMode ? '#374151' : '#e5e7eb',
                  paddingBottom: 15,
                  marginBottom: 15,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: isDarkMode ? 'white' : '#1f2937',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}>
                    BİLET
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    color: '#6366f1',
                    fontWeight: '600',
                    textAlign: 'center',
                  }}>
                    #{selectedEvent.id.substring(0, 8).toUpperCase()}
                  </Text>
                </View>
                
                <View style={{
                  marginBottom: 20,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                  }}>
                    <View style={{width: '40%'}}>
                      <Text style={{
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                      }}>
                        Tədbir:
                      </Text>
                    </View>
                    <View style={{width: '60%'}}>
                      <Text style={{
                        color: isDarkMode ? 'white' : '#1f2937',
                        fontWeight: '500',
                      }}>
                        {selectedEvent.eventname}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                  }}>
                    <View style={{width: '40%'}}>
                      <Text style={{
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                      }}>
                        Tarix:
                      </Text>
                    </View>
                    <View style={{width: '60%'}}>
                      <Text style={{
                        color: isDarkMode ? 'white' : '#1f2937',
                      }}>
                        {selectedEvent.eventstartdate} 
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                  }}>
                    <View style={{width: '40%'}}>
                      <Text style={{
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                      }}>
                        Saat:
                      </Text>
                    </View>
                    <View style={{width: '60%'}}>
                      <Text style={{
                        color: isDarkMode ? 'white' : '#1f2937',
                      }}>
                        {selectedEvent.eventstarttime || "Qeyd edilməyib"}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                  }}>
                    <View style={{width: '40%'}}>
                      <Text style={{
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                      }}>
                        Ünvan:
                      </Text>
                    </View>
                    <View style={{width: '60%'}}>
                      <Text style={{
                        color: isDarkMode ? 'white' : '#1f2937',
                      }}>
                        {selectedEvent.eventlocation}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    marginBottom: 12,
                  }}>
                    <View style={{width: '40%'}}>
                      <Text style={{
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                      }}>
                        İştirakçı:
                      </Text>
                    </View>
                    <View style={{width: '60%'}}>
                      <Text style={{
                        color: isDarkMode ? 'white' : '#1f2937',
                      }}>
                        {userData?.fullName}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                  }}>
                    <View style={{width: '40%'}}>
                      <Text style={{
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#4b5563',
                      }}>
                        Qeydiyyat tarixi:
                      </Text>
                    </View>
                    <View style={{width: '60%'}}>
                      <Text style={{
                        color: isDarkMode ? 'white' : '#1f2937',
                      }}>
                        {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={{
                  borderTopWidth: 1,
                  borderTopColor: isDarkMode ? '#374151' : '#e5e7eb',
                  paddingTop: 15,
                  marginTop: 15,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    fontSize: 12,
                    marginBottom: 15,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    textAlign: 'center',
                  }}>
                    Bu bileti tədbirdə iştirak üçün təqdim edin.
                  </Text>
                </View>
              </>
            )}
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 10,
            }}>
              <TouchableOpacity 
                style={{
                  backgroundColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  marginRight: 10,
                }}
                onPress={() => setShowTicketModal(false)}
              >
                <Text style={{
                  color: isDarkMode ? 'white' : '#1F2937',
                  fontWeight: '500',
                }}>
                  Bağla
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  backgroundColor: '#6366f1',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  alignItems: 'center',
                  flex: 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={handleDownloadTicket}
                disabled={ticketLoading}
              >
                {ticketLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="white" style={{marginRight: 5}} />
                    <Text style={{
                      color: 'white',
                      fontWeight: '500',
                    }}>
                      PDF endir
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 