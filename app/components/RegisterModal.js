import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,

  StatusBar,
  Dimensions,
  Animated,
  Linking,
  Switch
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc, updateDoc, increment, collection, serverTimestamp, getDoc,addDoc } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { useTheme } from '../../context/theme';
import { useLanguage, translations } from '../../context/language';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function RegisterModal({ 
  isVisible, 
  onClose, 
  event, 
  onRegisterSuccess,
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [finCode, setFinCode] = useState('');
  const [age, setAge] = useState('');
  const [degree, setDegree] = useState('');
  const [work, setWork] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(event.noPlace ? true : false);
  const [error, setError] = useState('');
  const [showDegrees, setShowDegrees] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  // Eğitim dereceleri için seçenekler
  const degrees = [
    "Ali təhsil",
    "Doktorantura", 
    "Magistratura", 
    "Peşə-ixtisas təhsili", 
    "Ümumi orta təhsil", 
    "Tam orta təhsil"
  ];

  useEffect(() => {
    if (isVisible) {
      // Görünür olduğunda sağdan sola animasyon başlat
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Kapanırken soldan sağa animasyon başlat
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').width,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const handleCloseWithAnimation = () => {
    Animated.timing(slideAnim, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Kullanıcı oturumunu kontrol et ve kullanıcı verilerini getir
  useEffect(() => {
    const checkUserAndGetData = async () => {
      setLoadingUserData(true);
      try {
        // Önce auth'dan kullanıcıyı kontrol et
        if (auth.currentUser) {
          setCurrentUser(auth.currentUser);
          await fetchUserDataFromFirestore(auth.currentUser.uid);
        } else {
          // Auth'da yoksa AsyncStorage'dan kontrol et
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setCurrentUser(parsedUser);
            await fetchUserDataFromFirestore(parsedUser.uid);
          }
        }
      } catch (error) {
        console.error("Kullanıcı bilgileri alınamadı:", error);
      } finally {
        setLoadingUserData(false);
      }
    };

    checkUserAndGetData();
  }, []);

  // Firestore'dan kullanıcı verisini getir
  const fetchUserDataFromFirestore = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userSnap = await getDoc(userDocRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserData(userData);
        setName(userData.fullName || '');
        setEmail(userData.email || '');
        setPhone(userData.phone || '');
        setFinCode(userData.finCode || '');
        return userData;
      }
      return null;
    } catch (error) {
      console.error("Firestore'dan kullanıcı verileri alınamadı:", error);
      return null;
    }
  };

  const handlePhoneFocus = () => {
    if (!phone) {
      setPhone('+994');
    }
  };

  const handlePhoneBlur = () => {
    if (phone === '+994') {
      setPhone('');
    }
  };

  const handlePhoneChange = (value) => {
    // Sadece sayılar ve + karakterine izin ver
    const sanitizedValue = value.replace(/[^\d+]/g, '');
    
    if (sanitizedValue.startsWith('+994')) {
      const numberPart = sanitizedValue.slice(4);
      if (numberPart.length <= 9) {
        setPhone(sanitizedValue);
      }
    } else if (sanitizedValue === '+') {
      setPhone(sanitizedValue);
    }
  };

  const handleFinCodeChange = (value) => {
    // Boşlukları kaldır ve büyük harfe çevir
    const formattedValue = value.replace(/\s/g, '').toUpperCase();
    if (formattedValue.length <= 7) {
      setFinCode(formattedValue);
    }
  };

  const handleAgeChange = (value) => {
    // Sadece sayılara izin ver ve maksimum 2 karakter
    const numberValue = value.replace(/\D/g, '');
    if (numberValue.length <= 2) {
      setAge(numberValue);
    }
  };

  // Kullanıcı kaydını gerçekleştir
  const handleRegister = async () => {
    // Form validasyonu
    setError('');
    
    if (!currentUser) {
      Alert.alert("Xəta", t.registerModal.error.requiredLogin);
      return;
    }

    if (!event?.noPlace && !acceptedTerms) {
      setError(t.registerModal.error.acceptTerms);
      return;
    }

    if (!name.trim().includes(" ")) {
      setError(t.registerModal.error.invalidName);
      return;
    }

    if (event?.registerUserFIN && finCode.length !== 7) {
      setError(t.registerModal.error.invalidFinCode);
      return;
    }

    if (phone.length !== 13) {
      setError(t.registerModal.error.invalidPhone);
      return;
    }

    if (!event?.noPlace && (!name || !email || !phone)) {
      Alert.alert("Xəta", t.registerModal.error.fillAllFields);
      return;
    }

    setLoading(true);

    try {
      const userId = currentUser.uid;
      const registrationData = {
        userId,
        eventId: event.id,
        fullName: name,
        email,
        phone,
        finCode,
        age,
        degree,
        work,
        status: "accepted",
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, "events", event.id, "registeredUsers"), {
        ...registrationData,
      });
      await addDoc(
        collection(db, "users", userId, "userRegisteredEvents"),
        {
          eventId: event.id,
          registeredAt: serverTimestamp(),
        }
      );
      // Kullanıcıyı kaydedici
      // const registrationRef = doc(
      //   collection(db, "events", event.id, "registeredUsers")
      // );
      
      // await setDoc(registrationRef, registrationData);

      // // Kullanıcının kayıtlı etkinliklerine ekle
      // await setDoc(
      //   doc(collection(db, "users", userId, "userRegisteredEvents"), event.id),
      //   {
      //     eventId: event.id,
      //     registeredAt: serverTimestamp(),
      //   }
      // );

      // Etkinliğin kayıt sayısını güncelle
      // if (!event?.noPlace && event.totalPlace !== 10000) {
      //   await updateDoc(doc(db, "events", event.id), {
      //     currentPlace: increment(-1)
      //   });
      // }
      
      Alert.alert(
        t.registerModal.successTitle, 
        event.noPlace ? t.registerModal.participateSuccess : t.registerModal.registerSuccess,
        [
          {
            text: t.registerModal.goToMyEvents,
            onPress: () => {
              onRegisterSuccess();
              handleCloseWithAnimation();
              router.push('/user-events');
            },
          }
        ]
      );
    } catch (error) {
      console.error("Qeydiyyat xətası:", error);
      Alert.alert("Xəta", t.registerModal.error.registrationError);
    } finally {
      setLoading(false);
    }
  };

  const openTermsAndConditions = () => {
    Linking.openURL('https://eventin.az/pdfs/qaydalar.pdf');
  };

  if (!isVisible) return null;

  // Dropdown stilleri 
  const dropdownStyles = {
    dropdownButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 8,
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
      backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
    },
    dropdownButtonText: {
      fontSize: 15,
      color: isDarkMode ? '#F9FAFB' : '#111827',
    },
    dropdownList: {
      borderWidth: 1,
      borderRadius: 8,
      marginTop: -4,
      marginBottom: 12,
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      maxHeight: 200,
    },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#374151' : '#F3F4F6',
    },
    selectedDropdownItem: {
      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
    },
    dropdownItemText: {
      fontSize: 15,
      color: isDarkMode ? '#F9FAFB' : '#111827',
    },
    selectedDropdownItemText: {
      color: isDarkMode ? '#818CF8' : '#4F46E5',
      fontWeight: 'bold',
    },
  };


  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleCloseWithAnimation}
      presentationStyle="overFullScreen"
    >
      <Animated.View 
        style={{
          flex: 1,
          backgroundColor: isDarkMode ? '#111827' : '#fff',
          transform: [{ translateX: slideAnim }]
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#fff"} />
          
          {/* Başlık ve Geri Butonu */}
          <View className={`flex-row items-center px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <TouchableOpacity onPress={handleCloseWithAnimation} className="p-2 -ml-2">
              <Ionicons name="arrow-back" size={24} color={isDarkMode ? "#fff" : "#333"} />
            </TouchableOpacity>
            <Text className={`text-[20px] font-bold text-center ml-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
             {t.registerModal.title}
            </Text>
          </View>
          
          {/* İçerik */}
          <ScrollView className="flex-1 px-4">

            <View className="py-4">
                         <Text className={`text-sm  text-center  mb-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                    {t.registerModal.profileNote}
                  </Text>
              {/* Ad Soyad */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.fullName}
                  </Text>
                  
                </View>
                <TextInput
                  className={`border p-3 rounded-lg text-[15px] ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-white opacity-70' 
                      : 'border-gray-300 bg-gray-100 text-gray-800 opacity-70'
                  }`}
                  value={loadingUserData ? "" : name}
                  editable={false}
                  placeholder={loadingUserData ? t.registerModal.loading : ""}
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#9ca3af"}
                />
              </View>
              
              {/* E-posta */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.email}
                  </Text>
                  
                </View>
                <TextInput
                  className={`border p-3 rounded-lg text-[15px] ${
                    isDarkMode 
                      ? 'border-gray-600 bg-gray-700 text-white opacity-70' 
                      : 'border-gray-300 bg-gray-100 text-gray-800 opacity-70'
                  }`}
                  value={loadingUserData ? "" : email}
                  editable={false}
                  placeholder={loadingUserData ? t.registerModal.loading : ""}
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#9ca3af"}
                />
              </View>
              
              {/* Telefon */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.phone}
                  </Text>
             
                </View>
                <TextInput
                  className={`border p-3 rounded-lg text-[15px] ${
                    loadingUserData ? (
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white opacity-50' 
                        : 'border-gray-300 bg-gray-100 text-gray-800 opacity-50'
                    ) : userData?.phone ? (
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white opacity-70' 
                        : 'border-gray-300 bg-gray-100 text-gray-800 opacity-70'
                    ) : (
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-800'
                    )
                  }`}
                  placeholder={loadingUserData ? t.registerModal.loading : t.registerModal.enterPhone}
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#9ca3af"}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onFocus={handlePhoneFocus}
                  onBlur={handlePhoneBlur}
                  maxLength={13}
                  editable={!loadingUserData && !userData?.phone}
                />
              </View>
              
              {/* FIN Kodu */}
              {event?.registerUserFIN && (
                <View className="mb-4">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.finCode}
                  </Text>
                  <TextInput
                    className={`border p-3 rounded-lg text-[15px] ${
                      userData?.finCode ? (
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white opacity-70' 
                        : 'border-gray-300 bg-gray-100 text-gray-800 opacity-70'
                      ) : (
                        isDarkMode 
                          ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-800'
                      )
                    }`}
                    placeholder={t.registerModal.enterFinCode}
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#9ca3af"}
                    value={finCode}
                    onChangeText={handleFinCodeChange}
                    maxLength={7}
                    editable={!userData?.finCode}
                  />
                </View>
              )}
              
              {/* Yaş */}
              {event?.registerUserAge && (
                <View className="mb-4">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.age}
                  </Text>
                  <TextInput
                    className={`border p-3 rounded-lg text-[15px] ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-800'
                    }`}
                    placeholder={t.registerModal.enterAge}
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#9ca3af"}
                    keyboardType="numeric"
                    value={age}
                    onChangeText={handleAgeChange}
                    maxLength={2}
                  />
                </View>
              )}
              
              {/* Eğitim Durumu - GlobalModal'daki gibi özel dropdown */}
              {event?.registerUserDegree && (
                <View className="mb-4">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.education}
                  </Text>
                  
                  <TouchableOpacity 
                    style={dropdownStyles.dropdownButton}
                    onPress={() => setShowDegrees(!showDegrees)}
                  >
                    <Text style={dropdownStyles.dropdownButtonText}>
                      {degree || t.registerModal.selectEducation}
                    </Text>
                    <Ionicons 
                      name={showDegrees ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color={isDarkMode ? "#E5E7EB" : "#444"}
                    />
                  </TouchableOpacity>
                  
                  {showDegrees && (
                    <View style={dropdownStyles.dropdownList}>
                      <ScrollView 
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        {degrees.map((item, index) => (
                          <TouchableOpacity 
                            key={index}
                            style={[
                              dropdownStyles.dropdownItem,
                              degree === item && dropdownStyles.selectedDropdownItem
                            ]}
                            onPress={() => {
                              setDegree(item);
                              setShowDegrees(false);
                            }}
                          >
                            <Text 
                              style={[
                                dropdownStyles.dropdownItemText,
                                degree === item && dropdownStyles.selectedDropdownItemText
                              ]}
                            >
                              {item}
                            </Text>
                            
                            {degree === item && (
                              <Ionicons 
                                name="checkmark" 
                                size={20} 
                                color={isDarkMode ? "#818CF8" : "#4F46E5"} 
                              />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
              
              {/* İş/Meslek */}
              {event?.registerUserWork && (
                <View className="mb-6">
                  <Text className={`text-[15px] font-semibold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                    {t.registerModal.work} <Text className="text-gray-400">{t.registerModal.workOptional}</Text>
                  </Text>
                  <TextInput
                    className={`border p-3 rounded-lg text-[15px] ${
                      isDarkMode 
                        ? 'border-gray-600 bg-gray-700 text-white' 
                        : 'border-gray-300 bg-white text-gray-800'
                    }`}
                    placeholder={t.registerModal.enterWorkplace}
                    placeholderTextColor={isDarkMode ? "#9ca3af" : "#9ca3af"}
                    value={work}
                    required={true}
                    onChangeText={setWork}
                  />
                </View>
              )}
              
              {/* Şartlar ve Koşullar */}
              {!event?.noPlace && <View className="flex-row items-center mb-6">
                <Switch
                  trackColor={{ false: "#767577", true: "#6366f1" }}
                  thumbColor={acceptedTerms ? "#f4f3f4" : "#f4f3f4"}
                  onValueChange={setAcceptedTerms}
                  value={acceptedTerms}
                />
                <Text className={`ml-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Text onPress={openTermsAndConditions} className="text-blue-500 underline">
                    {event?.noPlace ? t.registerModal.participationTerms : t.registerModal.registrationTerms}
                  </Text> {t.registerModal.acceptTerms}
                </Text>
              </View>}

              {/* Hata Mesajı */}
              {error ? (
                <Text className="text-red-500 text-center mb-4">{error}</Text>
              ) : null}
            </View>
          </ScrollView>
          
          {/* Alt Butonlar */}
          <View className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <TouchableOpacity 
              className={`bg-indigo-500 py-4 rounded-lg items-center ${loadingUserData ? 'opacity-70' : ''}`}
              onPress={handleRegister}
              disabled={loading || loadingUserData}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-[16px]">
                  {event?.noPlace ? t.registerModal.participate : t.registerModal.register}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
} 