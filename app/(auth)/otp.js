import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { savePushTokenToFirestore } from "../../context/notifications";
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleVerifyOTP = async () => {
    try {
      if (!otp) {
        setErrorMessage("OTP kodu daxil edin");
        return;
      }

      if (otp !== params.otp) {
        setErrorMessage("Yanlış OTP kodu");
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        params.email,
        params.password
      );
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: params.email,
        fullName: params.fullName,
        phone: params.phone,
        registerType: "user",
        deActive: false,
        createdAt: new Date(),
      });

      // Push token-i al və Firestore-a saxla
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '41b04da9-7852-4895-9150-5a64b8345080';
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        if (tokenData?.data) {
          await savePushTokenToFirestore(tokenData.data);
        }
      } catch (tokenError) {
        console.log('Push token alınarkən xəta:', tokenError);
      }

      router.replace("/");
    } catch (error) {
      
      let errorMessage = "OTP doğrulama zamanı xəta baş verdi";
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Bu email artıq qeydiyyatdan keçib";
          break;
        case 'auth/invalid-verification-code':
          errorMessage = "Yanlış OTP kodu";
          break;
        case 'auth/code-expired':
          errorMessage = "OTP kodu müddəti bitib. Yenidən göndərin";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Çox sayda uğursuz cəhd. Zəhmət olmasa bir az gözləyin";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Şəbəkə xətası";
          break;
        default:
          errorMessage = "OTP doğrulama zamanı xəta baş verdi";
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      // OTP'ni yenidən göndər
      const newOTP = await sendOTP(params.email);
      setTimeLeft(60);
      router.setParams({ otp: newOTP });
    } catch (error) {
     
      setErrorMessage("OTP gönderme zamanı xəta baş verdi");
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
      <View className="mx-4 bg-white/90 rounded-2xl p-6 shadow-2xl shadow-black/40">
        {/* Başlıq */}
        <Text className="text-3xl font-bold text-gray-900 text-center mb-6">
          OTP Doğrulama
        </Text>

        {/* Açıklama */}
        <Text className="text-gray-600 text-center mb-6">
           {params.email} ünvanına göndərilən 6 rəqəmli OTP kodunu daxil edin
        </Text>

        {/* OTP Input */}
        <View className="mb-6">
          <View className="flex-row items-center border border-gray-200 rounded-lg bg-white px-3 py-2">
            <Ionicons name="key-outline" size={20} color="#4f46e5" className="mr-2" />
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="XXXXXX"
              className="flex-1 text-base text-gray-900 text-center tracking-widest"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Xəta Mesajı */}
        {errorMessage ? (
          <Text className="text-red-500 text-sm text-center mb-4">{errorMessage}</Text>
        ) : null}

        {/* Doğrulama Düyməsi */}
        <TouchableOpacity 
          onPress={handleVerifyOTP}
          className="bg-indigo-600 rounded-lg py-3 mb-4"
          disabled={loading}
        >
          <Text className="text-white font-semibold text-center text-base">
            {loading ? <ActivityIndicator color="#fff" /> : "Doğrula"}
          </Text>
        </TouchableOpacity>

        {/* Yeniden Gönder */}
        <View className="flex-row justify-center items-center">
          <Text className="text-gray-600 mr-2">
            {timeLeft > 0 ? `${timeLeft} saniyə` : "Kod gəlmədi?"}
          </Text>
          {timeLeft === 0 && (
            <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
              <Text className="text-indigo-600 font-medium">Yenidən göndər</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </LinearGradient>
  );
} 