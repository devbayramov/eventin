// app/home.js
import * as FileSystem from "expo-file-system";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  Image,
  Pressable,
  Linking,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  addDoc,
  where,
  Dimensions
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebaseConfig";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons, Ionicons, AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/theme";
import { useLanguage, translations } from "../context/language";

export default function Documents() {
  const user = auth.currentUser;
  const router = useRouter();
                                                                                            
       
  // const screenWidth = Dimensions.get('window').width;
  
  // Theme ve dil context'lerini kullan
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  
  const [userId, setUserId] = useState(user ? user.uid : null);
  const [successEvents, setSuccessEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docError, setDocError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userStorage, setUserStorage] = useState(null);
  // Detay modalı için state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailDocument, setDetailDocument] = useState(null);
  // Dropdown state'leri
  const [showEventTypes, setShowEventTypes] = useState(false);
  const [showDocTypes, setShowDocTypes] = useState(false);
  
  // Etkinlik ve belge türleri
  const eventTypes = ["Seminar", "Konfrans", "Webinar", "Workshop", "Kurs", "Təlim", "Təhsil", "Digər"];
  const documentTypes = ["Diplom", "Sertifikat", "İştirak sənədi", "Sənədsiz"];

  const [addFormData, setAddFormData] = useState({
    eventContent: "",
    eventOwnerName: "",
    eventId: "",
    eventType: "",
    eventDocumentType: "",
    eventStartDate: new Date(),
    eventEndDate: new Date(),
    documentConfirmed: false,
    notDocument: false,
    userId: userId,
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Tarih seçici için state'ler
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' veya 'end'

  useEffect(() => {
    // AsyncStorage'dan kullanıcı kimliği alma
    const getUserId = async () => {
      if (!userId) {
        try {
          const userJSON = await AsyncStorage.getItem('user');
          if (userJSON) {
            const storageUser = JSON.parse(userJSON);
            if (storageUser && storageUser.uid) {
              setUserId(storageUser.uid);
            } else {
              // Kullanıcı bilgisi yoksa loading false yap
              setLoading(false);
            }
          } else {
            // AsyncStorage'da kullanıcı yoksa loading false yap
            setLoading(false);
          }
        } catch (err) {
          console.error("AsyncStorage error:", err);
          setLoading(false);
        }
      }
    };
    
    getUserId();
  }, []);

  useEffect(() => {
    // userId yoksa ve ilk yükleme değilse, loading'i false yap
    if (!userId) {
      return;
    }
    
    const fetchData = async () => {
      setLoading(true); // İşlem başladığında loading'i true yap
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserInfo(userSnap.data());
        } else {
          console.error("İstifadəçi məlumatı tapılmadı");
        }

        const eventsRef = collection(db, "users", userId, "userSuccessEvents");
        const q = query(eventsRef, where("notDocument", "==", false));
        const snapshot = await getDocs(q);
        const eventsList = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setSuccessEvents(eventsList);
      } catch (error) {
        console.error("Məlumatlar yüklənərkən xəta:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId]);

  useEffect(() => {
    // DetailModal'ı kapat - router değiştiğinde
    return () => {
      setDetailModalOpen(false);
      setDetailDocument(null);
    };
  }, [router]);

  // Modal'ın router'dan sonra kapanmasını garanti etmek için bir listener ekle
  useEffect(() => {
    const handleRouterChange = () => {
      if (detailModalOpen) {
        setDetailModalOpen(false);
        setDetailDocument(null);
      }
    };

    // Router navigation event listener ekle
    router.addListener && router.addListener('routeChange', handleRouterChange);
    
    return () => {
      // Cleanup listener
      router.removeListener && router.removeListener('routeChange', handleRouterChange);
    };
  }, [detailModalOpen, router]);

  const openDeleteModal = (docItem) => {
    setSelectedDoc(docItem);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setSelectedDoc(null);
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) {
      Alert.alert(translations[language]?.errors?.errorTitle || "Xəta", 
                 translations[language]?.documents?.documentNotFound || "Seçili sənəd tapılmadı");
      return;
    }
    
    // Kullanıcı kimliğini doğrula
    let currentUserId = userId;
    if (!currentUserId && user) {
      currentUserId = user.uid;
    }
    
    if (!currentUserId) {
      Alert.alert(translations[language]?.errors?.errorTitle || "Xəta", 
                 translations[language]?.errors?.userNotLoggedIn || "İstifadəçi girişi edilməmiş");
      return;
    }
    
    try {
      setLoading(true);
      console.log("Silinen belge ID:", selectedDoc.id);
      console.log("Kullanıcı ID:", currentUserId);
      
      // Belgenin referansını al
      const docRef = doc(
        db,
        "users",
        currentUserId,
        "userSuccessEvents",
        selectedDoc.id
      );
      
      // Belgeyi sil
      await deleteDoc(docRef);
      
      // Belge listesinden kaldır
      setSuccessEvents((prev) =>
        prev.filter((item) => item.id !== selectedDoc.id)
      );
      
      // Başarı mesajı göster
      Alert.alert(translations[language]?.profile?.successTitle || "Uğurlu", 
                 translations[language]?.documents?.documentDeletedSuccess || "Sənəd uğurla silindi");
      
      // Modalı kapat
      closeDeleteModal();
    } catch (error) {
      console.error("Sənəd silinərkən xəta:", error);
      Alert.alert(translations[language]?.errors?.errorTitle || "Xəta", 
                 (translations[language]?.documents?.documentDeleteError || "Sənəd silinərkən xəta baş verdi. Xəta: ") + error.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setDocError(null); // Error state'i sıfırla
    setAddFormData({
      eventContent: "",
      eventOwnerName: "",
      eventId: "",
      eventType: "",
      eventDocumentType: "",
      eventStartDate: new Date(),
      eventEndDate: new Date(),
      documentConfirmed: false,
      notDocument: false,
      userId: userId,
    });
    setSelectedFile(null);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled === false) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Dosya seçme hatası:", error);
      Alert.alert("Xəta", "Fayl seçilmədi");
    }
  };

  const handleAddDocument = async () => {
    if (
      !addFormData.eventContent ||
      !addFormData.eventOwnerName ||
      !addFormData.eventType ||
      !addFormData.eventDocumentType ||
      !selectedFile
    ) {
      setDocError("Bütün sahələri doldurun və sənəd seçin.");
      return;
    }

    try {
      setLoading(true);
      
      // Kullanıcı kimliğini kontrol edelim
      let currentUserId = userId;
      
      if (!currentUserId) {
        try {
          const userJSON = await AsyncStorage.getItem('user');
          if (userJSON) {
            const storageUser = JSON.parse(userJSON);
            if (storageUser && storageUser.uid) {
              currentUserId = storageUser.uid;
              setUserStorage(storageUser)
              setUserId(currentUserId);
            }
          }
        } catch (err) {
          console.error("AsyncStorage error:", err);
          setDocError("Kullanıcı bilgileri alınamadı");
          setLoading(false);
          return;
        }
      }
      
      if (!currentUserId) {
        setDocError("Kullanıcı girişi yapılmamış");
        setLoading(false);
        return;
      }
      
      let documentUrl = "";
      if (selectedFile) {
        const response = await fetch(selectedFile.uri);
        const blob = await response.blob();
        
        const fileName = selectedFile.name || 
                         selectedFile.uri.split('/').pop() || 
                         `document_${Date.now()}`;
                         
        const storageRef = ref(
          storage,
          `documents/${currentUserId}-${fileName}`
        );
        
        await uploadBytes(storageRef, blob);
        documentUrl = await getDownloadURL(storageRef);
      }
      
      // Firebase'e gönderilecek veriler
      const docData = {
        ...addFormData,
        userId: currentUserId,
        eventStartDate: addFormData.eventStartDate.toISOString(),
        eventEndDate: addFormData.eventEndDate.toISOString(),
        documentUrl,
      };
      
      const docRef = await addDoc(
        collection(db, "users", currentUserId, "userSuccessEvents"),
        docData
      );

      setSuccessEvents((prev) => [...prev, { id: docRef.id, ...docData }]);
      closeAddModal();
      Alert.alert("Uğurlu", "Sənəd uğurla əlavə edildi");
    } catch (error) {
      console.error("Sənəd əlavə olunarkən xəta:", error);
      Alert.alert("Xəta", "Sənəd əlavə olunarkən xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: userInfo?.fullName + ` sənədləri - ətraflı məlumat üçün eventin tətbiqini yükləyin və ya linkə keçin: https://eventin.az/user-documents/${userId}`,
        title: userInfo?.fullName + " sənədləri",
      });
    } catch (error) {
      console.error("Paylaşma xətası:", error);
    }
  };

  const handleDownload = async (documentUrl) => {
    try {
      // Dosya indirme sırasında global loading state'i kullanmayalım, yoksa sayfa yenileniyor
      if (Platform.OS === 'web') {
        window.open(documentUrl);
        return;
      }
      
      // İzin kontrolü
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("İcazə verilmədi", "Faylı qaleriyaya endirmək üçün icazə lazımdır");
        return;
      }
      
      // İndirme başlıyor uyarısı
      Alert.alert("Əməliyyat başladı", "Sənəd endirilir, xahiş edirik gözləyin...");
      
      const decodedFilePath = decodeURIComponent(documentUrl);
      const actualFilePath = decodedFilePath.split("?")[0];
      let fileName = actualFilePath.split("/").pop();
      const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

      // eslint-disable-next-line import/namespace
      const localFile = FileSystem.documentDirectory + cleanFileName;
      
      // İndirme işlemini başlat
      const downloadResumable = FileSystem.createDownloadResumable(
        documentUrl,
        localFile,
        {},
        (downloadProgress) => {
         // const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          // İsteğe bağlı ilerleme gösterimi eklenebilir
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      // PDF ve görüntü dosyalarını farklı şekilde işle
      if (documentUrl.toLowerCase().includes('.pdf')) {
        // PDF için doğrudan dosyayı aç veya paylaş
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          // Paylaşım mümkün değilse, dosyayı aç
          Linking.openURL(uri);
        }
      } else {
        // Görüntü dosyalarını galeriye kaydet
        const asset = await MediaLibrary.createAssetAsync(uri);
        
        // Galeriye kaydet
        const album = await MediaLibrary.getAlbumAsync('Eventin Sənədləri');
        if (album) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        } else {
          await MediaLibrary.createAlbumAsync('Eventin Sənədləri', asset, false);
        }
      }
      
      Alert.alert(
        "Uğurlu", 
        documentUrl.toLowerCase().includes('.pdf') ? 
          "Sənəd uğurla açıldı" : 
          "Sənəd qaleriyaya endirildi", 
        [{ text: "Tamam" }]
      );
      
    } catch (error) {
      console.error("İndirmə xətası:", error);
      Alert.alert("Xəta", "Sənəd endirilərkən xəta baş verdi");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const filteredSuccessEvents = successEvents.filter((item) => {
    const combinedText = (
      (item.eventname || "") +
      " " +
      (item.eventContent || "") +
      " " +
      (item.eventDocumentType || "") +
      " " +
      (item.eventType || "") +
      " " +
      (item.eventStartDate ? formatDate(item.eventStartDate) : "") +
      " " +
      (item.eventEndDate ? formatDate(item.eventEndDate) : "")
    ).toLowerCase();
    return combinedText.includes(searchQuery.toLowerCase());
  });
  
  // Tarih seçici modunu başlat
  const openDatePicker = (mode) => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  };
  
  // Tarih seçiciyi kapat
  const closeDatePicker = () => {
    setDatePickerVisible(false);
  };
  
  // Tarih seçildiğinde
  const handleDateChange = (day, month, year) => {
    const newDate = new Date();
    newDate.setDate(day);
    newDate.setMonth(month);
    newDate.setFullYear(year);
    
    if (datePickerMode === 'start') {
      // Eğer seçilen başlangıç tarihi bitiş tarihinden sonraysa, bitiş tarihini de güncelle
      if (newDate > addFormData.eventEndDate) {
        setAddFormData(prev => ({ 
          ...prev, 
          eventStartDate: newDate,
          eventEndDate: new Date(newDate.getTime()) // Bitiş tarihini başlangıç tarihiyle aynı yap
        }));
      } else {
        setAddFormData(prev => ({ ...prev, eventStartDate: newDate }));
      }
    } else {
      // Eğer seçilen bitiş tarihi başlangıç tarihinden önceyse, izin verme
      if (newDate < addFormData.eventStartDate) {
        Alert.alert(
          "Tarix xətası", 
          "Bitiş tarixi, başlanğıc tarixindən əvvəl ola bilməz!",
          [{ text: "Təsdiqlə", onPress: () => closeDatePicker() }]
        );
        return;
      }
      setAddFormData(prev => ({ ...prev, eventEndDate: newDate }));
    }
    closeDatePicker();
  };
  
  // Tarih Seçici Komponenti
  const DatePicker = () => {
    const currentDate = datePickerMode === 'start' 
      ? addFormData.eventStartDate 
      : addFormData.eventEndDate;
    
    const [selectedDay, setSelectedDay] = useState(currentDate.getDate());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    
    // Gün, ay ve yıl dizileri
    const days = Array.from({length: 31}, (_, i) => i + 1);
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 20}, (_, i) => currentYear - i);
    
    // Seçimi onayla
    const confirmSelection = () => {
      // Tarih kontrolü yap
      const selectedDate = new Date();
      selectedDate.setDate(selectedDay);
      selectedDate.setMonth(selectedMonth);
      selectedDate.setFullYear(selectedYear);
      
      if (datePickerMode === 'end' && selectedDate < addFormData.eventStartDate) {
        Alert.alert(
          "Tarix xətası", 
          "Bitiş tarixi, başlanğıc tarixindən əvvəl ola bilməz!",
          [{ text: "Təsdiqlə", onPress: () => closeDatePicker() }]
        );
        return;
      }
      
      handleDateChange(selectedDay, selectedMonth, selectedYear);
    };
    
    return (
      <Modal
        visible={datePickerVisible}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="rounded-lg w-[90%] p-5 "
                style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white' }}>
            <Text className="text-xl font-bold text-center mb-4"
                  style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
              {datePickerMode === 'start' ? 'Başlama Tarixi' : 'Bitmə Tarixi'}
            </Text>
            
            {datePickerMode === 'end' && (
              <Text className="text-xs text-center mb-2" 
                    style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                Başlama tarixi: {formatDate(addFormData.eventStartDate.toISOString())}
              </Text>
            )}
            
            <View className="flex-row mb-5">
              {/* Gün Seçici */}
              <View className="flex-1 mr-2">
                <Text className="text-gray-600 mb-1 text-center" style={{ color: isDarkMode ? '#e5e7eb' : '#6b7280' }}>Gün</Text>
                <ScrollView 
                  className="border rounded-lg h-40" 
                  style={{ 
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#374151' : 'white'
                  }}
                  showsVerticalScrollIndicator={true}
                >
                  {days.map(day => (
                    <TouchableOpacity 
                      key={`day-${day}`}
                      className={`p-3 border-b ${day === selectedDay ? 'bg-blue-100' : ''}`}
                      style={{ 
                        borderColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                        backgroundColor: day === selectedDay 
                          ? (isDarkMode ? '#2563eb' : '#dbeafe') 
                          : (isDarkMode ? '#374151' : 'white')
                      }}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text 
                        className={`text-center ${day === selectedDay ? 'font-bold' : ''}`}
                        style={{ 
                          color: day === selectedDay 
                            ? (isDarkMode ? 'white' : '#2563eb') 
                            : (isDarkMode ? '#e5e7eb' : '#1f2937')
                        }}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Ay Seçici */}
              <View className="flex-1 mr-2">
                <Text className="text-gray-600 mb-1 text-center" style={{ color: isDarkMode ? '#e5e7eb' : '#6b7280' }}>Ay</Text>
                <ScrollView 
                  className="border rounded-lg h-40"
                  style={{ 
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#374151' : 'white'
                  }}
                  showsVerticalScrollIndicator={true}
                >
                  {months.map((month, index) => (
                    <TouchableOpacity 
                      key={`month-${index}`}
                      className={`p-3 border-b ${index === selectedMonth ? 'bg-blue-100' : ''}`}
                      style={{ 
                        borderColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                        backgroundColor: index === selectedMonth 
                          ? (isDarkMode ? '#2563eb' : '#dbeafe') 
                          : (isDarkMode ? '#374151' : 'white')
                      }}
                      onPress={() => setSelectedMonth(index)}
                    >
                      <Text 
                        className={`text-center ${index === selectedMonth ? 'font-bold' : ''}`}
                        style={{ 
                          color: index === selectedMonth 
                            ? (isDarkMode ? 'white' : '#2563eb') 
                            : (isDarkMode ? '#e5e7eb' : '#1f2937')
                        }}
                      >
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Yıl Seçici */}
              <View className="flex-1">
                <Text className="text-gray-600 mb-1 text-center" style={{ color: isDarkMode ? '#e5e7eb' : '#6b7280' }}>İl</Text>
                <ScrollView 
                  className="border rounded-lg h-40"
                  style={{ 
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#374151' : 'white'
                  }}
                  showsVerticalScrollIndicator={true}
                >
                  {years.map(year => (
                    <TouchableOpacity 
                      key={`year-${year}`}
                      className={`p-3 border-b ${year === selectedYear ? 'bg-blue-100' : ''}`}
                      style={{ 
                        borderColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                        backgroundColor: year === selectedYear 
                          ? (isDarkMode ? '#2563eb' : '#dbeafe') 
                          : (isDarkMode ? '#374151' : 'white')
                      }}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text 
                        className={`text-center ${year === selectedYear ? 'font-bold' : ''}`}
                        style={{ 
                          color: year === selectedYear 
                            ? (isDarkMode ? 'white' : '#2563eb') 
                            : (isDarkMode ? '#e5e7eb' : '#1f2937')
                        }}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View className="flex-row justify-between">
              <TouchableOpacity
                onPress={closeDatePicker}
                className="bg-red-500 py-3 px-5 rounded flex-1 mr-2 items-center"
              >
                <Text className="text-white font-bold">Ləğv et</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmSelection}
                className="bg-blue-500 py-3 px-5 rounded flex-1 items-center"
              >
                <Text className="text-white font-bold">Təsdiq et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Detay modalını açma
  const openDetailModal = (item) => {
    setDetailDocument(item);
    setDetailModalOpen(true);
  };

  // Detay modalını kapatma
  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setDetailDocument(null);
  };

  // Organizatör URL veya ID işleme
  const handleOrganiserLink = (link) => {
    if (!link) return;
    
    // Önce modalı kapat
    setDetailModalOpen(false);
    
    // Kısa bir gecikmeyle router işlemini gerçekleştir
    setTimeout(() => {
      if (link.includes('.')) {
        // URL olarak kabul et - http:// yoksa ekle
        let url = link;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        if (Platform.OS === 'web') {
          window.open(url, '_blank');
        } else {
          Linking.openURL(url);
        }
      } else {
        // Organizatör ID olarak kabul et
        router.push(`/organisers/${link}`);
      }
    }, 300); // 300ms gecikme
  };

  // Yeni, modern sertifika kartı renderı
  const renderDocumentItem = ({ item, index }) => (
    <View className="w-[48%] mb-4 rounded-xl overflow-hidden shadow-md border" 
          style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
      <View className="relative">
        {/* Onay rozeti */}
        {item.documentConfirmed && (
          <View className="absolute top-2 left-2 z-50">
            <Image
              source={require("../assets/documentConfirmedBadge.png")}
              className="w-10 h-8"
              resizeMode="contain"
            />
          </View>
        )}
        
        {/* Sertifika görüntüsü - boyutu küçültüldü */}
        {item.documentUrl && (
          <View>
            {item.documentUrl.toLowerCase().includes(".pdf") ? (
              <View className="h-28 flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                <MaterialIcons name="picture-as-pdf" size={36} color="white" />
                <Text className="text-white text-xs mt-1">
                  {translations[language]?.documents?.pdfDocument || "PDF Sənədi"}
                </Text>
              </View>
            ) : (
              <View className="h-28 flex items-center justify-center" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                <Image
                  source={{ uri: item.documentUrl }}
                  className="w-full h-28"
                  resizeMode="contain"
                />
              </View>
            )}
            
            {/* Hover kontrolleri */}
            <View className="absolute top-2 right-2 flex-row">
              <TouchableOpacity 
                className="bg-white/20 p-1 mr-1 rounded-full"
                onPress={() => handleDownload(item.documentUrl)}
              >
                <MaterialIcons name="file-download" size={20} color="#34C759" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-white/20 p-1 rounded-full"
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open(item.documentUrl, '_blank');
                  } else {
                    Linking.openURL(item.documentUrl);
                  }
                }}
              >
                <MaterialIcons name="visibility" size={20} color="cyan" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      {/* Kart içeriği */}
      <View className="p-2">
        <Text className="text-sm text-center font-bold pb-1 border-b" 
              style={{ 
                color: isDarkMode ? '#93c5fd' : '#1e40af',
                borderColor: isDarkMode ? '#374151' : '#f3f4f6' 
              }} 
              numberOfLines={1} 
              ellipsizeMode="tail">
          {item.eventContent || translations[language]?.documents?.documentName || "Sənəd adı"}
        </Text>
        
        <View className="flex-row items-center justify-center border-b py-0.5" 
              style={{ borderColor: isDarkMode ? '#374151' : '#f3f4f6' }}>
          <MaterialIcons name="workspace-premium" size={14} color="#4361EE" />
          <Text className="text-sm font-semibold ml-2" 
                style={{ color: isDarkMode ? '#93c5fd' : '#1e40af' }}
                numberOfLines={1} 
                ellipsizeMode="tail">
            {item.eventDocumentType || translations[language]?.documents?.certificate || "Sertifikat"}
          </Text>
        </View>
        
        <View className="flex-row items-center justify-center  py-0.5" 
              style={{ borderColor: isDarkMode ? '#374151' : '#f3f4f6' }}>
          <MaterialCommunityIcons name="account-voice" size={12} color="#4361EE" />
          <Text className="text-sm font-semibold ml-2" 
                style={{ color: isDarkMode ? '#93c5fd' : '#1e40af' }}
                numberOfLines={1} 
                ellipsizeMode="tail">
            {item.eventType || translations[language]?.documents?.eventType || "Tədbir növü"}
          </Text>
        </View>
        
        <View className="flex-row items-center justify-center pt-1 border-t" 
              style={{ borderColor: isDarkMode ? '#374151' : '#f3f4f6' }}>
          <Text className="text-xs font-medium ml-1" 
                style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                numberOfLines={1} 
                ellipsizeMode="tail">
            {item.eventStartDate ? formatDate(item.eventStartDate) : "01 Yan 2023"} / {item.eventEndDate ? formatDate(item.eventEndDate) : "01 Yan 2023"}
          </Text>
        </View>
        
        {/* Ətraflı bax butonu */}
        <TouchableOpacity 
          className="py-2 px-3 rounded-lg mt-2 items-center"
          style={{ backgroundColor: isDarkMode ? '#3b82f6' : '#3b82f6' }}
          onPress={() => openDetailModal(item)}
        >
          <Text className="text-white text-xs font-semibold">
            {translations[language]?.documents?.viewDetails || "Ətraflı bax"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Placeholder card for loading state
  const renderPlaceholderItem = ({ item }) => (
    <View className="w-[48%] mb-4 rounded-xl overflow-hidden shadow-md border" 
          style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white', borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
      <View className="h-28" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }} />
      <View className="p-2">
        <View className="h-4 rounded mb-2" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }} />
        <View className="h-3 rounded mb-2 w-3/4" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }} />

        <View className="h-6 rounded" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }} />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
        
        <View className="w-full">
          <View className="flex-row px-4 py-2 items-center mb-5">
            <View className="flex-row flex-1 rounded-lg px-3 h-12 mr-2 items-center border" 
                  style={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : 'white',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
                  }}>
              <Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#9CA3AF'} />
              <View className="h-4 rounded w-3/4 ml-2" style={{ backgroundColor: isDarkMode ? '#374151' : '#e5e7eb' }} />
            </View>
            
            <View className="p-3 h-12 rounded-lg mr-2 border" 
                  style={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : 'white',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
                  }}>
              <Ionicons name="share-social-outline" size={20} color="#4361EE" />
            </View>

            <View className="p-3 h-12 rounded-lg border" 
                  style={{ 
                    backgroundColor: isDarkMode ? '#1f2937' : 'white',
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
                  }}>
              <MaterialIcons name="note-add" size={20} color="#4361EE" />
            </View>
          </View>
          
          <Text className="text-center font-bold mb-6 text-xl" 
                style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
            {translations[language]?.documents?.myDocuments || "Sənədlərim"}
          </Text>
          
          <FlatList
            data={[
              { id: 'placeholder1' },
              { id: 'placeholder2' },
              { id: 'placeholder3' },
              { id: 'placeholder4' }
            ]}
            renderItem={renderPlaceholderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            className="mb-10 px-4"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
              <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
     
      <View className="w-full">
        <View className="flex-row px-4 py-2 items-center mb-5">
          <View className="flex-row flex-1 rounded-lg px-3 h-12 mr-2 items-center border" 
                style={{ 
                  backgroundColor: isDarkMode ? '#1f2937' : 'white',
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
                }}>
            <Ionicons name="search" size={20} color={isDarkMode ? '#9ca3af' : '#9CA3AF'} />
            <TextInput
              placeholder={translations[language]?.search?.searchDocument || "Sənəd axtar"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-2"
              style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#9CA3AF'}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={isDarkMode ? '#9ca3af' : '#9CA3AF'} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            onPress={handleShare}
            className="p-3 h-12 rounded-lg mr-2 border"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : 'white',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
            }}
          >
            <Ionicons name="share-social-outline" size={20} color="#4361EE" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openAddModal}
            className="p-3 h-12 rounded-lg border"
            style={{ 
              backgroundColor: isDarkMode ? '#1f2937' : 'white',
              borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
            }}
          >
            <MaterialIcons name="note-add" size={20} color="#4361EE" />
          </TouchableOpacity>
        </View>
        <Text className="text-center font-bold mb-6 text-xl" 
              style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
          {translations[language]?.documents?.myDocuments || "Sənədlərim"}
        </Text>
        {loading ? (
          // Loading durumundayken placeholder'ları göster
          <FlatList
            data={[
              { id: 'placeholder1' },
              { id: 'placeholder2' },
              { id: 'placeholder3' },
              { id: 'placeholder4' }
            ]}
            renderItem={renderPlaceholderItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            className="mb-10"
          />
        ) : filteredSuccessEvents.length > 0 ? (
          <FlatList
            data={filteredSuccessEvents}
            renderItem={renderDocumentItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            className="mb-10 px-4"
          />
        ) : (
          <View className="flex-1 items-center justify-center mt-[250px] w-full">
            <Image
              source={require("../assets/notFindDocument.png")}
              className="h-42"
              resizeMode="contain"
             // style={{ width: screenWidth * 0.9, alignSelf: 'center' }}
            />
            <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', textAlign: 'center', marginTop: 10 }}>
              {translations[language]?.documents?.noDocumentsFound || "Heç bir sənəd tapılmadı"}
            </Text>
          </View>
        )}
      </View>

      {/* Delete Modal */}
      <Modal
        visible={deleteModalOpen}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="rounded-lg w-full p-5 items-center" 
                style={{ backgroundColor: isDarkMode ? '#1f2937' : 'white' }}>
            <Text className="font-bold text-xl text-base mb-5 text-center" 
                  style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
              {translations[language]?.documents?.confirmDeleteDocument || "Bu sənədi silmək istədiyinizə əminsiniz?"}
            </Text>
            <View className="flex-row justify-between w-full">
              <TouchableOpacity
                onPress={handleDeleteDocument}
                className="bg-green-500 py-3 px-5 mr-2 rounded flex-1 items-center"
              >
                <Text className="text-white font-bold">
                  {translations[language]?.general?.confirm || "Təsdiq et"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeDeleteModal}
                className="bg-red-500 py-3 px-5 rounded flex-1 items-center"
              >
                <Text className="text-white font-bold">
                  {translations[language]?.general?.cancel || "Bağla"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Document Modal */}
      <Modal
        visible={addModalOpen}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="rounded-lg w-[90%] max-h-[80%] p-5" 
                style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
            <ScrollView showsVerticalScrollIndicator={false} className="w-full">
              <Text className="text-xl font-bold text-center mb-5" 
                    style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                {translations[language]?.documents?.addNewDocument || "Yeni Sənəd Əlavə Et"}
              </Text>
              
              <TextInput
                placeholder={translations[language]?.documents?.documentContent || "Sənəd məzmunu"}
                value={addFormData.eventContent}
                onChangeText={(text) => setAddFormData(prev => ({ ...prev, eventContent: text }))}
                className="border rounded p-3 mb-3"
                style={{ 
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#374151' : 'white',
                  color: isDarkMode ? '#e5e7eb' : '#1f2937'
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#9CA3AF'}
              />
              
              <TextInput
                placeholder={translations[language]?.documents?.organizerName || "Təşkilatçı adı"}
                value={addFormData.eventOwnerName}
                onChangeText={(text) => setAddFormData(prev => ({ ...prev, eventOwnerName: text }))}
                className="border rounded p-3 mb-3"
                style={{ 
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#374151' : 'white',
                  color: isDarkMode ? '#e5e7eb' : '#1f2937'
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#9CA3AF'}
              />
              
              <TextInput
                placeholder={translations[language]?.documents?.organizerWebsite || "Təşkilatçı veb-saytı (istəyə bağlı)"}
                value={addFormData.eventId}
                onChangeText={(text) => setAddFormData(prev => ({ ...prev, eventId: text }))}
                className="border rounded p-3 mb-3"
                style={{ 
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#374151' : 'white',
                  color: isDarkMode ? '#e5e7eb' : '#1f2937'
                }}
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#9CA3AF'}
              />
              
              {/* Etkinlik Türü Dropdown */}
              <View className="mb-3">
                <TouchableOpacity 
                  className="border rounded p-3 flex-row justify-between items-center"
                  style={{ 
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#374151' : 'white'
                  }}
                  onPress={() => {
                    setShowEventTypes(!showEventTypes);
                    setShowDocTypes(false);
                  }}
                >
                  <Text style={{ 
                    color: addFormData.eventType 
                      ? (isDarkMode ? '#e5e7eb' : '#1f2937') 
                      : (isDarkMode ? '#9ca3af' : '#9CA3AF')
                  }}>
                    {addFormData.eventType || (translations[language]?.documents?.selectEventType || "Tədbir növü seçin")}
                  </Text>
                  <Ionicons 
                    name={showEventTypes ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={isDarkMode ? '#e5e7eb' : '#444'} 
                  />
                </TouchableOpacity>
                
                {showEventTypes && (
                  <View className="border rounded mt-1 max-h-40 z-10"
                        style={{ 
                          borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                          backgroundColor: isDarkMode ? '#1f2937' : 'white'
                        }}>
                    <ScrollView nestedScrollEnabled={true}>
                      {eventTypes.map((type, index) => (
                        <TouchableOpacity 
                          key={index}
                          className="p-3 border-b flex-row justify-between items-center"
                          style={{ 
                            borderColor: isDarkMode ? '#374151' : '#f3f4f6',
                            backgroundColor: addFormData.eventType === type 
                              ? (isDarkMode ? '#2563eb' : '#dbeafe') 
                              : 'transparent'
                          }}
                          onPress={() => {
                            setAddFormData(prev => ({ ...prev, eventType: type }));
                            setShowEventTypes(false);
                          }}
                        >
                          <Text style={{ 
                            color: addFormData.eventType === type 
                              ? (isDarkMode ? '#ffffff' : '#2563eb') 
                              : (isDarkMode ? '#e5e7eb' : '#1f2937')
                          }}>
                            {type}
                          </Text>
                          {addFormData.eventType === type && (
                            <Ionicons name="checkmark" size={20} color={isDarkMode ? '#ffffff' : '#4361EE'} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Belge Türü Dropdown */}
              <View className="mb-3">
                <TouchableOpacity 
                  className="border rounded p-3 flex-row justify-between items-center"
                  style={{ 
                    borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                    backgroundColor: isDarkMode ? '#374151' : 'white'
                  }}
                  onPress={() => {
                    setShowDocTypes(!showDocTypes);
                    setShowEventTypes(false);
                  }}
                >
                  <Text style={{ 
                    color: addFormData.eventDocumentType 
                      ? (isDarkMode ? '#e5e7eb' : '#1f2937') 
                      : (isDarkMode ? '#9ca3af' : '#9CA3AF')
                  }}>
                    {addFormData.eventDocumentType || (translations[language]?.documents?.selectDocumentType || "Sənəd növü seçin")}
                  </Text>
                  <Ionicons 
                    name={showDocTypes ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={isDarkMode ? '#e5e7eb' : '#444'} 
                  />
                </TouchableOpacity>
                
                {showDocTypes && (
                  <View className="border rounded mt-1 max-h-40 z-10"
                        style={{ 
                          borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                          backgroundColor: isDarkMode ? '#1f2937' : 'white'
                        }}>
                    <ScrollView nestedScrollEnabled={true}>
                      {documentTypes.map((type, index) => (
                        <TouchableOpacity 
                          key={index}
                          className="p-3 border-b flex-row justify-between items-center"
                          style={{ 
                            borderColor: isDarkMode ? '#374151' : '#f3f4f6',
                            backgroundColor: addFormData.eventDocumentType === type 
                              ? (isDarkMode ? '#2563eb' : '#dbeafe') 
                              : 'transparent'
                          }}
                          onPress={() => {
                            setAddFormData(prev => ({ ...prev, eventDocumentType: type }));
                            setShowDocTypes(false);
                          }}
                        >
                          <Text style={{ 
                            color: addFormData.eventDocumentType === type 
                              ? (isDarkMode ? '#ffffff' : '#2563eb') 
                              : (isDarkMode ? '#e5e7eb' : '#1f2937')
                          }}>
                            {type}
                          </Text>
                          {addFormData.eventDocumentType === type && (
                            <Ionicons name="checkmark" size={20} color={isDarkMode ? '#ffffff' : '#4361EE'} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              {/* Tarih seçiciler */}
              <Pressable
                onPress={() => openDatePicker('start')}
                className="border rounded p-3 mb-3"
                style={{ 
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#374151' : 'white'
                }}
              >
                <Text style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                  {translations[language]?.documents?.startDate || "Başlama tarixi"}: {formatDate(addFormData.eventStartDate.toISOString())}
                </Text>
              </Pressable>
              
              <Pressable
                onPress={() => openDatePicker('end')}
                className="border rounded p-3 mb-4"
                style={{ 
                  borderColor: isDarkMode ? '#374151' : '#e5e7eb',
                  backgroundColor: isDarkMode ? '#374151' : 'white'
                }}
              >
                <Text style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                  {translations[language]?.documents?.endDate || "Bitmə tarixi"}: {formatDate(addFormData.eventEndDate.toISOString())}
                </Text>
              </Pressable>
              
              {/* Dosya seçici */}
              <TouchableOpacity
                onPress={pickDocument}
                className="border-2 border-dashed p-3 rounded flex-row items-center justify-center mb-4"
                style={{ 
                  backgroundColor: isDarkMode ? '#3b82f6' : '#3b82f6',
                  borderColor: isDarkMode ? '#2563eb' : '#2563eb'
                }}
              >
                <Text className="font-bold mr-2" style={{ color: 'white' }}>
                  {selectedFile ? selectedFile.name : (translations[language]?.documents?.addDocument || "Sənəd əlavə et")}
                </Text>
                {!selectedFile && (
                  <MaterialIcons name="upload-file" size={24} color="white" />
                )}
              </TouchableOpacity>
              
              {docError && (
                <Text className="text-red-500 mb-3 text-center">{docError}</Text>
              )}
              
              {/* Butonlar */}
              <View className="flex-row justify-between mt-3">
                <TouchableOpacity
                  onPress={closeAddModal}
                  className="bg-red-500 py-3 px-5 rounded mr-2 flex-1 items-center"
                >
                  <Text className="text-white font-bold">
                    {translations[language]?.general?.cancel || "Ləğv et"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleAddDocument}
                  className="bg-green-500 py-3 px-5 rounded flex-1 items-center"
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-bold">
                      {translations[language]?.general?.confirm || "Təsdiq et"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Detay Modalı */}
      <Modal
        visible={detailModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={closeDetailModal}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">

          <View className="rounded-lg w-[92%] max-h-[85%] p-5" 
                style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}>
            <ScrollView showsVerticalScrollIndicator={false} className="w-full">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold flex-1" 
                      style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }}>
                  {translations[language]?.documents?.documentDetails || "Sənəd Detalları"}
                </Text>
                <TouchableOpacity onPress={closeDetailModal} className="p-1">
                  <AntDesign name="closecircle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              
              {detailDocument && (
                <>
                  {/* Belge görüntüsü */}
                  <View className="rounded-lg overflow-hidden mb-4 border bg-gray-200" 
                        style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
                    {detailDocument.documentUrl && detailDocument.documentUrl.toLowerCase().includes(".pdf") ? (
                      <View className="h-56 flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
                        <MaterialIcons name="picture-as-pdf" size={60} color="white" />
                        <Text className="text-white font-semibold mt-2">
                          {translations[language]?.documents?.pdfDocument || "PDF Sənədi"}
                        </Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: detailDocument.documentUrl }}
                        className="w-full h-60 "
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  
                  {/* Belge bilgileri */}
                  <View className="rounded-lg p-4 mb-4" 
                        style={{ backgroundColor: isDarkMode ? '#111827' : '#f9fafb' }}>
                    <Text className="text-base font-bold mb-3 pb-2 border-b" 
                          style={{ 
                            color: isDarkMode ? '#93c5fd' : '#1e40af', 
                            borderColor: isDarkMode ? '#374151' : '#e5e7eb' 
                          }}>
                      {detailDocument.eventContent || translations[language]?.documents?.documentName || "Sənəd adı"}
                    </Text>
                    
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="workspace-premium" size={16} color="#4361EE" style={{ width: 30 }} />
                      <Text className="text-sm font-semibold flex-1" 
                            style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {translations[language]?.documents?.documentType || "Sənəd növü"}: 
                        </Text>
                        {" "}{detailDocument.eventDocumentType || translations[language]?.documents?.certificate || "Sertifikat"}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center mb-3">
                      <MaterialCommunityIcons name="account-voice" size={16} color="#4361EE" style={{ width: 30 }} />
                      <Text className="text-sm font-semibold flex-1" 
                            style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {translations[language]?.documents?.eventType || "Tədbir növü"}: 
                        </Text>
                        {" "}{detailDocument.eventType || translations[language]?.documents?.eventType || "Tədbir növü"}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="business" size={16} color="#2E7D32" style={{ width: 30 }} />
                      <Text className="text-sm font-semibold flex-1" 
                            style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {translations[language]?.documents?.organizer || "Təşkilatçı"}: 
                        </Text>
                        {" "}{detailDocument.eventOwnerName || translations[language]?.documents?.organizerName || "Təşkilatçı adı"}
                      </Text>
                    </View>
                    
                    {(detailDocument.eventOrganiserId || detailDocument.eventId) && (
                      <View className="flex-row items-center mb-3">
                        <MaterialIcons name="language" size={16} color="#2E7D32" style={{ width: 30 }} />
                        <TouchableOpacity 
                          onPress={() => handleOrganiserLink(detailDocument.eventOrganiserId || detailDocument.eventId)}
                          className="flex-1"
                        >
                          <Text className="text-sm font-semibold underline" 
                                style={{ color: isDarkMode ? '#60a5fa' : '#3b82f6' }}>
                            <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280', textDecorationLine: 'none' }}>
                              {(detailDocument.eventOrganiserId || detailDocument.eventId).includes('.') 
                                ? (translations[language]?.documents?.organizerWebsite || "Təşkilatçı veb-saytı") + ": " 
                                : (translations[language]?.documents?.organizerId || "Təşkilatçı ID") + ": "}
                            </Text>
                            {" "}{detailDocument.eventOrganiserId && (translations[language]?.documents?.goToOrganizerProfile || 'Təşkilatçı profilinə keçid et') || detailDocument.eventId}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="event" size={16} color="#0891B2" style={{ width: 30 }} />
                      <Text className="text-sm font-semibold flex-1" 
                            style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {translations[language]?.documents?.startDate || "Başlama tarixi"}: 
                        </Text>
                        {" "}{detailDocument.eventStartDate ? formatDate(detailDocument.eventStartDate) : "01 Yanvar 2023"}
                      </Text>
                    </View>
                    
                    <View className="flex-row items-center mb-3">
                      <MaterialIcons name="event" size={16} color="#0891B2" style={{ width: 30 }} />
                      <Text className="text-sm font-semibold flex-1" 
                            style={{ color: isDarkMode ? '#e5e7eb' : '#1f2937' }}>
                        <Text style={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          {translations[language]?.documents?.endDate || "Bitmə tarixi"}: 
                        </Text>
                        {" "}{detailDocument.eventEndDate ? formatDate(detailDocument.eventEndDate) : "01 Yanvar 2023"}
                      </Text>
                    </View>
                    
                    {Boolean(detailDocument.documentConfirmed) && (
                      <View className="flex-row items-center mt-1">
                        <MaterialIcons name="verified" size={16} color="#34C759" style={{ width: 30 }} />
                        <Text className="text-sm font-semibold text-green-600 flex-1">
                          {translations[language]?.documents?.verifiedDocument || "Bu sənəd eventin tərəfindən təsdiq edilib"}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
              
              {/* Butonlar */}
              <View className="flex-row justify-between">
                <TouchableOpacity 
                  className="bg-blue-500 py-3 px-4 rounded flex-1 items-center mr-2 flex-row justify-center"
                  onPress={() => detailDocument && handleDownload(detailDocument.documentUrl)}
                >
                  <MaterialIcons name="file-download" size={20} color="white" />
                  <Text className="text-white font-bold ml-2">
                    {translations[language]?.documents?.download || "Endir"}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  className="bg-green-500 py-3 px-4 rounded flex-1 items-center mr-2 flex-row justify-center"
                  onPress={() => {
                    if (detailDocument) {
                      if (Platform.OS === 'web') {
                        window.open(detailDocument.documentUrl, '_blank');
                      } else {
                        Linking.openURL(detailDocument.documentUrl);
                      }
                    }
                  }}
                >
                  <MaterialIcons name="visibility" size={20} color="white" />
                  <Text className="text-white font-bold ml-2">
                    {translations[language]?.documents?.open || "Aç"}
                  </Text>
                </TouchableOpacity>
                
                {/* Silme butonu - Sadece belge onaylanmamışsa göster */}
                {detailDocument && !detailDocument.documentConfirmed && (
                  <TouchableOpacity 
                    className="bg-red-500 py-3 px-4 rounded flex-1 items-center flex-row justify-center"
                    onPress={() => {
                      closeDetailModal();
                      setTimeout(() => openDeleteModal(detailDocument), 300);
                    }}
                  >
                    <MaterialIcons name="delete" size={20} color="white" />
                    <Text className="text-white font-bold ml-2">
                      {translations[language]?.general?.delete || "Sil"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Tarih Seçici Modal */}
      <DatePicker />
    </SafeAreaView>
  );
}
