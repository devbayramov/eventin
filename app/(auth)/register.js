import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform, Linking, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { sendOTP } from "../../services/emailService";
import FileViewer from 'react-native-file-viewer';

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field, value) => {
    if (field === "phone") {
      // Eğer değer boşsa veya +994'ten kısa ise, +994 ekle
      if (!value || value.length < 4) {
        value = "+994";
      }
      
      // Eğer +994 ile başlamıyorsa, +994 ekle
      if (!value.startsWith("+994")) {
        value = "+994" + value.replace(/[^0-9]/g, "");
      } else {
        // +994'ten sonraki kısmı al ve sadece rakamları tut
        const numbers = value.slice(4).replace(/[^0-9]/g, "");
        value = "+994" + numbers;
      }

      // Eğer +9940 ile başlıyorsa hata mesajı göster
      if (value.startsWith("+9940")) {
        setErrorMessage("Telefon nömrəsi 0 ilə başlaya bilməz");
      } else {
        setErrorMessage("");
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    // Ad Soyad kontrolü
    if (!formData.fullName.trim()) {
      setErrorMessage("Ad Soyad daxil edin");
      return false;
    }
    if (!formData.fullName.includes(" ")) {
      setErrorMessage("Ad və Soyad daxil edin");
      return false;
    }

    // Telefon kontrolü
    if (!formData.phone.trim()) {
      setErrorMessage("Telefon nömrəsi daxil edin");
      return false;
    }
    if (formData.phone.length < 13) {
      setErrorMessage("Telefon nömrəsi düzgün daxil edilməyib");
      return false;
    }

    // Email kontrolü
    if (!formData.email.trim()) {
      setErrorMessage("Email daxil edin");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage("Düzgün email daxil edin");
      return false;
    }

    // Şifre kontrolü
    if (!formData.password) {
      setErrorMessage("Şifrə daxil edin");
      return false;
    }
    if (formData.password.length < 8) {
      setErrorMessage("Şifrə minimum 8 simvol olmalıdır");
      return false;
    }
    const hasLetter = /[a-zA-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    if (!hasLetter || !hasNumber) {
      setErrorMessage("Şifrədə həm hərf, həm də rəqəm olmalıdır");
      return false;
    }

    // Şifre tekrar kontrolü
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Şifrələr uyğun gəlmir");
      return false;
    }

    // İstifadəçi qaydaları kontrolü
    if (!formData.acceptTerms) {
      setErrorMessage("İstifadəçi qaydalarını qəbul etməlisiniz");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      // Form validasyonu
      if (!validateForm()) {
        return;
      }

      // Email formatı kontrolü ve düzenleme
      let email = formData.email.trim();
      if (!email.includes('@')) {
        email = email + '@gmail.com';
      }

      // OTP gönder
      const otp = await sendOTP(email);
      
      // OTP sayfasına yönlendir
      router.push({
        pathname: "/otp",
        params: {
          email: email,
          fullName: formData.fullName,
          phone: formData.phone,
          password: formData.password,
          otp: otp
        }
      });
    } catch (error) {
     
      setErrorMessage(error.message || "Qeydiyyat zamanı xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTP(formData.email);
      setTimeLeft(60);
    } catch (error) {
      
      setErrorMessage(error.message || "OTP yeniden gönderme zamanı xəta baş verdi");
    }
  };

  const openTermsPDF = async () => {
    try {
      const pdfUrl = 'https://eventin.az/pdfs/qaydalar.pdf';
      const supported = await Linking.canOpenURL(pdfUrl);
      
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert(
          "Xəta",
          "PDF faylını açmaq mümkün olmadı. Zəhmət olmasa daha sonra yenidən cəhd edin."
        );
      }
    } catch (error) {
     
      Alert.alert(
        "Xəta",
        "PDF faylı açıla bilmədi. Zəhmət olmasa daha sonra yenidən cəhd edin."
      );
    }
  };

  return (
    <LinearGradient 
        colors={['#6366f1', '#3030deff', '#793cc3ff']}
      className="flex-1 justify-center"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      <View className="mx-4 bg-white rounded-2xl p-6 shadow-2xl shadow-black/40">
        {/* Başlıq */}
        <Text className="text-3xl font-bold text-gray-900 text-center mb-6">
          Qeydiyyat
        </Text>

        {/* Form */}
        <View className="space-y-4">
          {/* Ad Soyad Sahəsi */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Ad Soyad</Text>
            <View className="flex-row items-center border border-gray-500 rounded-lg bg-white px-3 py-1.5 mb-4">
              <Ionicons name="person-outline" size={20} color="#4f46e5" className="mr-2" />
              <TextInput
                value={formData.fullName}
                onChangeText={(text) => handleChange("fullName", text)}
                placeholder="Ad Soyad"
                className="flex-1 text-base text-gray-900 py-2"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Telefon Sahəsi */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Telefon</Text>
            <View className="flex-row items-center border border-gray-500 rounded-lg bg-white px-3 py-1.5 mb-4">
              <Ionicons name="call-outline" size={20} color="#4f46e5" className="mr-2" />
              <TextInput
                value={formData.phone}
                onChangeText={(text) => handleChange("phone", text)}
                keyboardType="phone-pad"
                placeholder="+994 XX XXX XX XX"
                className="flex-1 text-base text-gray-900 py-2"
                placeholderTextColor="#9ca3af"
                onFocus={() => {
                  if (!formData.phone) {
                    handleChange("phone", "+994");
                  }
                }}
                maxLength={13}
              />
            </View>
          </View>

          {/* Email Sahəsi */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <View className="flex-row items-center border border-gray-500 rounded-lg bg-white px-3 py-1.5 mb-4">
              <Ionicons name="mail-outline" size={20} color="#4f46e5" className="mr-2" />
              <TextInput
                value={formData.email}
                onChangeText={(text) => handleChange("email", text)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="eventin@gmail.com"
                className="flex-1 text-base text-gray-900 py-2"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Şifrə Sahəsi */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Şifrə</Text>
            <View className="flex-row items-center border border-gray-500 rounded-lg bg-white px-3 py-1.5 mb-4">
              <Ionicons name="lock-closed-outline" size={20} color="#4f46e5" className="mr-2" />
              <TextInput
                value={formData.password}
                onChangeText={(text) => handleChange("password", text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="••••••••"
                className="flex-1 text-base text-gray-900 py-2"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Şifrəni təsdiq edin */}
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Şifrəni təsdiq edin</Text>
            <View className="flex-row items-center border border-gray-500 rounded-lg bg-white px-3 py-1.5 mb-4">
              <Ionicons name="lock-closed-outline" size={20} color="#4f46e5" className="mr-2" />
              <TextInput
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange("confirmPassword", text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholder="••••••••"
                className="flex-1 text-base text-gray-900 py-2 pl-2"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* İstifadəçi Qaydaları Checkbox */}
          <View className="flex-row items-center mt-2 mb-2">
            <TouchableOpacity 
              onPress={() => setFormData(prev => ({ ...prev, acceptTerms: !prev.acceptTerms }))}
              className="flex-row items-center"
            >
              <View className={`w-5 h-5 border rounded ${formData.acceptTerms ? 'bg-indigo-600 border-indigo-600' : 'border-gray-400'} mr-2 items-center justify-center`}>
                {formData.acceptTerms && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text className="text-gray-700 text-sm">
                <Text  onPress={openTermsPDF}
                  className="text-blue-500 underline text-sm">İstifadəçi qaydalarını 
                  </Text>
                <Text>
                {' '} oxudum, qəbul edirəm
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Xəta Mesajı */}
          {errorMessage ? (
            <Text className="text-red-500 text-sm text-center">{errorMessage}</Text>
          ) : null}

          {/* Qeydiyyat Düyməsi */}
          <TouchableOpacity 
            onPress={handleRegister}
            className="bg-indigo-600 rounded-lg py-3 mt-4"
            disabled={loading}
          >
            <Text className="text-white font-semibold text-center text-base">
              {loading ? <ActivityIndicator color="#fff" /> : "Qeydiyyatdan keç"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Giriş Səhifəsinə Qayıt */}
        <View className="mt-6">
          <View className="flex-row justify-center space-x-1">
            <Text className="text-gray-600 mr-1">Hesabınız var?</Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text className="text-indigo-600 font-medium">Daxil ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
