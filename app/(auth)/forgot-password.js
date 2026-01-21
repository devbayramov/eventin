import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../../firebaseConfig";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleResetPassword = async () => {
    try {
      if (!email) {
        setErrorMessage("Email daxil edin");
        return;
      }

      setLoading(true);
      setErrorMessage("");

      let userEmail = email.trim(); 
      if (!userEmail.includes('@')) {
        userEmail = userEmail + '@gmail.com';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        setErrorMessage("Düzgün email formatı daxil edin");
        return;
      }

      await sendPasswordResetEmail(auth, userEmail);
      
      Alert.alert(
        "Uğurlu",
        "Şifrə yeniləmə linki email adresinizə göndərildi. Zəhmət olmasa emailinizi yoxlayın.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/login")
          }
        ]
      );
    } catch (error) {
      
      let errorMessage = "Şifrə sıfırlama zamanı xəta baş verdi";
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Yanlış email formatı";
          break;
        case 'auth/user-not-found':
          errorMessage = "Bu email ilə qeydiyyatdan keçmiş istifadəçi tapılmadı";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Çox sayda uğursuz cəhd. Zəhmət olmasa bir az gözləyin";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Şəbəkə xətası";
          break;
        default:
          errorMessage = "Şifrə sıfırlama zamanı xəta baş verdi";
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
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
        <Text className="text-3xl font-bold text-gray-900 text-center mb-6">
          Şifrəni dəyişdir
        </Text>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <View className="flex-row items-center border border-gray-500 rounded-lg bg-white px-3 py-1.5 mb-4">
              <Ionicons name="mail-outline" size={20} color="#4f46e5" className="mr-2" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="eventin@gmail.com / eventin"
                className="flex-1 text-base text-gray-900 py-2"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleResetPassword}
            className="bg-indigo-600 rounded-lg py-3 mt-4"
            disabled={loading}
          >
            <Text className="text-white font-semibold text-center text-base">
              {loading ? <ActivityIndicator color="#fff" /> : "Şifrəni sıfırla"}
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <Text className="text-red-500 text-sm text-center mt-4">{errorMessage}</Text>
        ) : null}
      </View>
    </LinearGradient>
  );
} 