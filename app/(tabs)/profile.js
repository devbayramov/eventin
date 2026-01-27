import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from "@gorhom/bottom-sheet";
import { FontAwesome, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, signOut, updatePassword } from "firebase/auth";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// Custom background komponenti
const CustomBackground = ({ isDarkMode, style }) => (
  <View style={[style, { backgroundColor: isDarkMode ? '#1f2937' : '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }]} />
);
import { useAuth } from '../../context/auth';
import { LanguageType, translations, useLanguage } from '../../context/language';
import { useNotifications } from '../../context/notifications';
import { ThemeType, useTheme } from '../../context/theme';
import { auth, db, storage } from "../../firebaseConfig";
import { useThemeStyles } from '../../utils/theme-styles';
 import { sendNotificationToUser } from '../../utils/sendNotification';                                                                 
  
const ProfileModalComponent = forwardRef(({ onDismiss, userData, onSave, loading }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const [localFullName, setLocalFullName] = useState(userData?.fullName || '');
  const [localPhone, setLocalPhone] = useState(userData?.phone || '');
  const [localFinCode, setLocalFinCode] = useState(userData?.finCode || '');
  const [localImage, setLocalImage] = useState(null);

  const resetForm = useCallback(() => {
    setLocalFullName(userData?.fullName || '');
    setLocalPhone(userData?.phone || '');
    setLocalFinCode(userData?.finCode || '');
    setLocalImage(null);
  }, [userData]);

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
    ref.current?.dismiss();
  };

  const handleSave = () => {
    onSave({
      fullName: localFullName,
      phone: localPhone,
      finCode: localFinCode,
      selectedImage: localImage
    });
  };

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={['60%', '90%']}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      onChange={(index) => { if (index === 0) resetForm(); }}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {t.profile.profileInfo}
        </Text>

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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const PasswordModalComponent = forwardRef(({ onDismiss, onChangePassword, loading }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  const [localOldPassword, setLocalOldPassword] = useState('');
  const [localNewPassword, setLocalNewPassword] = useState('');
  const [localConfirmPassword, setLocalConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCancel = () => {
    ref.current?.dismiss();
  };

  const handleSave = () => {
    onChangePassword({
      oldPassword: localOldPassword,
      newPassword: localNewPassword,
      confirmPassword: localConfirmPassword
    });
  };

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{t.profile.passwordChange}</Text>

        <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.currentPassword}</Text>
        <View className={`flex-row items-center border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'} rounded-lg p-1 mb-4`}>
          <TextInput
            className="flex-1"
            value={localOldPassword}
            onChangeText={setLocalOldPassword}
            placeholder="********"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            secureTextEntry={!showOldPassword}
          />
          <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
            <Ionicons name={showOldPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.newPassword}</Text>
        <View className={`flex-row items-center border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'} rounded-lg p-1 mb-4`}>
          <TextInput
            className="flex-1"
            value={localNewPassword}
            onChangeText={setLocalNewPassword}
            placeholder="********"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            secureTextEntry={!showNewPassword}
          />
          <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
            <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-1`}>{t.profile.confirmPassword}</Text>
        <View className={`flex-row items-center border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'} rounded-lg p-1 mb-4`}>
          <TextInput
            className="flex-1"
            value={localConfirmPassword}
            onChangeText={setLocalConfirmPassword}
            placeholder="********"
            placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#6b7280" />
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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const ThemeModalComponent = forwardRef(({ onDismiss, currentTheme, onThemeChange }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['45%', '90%'], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetView style={{ flex: 1, padding: 24 }}>
        <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {t.theme.title}
        </Text>

        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentTheme === ThemeType.LIGHT ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
          onPress={() => onThemeChange(ThemeType.LIGHT)}
        >
          <View className="flex-row items-center">
            <Ionicons name="sunny-outline" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>{t.theme.light}</Text>
          </View>
          {currentTheme === ThemeType.LIGHT && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentTheme === ThemeType.DARK ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
          onPress={() => onThemeChange(ThemeType.DARK)}
        >
          <View className="flex-row items-center">
            <Ionicons name="moon-outline" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>{t.theme.dark}</Text>
          </View>
          {currentTheme === ThemeType.DARK && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 ${currentTheme === ThemeType.SYSTEM ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
          onPress={() => onThemeChange(ThemeType.SYSTEM)}
        >
          <View className="flex-row items-center">
            <Ionicons name="phone-portrait-outline" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>{t.theme.system}</Text>
          </View>
          {currentTheme === ThemeType.SYSTEM && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-5">
          <TouchableOpacity
            className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg`}
            onPress={() => ref.current?.dismiss()}
          >
            <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.profile.close}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const LanguageModalComponent = forwardRef(({ onDismiss, currentLanguage, onLanguageChange }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['45%', '90%'], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetView style={{ flex: 1, padding: 24 }}>
        <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {t.language.title}
        </Text>

        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentLanguage === LanguageType.AZERBAIJANI ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
          onPress={() => onLanguageChange(LanguageType.AZERBAIJANI)}
        >
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>{t.language.azerbaijani}</Text>
          {currentLanguage === LanguageType.AZERBAIJANI && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} ${currentLanguage === LanguageType.ENGLISH ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
          onPress={() => onLanguageChange(LanguageType.ENGLISH)}
        >
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>{t.language.english}</Text>
          {currentLanguage === LanguageType.ENGLISH && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-row items-center justify-between p-4 ${currentLanguage === LanguageType.RUSSIAN ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
          onPress={() => onLanguageChange(LanguageType.RUSSIAN)}
        >
          <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base`}>{t.language.russian}</Text>
          {currentLanguage === LanguageType.RUSSIAN && <Ionicons name="checkmark" size={24} color={isDarkMode ? "#818cf8" : "#6366f1"} />}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-5">
          <TouchableOpacity
            className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg`}
            onPress={() => ref.current?.dismiss()}
          >
            <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.profile.close}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const NotificationsModalComponent = forwardRef(({ onDismiss, settings, onUpdateSetting, onToggleAll }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['55%', '90%'], []);

  const NotificationSwitch = ({ label, value, onToggle, isMain = false }) => (
    <TouchableOpacity
      className={`flex-row items-center justify-between p-4 ${!isMain ? `border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}` : ''} ${value ? isDarkMode ? 'bg-gray-700' : 'bg-indigo-50' : ''}`}
      onPress={() => onToggle(!value)}
    >
      <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'} text-base ${isMain ? 'font-semibold' : ''}`}>
        {label}
      </Text>
      <View className={`w-12 h-7 rounded-full ${value ? 'bg-indigo-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} justify-center`}>
        <View className={`w-5 h-5 rounded-full bg-white shadow ${value ? 'ml-6' : 'ml-1'}`} />
      </View>
    </TouchableOpacity>
  );

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {t.notifications?.title || 'Bildiriş Ayarları'}
        </Text>

        <View className={`mb-4 rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <NotificationSwitch
            label={t.notifications?.allNotifications || 'Bütün bildirişlər'}
            value={settings.allNotifications}
            onToggle={(value) => onToggleAll(value)}
            isMain={true}
          />
        </View>

        <View className={`rounded-lg overflow-hidden border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <NotificationSwitch
            label={t.notifications?.eventReminders || 'Tədbir xatırlatmaları'}
            value={settings.eventReminders}
            onToggle={(value) => onUpdateSetting('eventReminders', value)}
          />
          <NotificationSwitch
            label={t.notifications?.newEvents || 'Yeni tədbirlər'}
            value={settings.newEvents}
            onToggle={(value) => onUpdateSetting('newEvents', value)}
          />
          <NotificationSwitch
            label={t.notifications?.followedOrganisers || 'İzlədiyim təşkilatçılar'}
            value={settings.followedOrganisers}
            onToggle={(value) => onUpdateSetting('followedOrganisers', value)}
          />
          <NotificationSwitch
            label={t.notifications?.promotions || 'Kampaniyalar və endirimlər'}
            value={settings.promotions}
            onToggle={(value) => onUpdateSetting('promotions', value)}
          />
        </View>

        <View className="flex-row justify-center mt-5">
          <TouchableOpacity
            className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg`}
            onPress={() => ref.current?.dismiss()}
          >
            <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.profile.close}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const ContactModalComponent = forwardRef(({ onDismiss, defaultEmail, defaultPhone, onSubmit, loading, mesajGonderildi, xeta }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['70%', '90%'], []);

  const [localEmail, setLocalEmail] = useState(defaultEmail || '');
  const [localPhone, setLocalPhone] = useState(defaultPhone || '');
  const [localMesaj, setLocalMesaj] = useState('');

  useEffect(() => {
    if (mesajGonderildi) {
      setLocalMesaj('');
      const timer = setTimeout(() => {
        ref.current?.dismiss();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mesajGonderildi]);

  const handleCancel = () => {
    ref.current?.dismiss();
  };

  const handleSubmit = () => {
    onSubmit({
      email: localEmail,
      phone: localPhone,
      mesaj: localMesaj
    });
  };

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }}>
        <Text className={`text-xl font-bold mb-6 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{t.profile.contact}</Text>

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

        {mesajGonderildi ? <Text className="text-green-600 mb-4 text-center">{mesajGonderildi}</Text> : null}
        {xeta ? <Text className="text-red-600 mb-4 text-center">{xeta}</Text> : null}

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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const LogoutModalComponent = forwardRef(({ onDismiss, onLogout, loading }, ref) => {
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const snapPoints = useMemo(() => ['30%'], []);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: isDarkMode ? '#9ca3af' : '#d1d5db' }}
      backgroundComponent={(props) => <CustomBackground isDarkMode={isDarkMode} style={props.style} />}
    >
      <BottomSheetView style={{ flex: 1, padding: 24 }}>
        <Text className={`text-xl font-bold mb-5 text-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          {t.profile.logoutConfirmTitle || "Hesabdan çıxış"}
        </Text>

        <Text className={`mb-6 text-center ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {t.profile.logoutConfirmMessage || "Hesabdan çıxış etmək istədiyinizə əminsiniz?"}
        </Text>

        <View className="flex-row justify-center">
          <TouchableOpacity
            className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} py-3 px-6 rounded-lg mr-3`}
            onPress={() => ref.current?.dismiss()}
            disabled={loading}
          >
            <Text className={`${isDarkMode ? 'text-white' : 'text-gray-800'} font-medium`}>{t.general.cancel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-500 py-3 px-6 rounded-lg min-w-20"
            onPress={onLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white font-medium">{t.general.confirm}</Text>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

  const { user: authUser, loading: authLoading } = useAuth();
  const { theme, setTheme, isDarkMode } = useTheme();
  const { colors, pageStyles, cardStyles, textStyles } = useThemeStyles();

  const { language, setLanguage } = useLanguage();
  const t = translations[language];

  const { settings: notificationSettings, updateSetting, toggleAllNotifications } = useNotifications();

  // Bottom Sheet Modal refs
  const profileModalRef = useRef(null);
  const passwordModalRef = useRef(null);
  const themeModalRef = useRef(null);
  const languageModalRef = useRef(null);
  const notificationsModalRef = useRef(null);
  const contactModalRef = useRef(null);
  const logoutModalRef = useRef(null);

  const [mesajGonderildi, setMesajGonderildi] = useState("");
  const [xeta, setXeta] = useState("");

  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Auth hələ yüklənmirsə gözlə
    if (authLoading) {
      return;
    }

    const fetchUserData = async () => {
      try {
        if (authUser) {
          setUserId(authUser.uid);

          const userRef = doc(db, "users", authUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
          } else {
            const defaultData = {
              fullName: authUser.displayName || "İstifadəçi",
              email: authUser.email,
              logoURL: authUser.photoURL
            };
            setUserData(defaultData);
          }
        } else {
          router.replace("/");
        }
      } catch (error) {
        console.error("user data issue:", error);
      } finally {
        setLoadingUserData(false);
      }
    };

    fetchUserData();
  }, [authUser, authLoading]);

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      await signOut(auth);
      
      setUserId(null);
      
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
      if (!userId) return null;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileRef = ref(storage, `logos/${userId}`);
      await uploadBytes(fileRef, blob);
      
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
      
      if (!userId) {
        Alert.alert(t.errors.errorTitle, t.errors.userNotFound);
        setLoading(false);
        return;
      }
      
      let logoURL = userData?.logoURL;
      
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
      
      setUserData(prev => ({
        ...prev,
        fullName: formData.fullName,
        phone: formData.phone,
        finCode: formData.finCode,
        logoURL: logoURL
      }));
      
      Alert.alert(t.profile.successTitle, t.profile.profileUpdated);
      profileModalRef.current?.dismiss();
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
      
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        Alert.alert(t.errors.errorTitle, t.errors.passwordMatch);
        setLoading(false);
        return;
      }
      
      const user = auth.currentUser;
      
      if (user) {
        try {
          const credential = EmailAuthProvider.credential(
            user.email,
            passwordData.oldPassword
          );
          
          await reauthenticateWithCredential(user, credential);
          
          await updatePassword(user, passwordData.newPassword);
          
          Alert.alert(t.profile.successTitle, t.profile.passwordUpdated);
          passwordModalRef.current?.dismiss();
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

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    themeModalRef.current?.dismiss();
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    languageModalRef.current?.dismiss();
  };

  const ProfilePlaceholder = () => (
    <View className="items-center mt-10 mb-8">
      <View className={`mb-4 w-24 h-24 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></View>
      <View className={`w-40 h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-1`}></View>
      <View className={`w-32 h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded mb-6`}></View>
    </View>
  );

  const ProfileInfo = () => (
      <View className="items-center mt-10 mb-8">
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
        
        <Text className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} mb-1`}>
          {userData?.fullName || "İstifadəçi"}
        </Text>
        
        <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-6`}>
          {userData?.email || ""}
        </Text>
      </View>
  );

  return (
   
    <ScrollView className={isDarkMode ? "flex-1 bg-gray-900" : "flex-1 bg-gray-50"}>
     <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#111827" : "#F9FAFB"} />
      <View className="p-4">
        {loadingUserData ? <ProfilePlaceholder /> : <ProfileInfo />}

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

          {/* Sənədlərim */}
          <TouchableOpacity
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => router.push('/documents')}
          >
            <Ionicons name="library-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.myDocuments || t.tabs.documents}
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
            onPress={() => profileModalRef.current?.present()}
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
            onPress={() => passwordModalRef.current?.present()}
          >
          <Ionicons name="lock-closed-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
          <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {t.profile.passwordChange}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        
          {/* Bildirişlər */}
          <TouchableOpacity
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => notificationsModalRef.current?.present()}
          >
            <Ionicons name="notifications-outline" size={22} color={isDarkMode ? "#818cf8" : "#6366f1"} />
            <Text className={`ml-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {t.profile.notifications}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={isDarkMode ? "#9ca3af" : "#9ca3af"} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          
          {/* Tema */}
          <TouchableOpacity 
            className={`flex-row items-center py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}
            onPress={() => themeModalRef.current?.present()}
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
            onPress={() => languageModalRef.current?.present()}
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
            onPress={() => contactModalRef.current?.present()}
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
            onPress={() => logoutModalRef.current?.present()}
          >
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text className="ml-3 text-red-500 font-semibold">
              {t.profile.logout}
            </Text>
          </TouchableOpacity>
      </View>

      {/* Modallar */}
      <ProfileModalComponent
        ref={profileModalRef}
        userData={userData}
        onSave={handleUpdateProfile}
        loading={loading}
      />

      <PasswordModalComponent
        ref={passwordModalRef}
        onChangePassword={handleChangePassword}
        loading={loading}
      />

      <ThemeModalComponent
        ref={themeModalRef}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />

      <LanguageModalComponent
        ref={languageModalRef}
        currentLanguage={language}
        onLanguageChange={handleLanguageChange}
      />

      <NotificationsModalComponent
        ref={notificationsModalRef}
        settings={notificationSettings}
        onUpdateSetting={updateSetting}
        onToggleAll={toggleAllNotifications}
      />

      <ContactModalComponent
        ref={contactModalRef}
        onDismiss={() => {
          setMesajGonderildi("");
          setXeta("");
        }}
        defaultEmail={userData?.email || ""}
        defaultPhone={userData?.phone || ""}
        onSubmit={handleSubmitContact}
        loading={loading}
        mesajGonderildi={mesajGonderildi}
        xeta={xeta}
      />
      
      {/* Çıkış Onay Modalı */}
      <LogoutModalComponent
        ref={logoutModalRef}
        onLogout={handleLogout}
        loading={loading}
      />
    </View>
    </ScrollView>
  );
}
