
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Dimensions, StyleSheet, ActivityIndicator, StatusBar  } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const { width: screenWidth } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    image: require('../assets/appSlide1.png'),
    text: 'Hər növdən tədbirləri asanlıqla tapın',
  },
  {
    key: '2',
    image: require('../assets/appSlide2.png'), 
    text: 'Tədbirlərə qeydiyyat olun və bilet alın',
  },
  {
    key: '3',
    image: require('../assets/appSlide3.png'), 
    text: 'Sənədlərinizi güvəndə saxlayın, 1 addımda paylaşın və ya endirin',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        
        router.replace('/(tabs)/home');
      } else {
        
        setLoading(false);
      }
    });
    
    
    return () => unsubscribe();
  }, []);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#ffde59', '#ff914d']}
        className="flex-1 items-center justify-center"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ActivityIndicator size="large" color="#ffffff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
        colors={['#ffde59', '#ff914d']}
      className="flex-1 items-center justify-between p-8"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
       <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true} 
      />
      {/* Logo */}
      <Image
        source={require('../assets/splash-icon.png')}
        className="w-42 h-24 mt-8" 
        resizeMode="contain"
      />

      {/* Slider */}
      <View style={{ height: screenWidth }} className="mb-4">
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16} 
          style={{ width: screenWidth }}
        >
          {slides.map((slide) => (
            <View key={slide.key} style={{ width: screenWidth }} className="items-center justify-center px-4">
              <Image
                source={slide.image}
                className="w-64 h-64 mb-6" // Şəkil ölçüsü
                resizeMode="contain"
              />
              <Text className="text-xl font-semibold text-white text-center">
                {slide.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View className="flex-row justify-center mt-4">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full mx-1 ${
                activeIndex === index ? 'bg-white w-4' : 'bg-white/50 w-2'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Düymələr */}
      <View className="w-full px-4 mb-8">
        <TouchableOpacity
          onPress={() => router.push('/login')}
          className="bg-white rounded-lg py-3 mb-6"
        >
          <Text className="text-indigo-600 font-semibold text-center text-base">
            Daxil ol
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/register')}
          className="border border-white rounded-lg py-3"
        >
          <Text className="text-white font-semibold text-center text-base">
            Qeydiyyatdan keç
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
