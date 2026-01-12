// app/home.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image, Modal,  StatusBar, TextInput, Switch, ScrollView, Linking } from "react-native";
import { useRouter } from "expo-router";
import { auth, db, storage } from "../../firebaseConfig";
import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc, collection, setDoc } from "firebase/firestore";
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useTheme, ThemeType } from '../../context/theme';
import { useThemeStyles } from '../components/theme-styles';
import { useLanguage, LanguageType, translations } from '../../context/language';

// Profil düzenleme modal bileşeni
const ProfileModalComponent = ({ visible, onClose, userData, onSave, loading }) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [localFullName, setLocalFullName] = useState(userData?.fullName || '');
  const [localPhone, setLocalPhone] = useState(userData?.phone || '');
  const [localFinCode, setLocalFinCode] = useState(userData?.finCode || '');
  const [localImage, setLocalImage] = useState(null);
  
  useEffect(() => {
    if (visible) {
      setLocalFullName(userData?.fullName || '');
      setLocalPhone(userData?.phone || '');
      setLocalFinCode(userData?.finCode || '');
      setLocalImage(null);
    }
  }, [visible, userData]);
  
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t.errors.errorTitle, t.errors.permissionDenied);
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      
      if (!result.canceled) {
        setLocalImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Resim seçilirken hata oluştu:", error);
      Alert.alert(t.errors.errorTitle, t.errors.imagePicking);
    }
  };
  
  const handleCancel = () => {
    setLocalImage(null);
    onClose();
  };
  
  const handleSave = () => {
    onSave({
      fullName: localFullName,
      phone: localPhone,
      finCode: localFinCode,
      selectedImage: localImage
    });
  };
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
      }}>
        <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl w-11/12 mx-2`}>
          <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {t.profile.profileInfo}
          </Text>
          
          {/* Logo Değiştirme */}
          <View className="items-center mb-5">
            <TouchableOpacity onPress={pickImage}>
              {localImage ? (
                <Image 
                  source={{ uri: localImage }} 
                  className="w-28 h-28 rounded-full"
                />
              ) : userData?.logoURL ? (
                <Image 
                  source={{ uri: userData.logoURL }} 
                  className="w-28 h-28 rounded-full"
                />
              ) : (
                <View className={`w-28 h-28 rounded-full ${isDarkMode ? 'bg-indigo-800' : 'bg-indigo-100'} items-center justify-center`}>
                  <Ionicons name="person" size={50} color={isDarkMode ? "#818cf8" : "#6366f1"} />
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-2">
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>
          
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.fullName}</Text>
          <TextInput
            className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 mb-4`}
            value={localFullName}
            onChangeText={setLocalFullName}
            placeholder={t.profile.fullName}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          />
          
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.phone}</Text>
          <TextInput
            className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 mb-4`}
            value={localPhone}
            onChangeText={setLocalPhone}
            placeholder={t.profile.phone}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            keyboardType="phone-pad"
          />
          
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>FIN {t.profile.code}</Text>
          <TextInput
            className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 mb-6`}
            value={localFinCode}
            onChangeText={setLocalFinCode}
            placeholder={`FIN ${t.profile.code}`}
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
          />
          
          <View className="flex-row justify-center">
            <TouchableOpacity 
              className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg mr-3`}
              onPress={handleCancel}
            >
              <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.profile.close}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-indigo-600 py-3 px-6 rounded-lg"
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-medium">{t.profile.save}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Şifre değiştirme modal bileşeni
const PasswordModalComponent = ({ visible, onClose, onChangePassword, loading }) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [localOldPassword, setLocalOldPassword] = useState('');
  const [localNewPassword, setLocalNewPassword] = useState('');
  const [localConfirmPassword, setLocalConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocalOldPassword('');
      setLocalNewPassword('');
      setLocalConfirmPassword('');
    }
  }, [visible]);
  
  const handleCancel = () => {
    onClose();
  };
  
  const handleSave = () => {
    onChangePassword({
      oldPassword: localOldPassword,
      newPassword: localNewPassword,
      confirmPassword: localConfirmPassword
    });
  };
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
      }}>
        <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl w-11/12 mx-2`}>
          <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{t.profile.passwordChange}</Text>
          
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.currentPassword}</Text>
          <View className={`flex-row items-center border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-1 mb-4`}>

          <TextInput
            className={`flex-1`}
            value={localOldPassword}  
            onChangeText={setLocalOldPassword}
            placeholder="********"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            secureTextEntry={!showOldPassword}
          />
              <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                <Ionicons 
                  name={showOldPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.newPassword}</Text>
          <View className={`flex-row items-center border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-1 mb-4`}>
          <TextInput
            className={`flex-1`}
            value={localNewPassword}
            onChangeText={setLocalNewPassword}
            placeholder="********"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            secureTextEntry={!showNewPassword}
          />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons 
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>

          
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.confirmPassword}</Text>
          <View className={`flex-row items-center border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-1 mb-4`}>
          <TextInput
            className={`flex-1`}
            value={localConfirmPassword}
            onChangeText={setLocalConfirmPassword}
            placeholder="********"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            secureTextEntry={!showConfirmPassword}
          />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
          <View className="flex-row justify-center">
            <TouchableOpacity 
              className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg mr-3`}
              onPress={handleCancel}
            >
              <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.profile.close}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-indigo-600 py-3 px-6 rounded-lg"
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-white font-medium">{t.profile.save}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Tema seçimi modal bileşeni
const ThemeModalComponent = ({ visible, onClose, currentTheme, onThemeChange }) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
      }}>
        <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl w-11/12 mx-2`}>
          <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {t.theme.title}
          </Text>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentTheme === ThemeType.LIGHT ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
            onPress={() => onThemeChange(ThemeType.LIGHT)}
          >
            <View className="flex-row items-center">
              <Ionicons name="sunny-outline" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
              <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>
                {t.theme.light}
              </Text>
            </View>
            {currentTheme === ThemeType.LIGHT && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentTheme === ThemeType.DARK ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
            onPress={() => onThemeChange(ThemeType.DARK)}
          >
            <View className="flex-row items-center">
              <Ionicons name="moon-outline" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
              <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>
                {t.theme.dark}
              </Text>
            </View>
            {currentTheme === ThemeType.DARK && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 ${currentTheme === ThemeType.SYSTEM ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
            onPress={() => onThemeChange(ThemeType.SYSTEM)}
          >
            <View className="flex-row items-center">
              <Ionicons name="phone-portrait-outline" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
              <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>
                {t.theme.system}
              </Text>
            </View>
            {currentTheme === ThemeType.SYSTEM && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
          </TouchableOpacity>
          
          <View className="flex-row justify-center mt-5">
            <TouchableOpacity 
              className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg`}
              onPress={onClose}
            >
              <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>
                {t.profile.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Dil seçimi modal bileşeni
const LanguageModalComponent = ({ visible, onClose, currentLanguage, onLanguageChange }) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
      }}>
        <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl w-11/12 mx-2`}>
          <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            {t.language.title}
          </Text>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentLanguage === LanguageType.AZERBAIJANI ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
            onPress={() => onLanguageChange(LanguageType.AZERBAIJANI)}
          >
            <View className="flex-row items-center">
              <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>
                {t.language.azerbaijani}
              </Text>
            </View>
            {currentLanguage === LanguageType.AZERBAIJANI && 
              <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            }
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentLanguage === LanguageType.ENGLISH ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
            onPress={() => onLanguageChange(LanguageType.ENGLISH)}
          >
            <View className="flex-row items-center">
              <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>
                {t.language.english}
              </Text>
            </View>
            {currentLanguage === LanguageType.ENGLISH && 
              <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            }
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-row items-center justify-between p-4 ${currentLanguage === LanguageType.RUSSIAN ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
            onPress={() => onLanguageChange(LanguageType.RUSSIAN)}
          >
            <View className="flex-row items-center">
              <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>
                {t.language.russian}
              </Text>
            </View>
            {currentLanguage === LanguageType.RUSSIAN && 
              <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            }
          </TouchableOpacity>
          
          <View className="flex-row justify-center mt-5">
            <TouchableOpacity 
              className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg`}
              onPress={onClose}
            >
              <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>
                {t.profile.close}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// İletişim modal bileşeni
const ContactModalComponent = ({ visible, onClose, defaultEmail, defaultPhone, onSubmit, loading, mesajGonderildi, xeta }) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  
  const [localEmail, setLocalEmail] = useState(defaultEmail || '');
  const [localPhone, setLocalPhone] = useState(defaultPhone || '');
  const [localMesaj, setLocalMesaj] = useState('');
  
  useEffect(() => {
    if (visible) {
      setLocalEmail(defaultEmail || '');
      setLocalPhone(defaultPhone || '');
      setLocalMesaj('');
    }
  }, [visible, defaultEmail, defaultPhone]);
  
  useEffect(() => {
    if (mesajGonderildi) {
      setLocalMesaj('');
      
      // Başarılı mesaj gönderiminden 3 saniye sonra modalı kapat
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [mesajGonderildi, onClose]);
  
  const handleCancel = () => {
    onClose();
  };
  
  const handleSubmit = () => {
    onSubmit({
      email: localEmail,
      phone: localPhone,
      mesaj: localMesaj
    });
  };
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
      }}>
        <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl w-11/12 max-h-5/6`}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className={`text-xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{t.profile.contact}</Text>
            
            {/* Sosyal Medya İkonları */}
            <View className="w-full flex-row justify-center gap-4 mb-8">
              <TouchableOpacity onPress={() => Linking.openURL('https://t.me/+994705975727')}>
                <FontAwesome name="telegram" size={40} color="#0088cc" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => Linking.openURL('https://instagram.com/eventin.az')}>
                <FontAwesome name="instagram" size={40} color="#E1306C" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => Linking.openURL('mailto:info@eventin.az')}>
                <MaterialCommunityIcons name="email" size={40} color="#D44638" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => Linking.openURL('https://linkedin.com/company/eventinaz/about/?viewAsMember=true')}>
                <FontAwesome name="linkedin-square" size={40} color="#0077B5" />
              </TouchableOpacity>
            </View>
            
            {mesajGonderildi ? (
              <Text className="text-green-600 mb-4 text-center">{mesajGonderildi}</Text>
            ) : null}
            
            {xeta ? (
              <Text className="text-red-600 mb-4 text-center">{xeta}</Text>
            ) : null}
            
            <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.email}</Text>
            <TextInput
              className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 mb-4`}
              value={localEmail}
              onChangeText={setLocalEmail}
              placeholder={t.profile.email}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              keyboardType="email-address"
              editable={!loading}
            />
            
            <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.phone}</Text>
            <TextInput
              className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 mb-4`}
              value={localPhone}
              onChangeText={setLocalPhone}
              placeholder={t.profile.phone}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              keyboardType="phone-pad"
              editable={!loading}
            />
            
            <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.yourMessage}</Text>
            <TextInput
              className={`border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-black'} rounded-lg p-3 mb-6`}
              value={localMesaj}
              onChangeText={setLocalMesaj}
              placeholder={t.profile.yourMessage}
              placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
              multiline={true}
              numberOfLines={5}
              textAlignVertical="top"
              editable={!loading}
              style={{ minHeight: 100 }}
            />
            
            <View className="flex-row justify-center mb-3">
              <TouchableOpacity 
                className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg mr-3`}
                onPress={handleCancel}
                disabled={loading}
              >
                <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.profile.close}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`${(loading || !localEmail || !localPhone || !localMesaj) ? 'bg-indigo-400' : 'bg-indigo-600'} py-3 px-6 rounded-lg`}
                onPress={handleSubmit}
                disabled={loading || !localEmail || !localPhone || !localMesaj}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-medium">{t.profile.send}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);
  
  // Theme context
  const { theme, setTheme, isDarkMode } = useTheme();
  const { colors, pageStyles, cardStyles, textStyles } = useThemeStyles();
  
  // Language context
  const { language, setLanguage } = useLanguage();
  const t = translations[language];
  
  // Modal durumları
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  // Form verileri 
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    finCode: ''
  });
  
  // İletişim formu sonuç mesajları
  const [mesajGonderildi, setMesajGonderildi] = useState("");
  const [xeta, setXeta] = useState("");
  
  // Kullanıcı ID'sini saklamak için
  const [userId, setUserId] = useState(null);

  // Çıkış modalı state'i
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        
        if (user) {
          // Auth'dan kullanıcı ID'sini ayarla
          setUserId(user.uid);
          
          // Firestore'dan kullanıcı verilerini al
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            setProfileForm({
              fullName: data.fullName || '',
              phone: data.phone || '',
              finCode: data.finCode || ''
            });
          } else {
            // Firestore'da kayıt yoksa, Auth verilerini kullan
            const defaultData = {
              fullName: user.displayName || "İstifadəçi",
              email: user.email,
              logoURL: user.photoURL
            };
            setUserData(defaultData);
            setProfileForm({
              fullName: defaultData.fullName || '',
              phone: '',
              finCode: ''
            });
          }
        } else {
          // Kullanıcı oturum açmamış, giriş sayfasına yönlendir
          router.replace("/");
        }
      } catch (error) {
        console.error("Kullanıcı bilgileri alınamadı:", error);
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // Firebase'den çıkış yap
      await signOut(auth);
      
      // UserId'yi de temizle
      setUserId(null);
      
      // Login sayfasına yönlendir
      router.replace("/");
    } catch (error) {
      console.error("Çıkış yaparken hata oluştu:", error);
      Alert.alert(t.errors.errorTitle, t.errors.logoutFailed);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri) => {
    try {
      // userId yoksa işlem yapma
      if (!userId) return null;
      
      // Dosyayı al
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Dosyayı yükle
      const fileRef = ref(storage, `logos/${userId}`);
      await uploadBytes(fileRef, blob);
      
      // URL'yi al
      const downloadURL = await getDownloadURL(fileRef);
      return downloadURL;
    } catch (error) {
      console.error("Logo yüklenirken hata oluştu:", error);
      throw error;
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      setLoading(true);
      
      // userId kontrolü
      if (!userId) {
        Alert.alert(t.errors.errorTitle, t.errors.userNotFound);
        setLoading(false);
        return;
      }
      
      let logoURL = userData?.logoURL;
      
      // Eğer yeni resim seçildiyse, yükle
      if (formData.selectedImage) {
        logoURL = await uploadImage(formData.selectedImage);
      }
      
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        fullName: formData.fullName,
        phone: formData.phone,
        finCode: formData.finCode,
        logoURL: logoURL
      });
      
      // UserData state'ini güncelle
      setUserData(prev => ({
        ...prev,
        fullName: formData.fullName,
        phone: formData.phone,
        finCode: formData.finCode,
        logoURL: logoURL
      }));
      
      Alert.alert(t.profile.successTitle, t.profile.profileUpdated);
      setProfileModalVisible(false);
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      Alert.alert(t.errors.errorTitle, t.errors.profileUpdateFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (passwordData) => {
    try {
      setLoading(true);
      
      // Şifre kontrolü
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        Alert.alert(t.errors.errorTitle, t.errors.passwordMatch);
        setLoading(false);
        return;
      }
      
      const user = auth.currentUser;
      
      if (user) {
        try {
          // 1) Yeniden kimlik doğrulama için credential oluştur
          const credential = EmailAuthProvider.credential(
            user.email,
            passwordData.oldPassword
          );
          
          // 2) Kullanıcıyı yeniden doğrula (reauthenticate)
          await reauthenticateWithCredential(user, credential);
          
          // 3) Şifreyi güncelle
          await updatePassword(user, passwordData.newPassword);
          
          Alert.alert(t.profile.successTitle, t.profile.passwordUpdated);
          setPasswordModalVisible(false);
        } catch (error) {
          console.error("Şifre değiştirme hatası:", error);
          let errorMessage = t.errors.passwordChangeFailed;
          
          if (error.code === "auth/wrong-password") {
            errorMessage = t.errors.wrongPassword;
          } else if (error.code === "auth/requires-recent-login") {
            errorMessage = t.errors.requiresRecentLogin || "Bu işlem için yakın zamanda oturum açmış olmanız gerekiyor.";
          }
          
          Alert.alert(t.errors.errorTitle, errorMessage);
        }
      }
    } catch (error) {
      console.error("Şifre değiştirme işleminde genel hata:", error);
      Alert.alert(t.errors.errorTitle, t.errors.passwordChangeFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContact = async (contactData) => {
    setLoading(true);
    setXeta("");
    setMesajGonderildi("");
    try {
      const user = auth.currentUser;
      // Kullanıcı ID'sini Firebase auth'dan al
      let currentUserId = user ? user.uid : null;
      
      const yeniKontaktRef = doc(collection(db, "contacts"));
      await setDoc(yeniKontaktRef, {
        email: contactData.email,
        phone: contactData.phone,
        mesaj: contactData.mesaj,
        createdTime: new Date(),
        checked: false,
        userId: currentUserId
      });
      
      setMesajGonderildi("Mesajınız uğurla göndərildi!");
    
    } catch (err) {
      console.error("Mesaj göndərilərkən xəta baş verdi:", err);
      setXeta("Mesaj göndərilərkən xəta baş verdi.");
    }
    setLoading(false);
  };

  // Tema değiştirme fonksiyonu
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setThemeModalVisible(false);
  };
  
  // Dil değiştirme fonksiyonu
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setLanguageModalVisible(false);
  };

  // Placeholder bileşeni
  const ProfilePlaceholder = () => (
    <View className="items-center mt-10 mb-8">
      <View className={`mb-4 w-24 h-24 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></View>
      <View className={`w-40 h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-1`}></View>
      <View className={`w-32 h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-6`}></View>
    </View>
  );

  // Profil bilgileri bileşeni
  const ProfileInfo = () => (
      <View className="items-center mt-10 mb-8">
        {/* Profil Resmi */}
        <View className="mb-4">
          {userData?.logoURL ? (
            <Image 
              source={{ uri: userData.logoURL }} 
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <View className={`w-24 h-24 rounded-full ${isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100'} items-center justify-center`}>
              <Ionicons name="person" size={50} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            </View>
          )}
        </View>
        
        {/* Kullanıcı Adı */}
        <Text className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} mb-1`}>
          {userData?.fullName || "İstifadəçi"}
        </Text>
        
        {/* Email */}
        <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
          {userData?.email || ""}
        </Text>
      </View>
  );

  return (
   
    <ScrollView className={isDarkMode ? "flex-1 bg-gray-900" : "flex-1 bg-gray-50"}>
     <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
      <View className="p-4">
        {/* Profil Bilgileri */}
        {loadingUserData ? <ProfilePlaceholder /> : <ProfileInfo />}
      
      {/* Ayarlar Bölümü */}
      <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl px-4 py-1 mb-6 shadow-sm`}>
          {/* Tedbirlerim */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => router.push('/user-events')}
          >
            <Ionicons name="calendar-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.myEvents}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          {/* Biletlerim */}
          {/* <TouchableOpacity className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <Ionicons name="ticket-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.myTickets}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
           */}
          {/* Profil Bilgileri */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => setProfileModalVisible(true)}
          >
          <Ionicons name="person-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
          <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {t.profile.profileInfo}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        
          {/* Şifre Değiştirme */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => setPasswordModalVisible(true)}
          >
          <Ionicons name="lock-closed-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
          <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {t.profile.passwordChange}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        
          {/* Bildirisler */}
          {/* <TouchableOpacity className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <Ionicons name="notifications-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
          <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {t.profile.notifications}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity> */}
          
          {/* Tema */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => setThemeModalVisible(true)}
          >
            <Ionicons name="contrast-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.theme}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          {/* Dil */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => setLanguageModalVisible(true)}
          >
            <Ionicons name="language-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.language}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          {/* Elaqe */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => setContactModalVisible(true)}
          >
            <Ionicons name="call-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.contact}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          {/* Hesabdan Çıxış */}
          <TouchableOpacity
            className="flex-row items-center py-3"
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text className="ml-3 text-red-500 font-semibold">
              {t.profile.logout}
            </Text>
          </TouchableOpacity>
      </View>

      {/* Modallar */}
      <ProfileModalComponent 
        visible={profileModalVisible} 
        onClose={() => setProfileModalVisible(false)} 
        userData={userData} 
        onSave={handleUpdateProfile}
        loading={loading}
      />
      
      <PasswordModalComponent 
        visible={passwordModalVisible} 
        onClose={() => setPasswordModalVisible(false)} 
        onChangePassword={handleChangePassword}
        loading={loading}
      />
      
      <ThemeModalComponent 
        visible={themeModalVisible} 
        onClose={() => setThemeModalVisible(false)} 
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />
      
      <LanguageModalComponent 
        visible={languageModalVisible} 
        onClose={() => setLanguageModalVisible(false)} 
        currentLanguage={language}
        onLanguageChange={handleLanguageChange}
      />
      
      <ContactModalComponent 
        visible={contactModalVisible} 
        onClose={() => {
          setMesajGonderildi("");
          setXeta("");
          setContactModalVisible(false);
        }} 
        defaultEmail={userData?.email || ""}
        defaultPhone={userData?.phone || ""}
        onSubmit={handleSubmitContact}
        loading={loading}
        mesajGonderildi={mesajGonderildi}
        xeta={xeta}
      />
      
      {/* Çıkış Onay Modalı */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: 20,
        }}>
          <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl w-11/12 mx-2`}>
            <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              {t.profile.logoutConfirmTitle || "Hesabdan çıxış"}
            </Text>
            
            <Text className={`mb-6 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.logoutConfirmMessage || "Hesabdan çıxış etmək istədiyinizə əminsiniz?"}
            </Text>
            
            <View className="flex-row justify-center">
              <TouchableOpacity 
                className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg mr-3`}
                onPress={() => setShowLogoutModal(false)}
                disabled={loading}
              >
                <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>
                  {t.general.cancel}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-red-500 py-3 px-6 rounded-lg min-w-20"
                onPress={handleLogout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-medium">
                    {t.general.confirm}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </ScrollView>
  );
}
