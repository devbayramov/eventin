import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function LoginScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      // Email ve şifre kontrolü
      if (!formData.email || !formData.password) {
        setErrorMessage("Email və şifrəni daxil edin");
        setLoading(false);
        return;
      }

      // Email formatı kontrolü
      let email = formData.email;
      if (!email.includes('@')) {
        email = email + '@gmail.com';
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setErrorMessage("Düzgün email formatı daxil edin");
        setLoading(false);
        return;
      }

      // Firebase ile giriş
      const userCredential = await signInWithEmailAndPassword(auth, email, formData.password);
      
      if (userCredential.user) {
        // Kullanıcı bilgilerini kontrol et
        const userRef = doc(db, "users", userCredential.user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.deActive) {
            setErrorMessage("Hesabınız deaktivdir");
            await signOut(auth);
            setLoading(false);
            return;
          }
        }

        // Başarılı giriş sonrası home sayfasına yönlendir
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error("Giriş hatası:", error);
      
      let errorMessage = "Daxil olma zamanı xəta baş verdi";
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = "Yanlış email formatı";
          break;
        case 'auth/user-disabled':
          errorMessage = "Hesabınız deaktivdir";
          break;
        case 'auth/user-not-found':
          errorMessage = "İstifadəçi tapılmadı";
          break;
        case 'auth/wrong-password':
          errorMessage = "Yanlış şifrə";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Çox sayda uğursuz cəhd. Zəhmət olmasa bir az gözləyin";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Şəbəkə xətası";
          break;
        default:
          errorMessage = "Daxil olma zamanı xəta baş verdi";
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient 
    colors={['#0ea5e9', '#3b82f6', '#6366f1']}
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
          Giriş
        </Text>
        {/* Hata Mesajı */}
        {errorMessage ? (
          <View className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <Text className="text-red-700 text-center">{errorMessage}</Text>
          </View>
        ) : null}

        {/* Form */}
        <View className="space-y-4">
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
                placeholder="eventin@gmail.com / eventin"
                className="flex-1 text-base text-gray-900 py-2"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Şifrə Sahəsi */}
          <View>
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-sm font-medium text-gray-700">Şifrə</Text>
              <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                <Text className="text-sm text-indigo-600 font-medium">
                  Şifrəni unutdunuz?
                </Text>
              </TouchableOpacity>
            </View>
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

          {/* Giriş Düyməsi */}
          <TouchableOpacity 
            onPress={handleLogin}
            className="bg-indigo-600 rounded-lg py-3 mt-4"
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-center text-base">
                Daxil ol
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Köməkçi Linklər */}
        <View className="mt-4 space-y-3">
          
          <View className="flex-row justify-center space-x-1">
            <Text className="text-gray-600 mr-1">Hesabınız yoxdur?</Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text className="text-indigo-600 font-medium">Qeydiyyatdan keçin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}