import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { useLanguage, translations } from '../../context/language';

const { width } = Dimensions.get("window");

const CARD_WIDTH = width * 0.7; // Define CARD_WIDTH for placeholder
const SPACING = width * 0.05; // Define SPACING for placeholder

// Tarih formatı fonksiyonu
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Tarix bilinmir";
    return format(date, "dd MMM yyyy");
  } catch (error) {
    console.error("Tarix formatı xətası:", error);
    return "Tarix bilinmir";
  }
};

// Etkinlik türünü formatlama fonksiyonu
const formatEventType = (type) => {
  if (!type) return "";
  return type.replace(" proqramı", "");
};

// Etkinlik kartı bileşeni - Bütün etkinlikler listesi için
export default function EventCard({ item, onPress, isDarkMode }) {
  // item null veya undefined ise boş bir obje kullan
  const event = item || {};
  const { language } = useLanguage();
  const t = translations[language];
  
  // Online etkinlik mi kontrol et - optional chaining ile güvenli erişim
  const isOnline = event.onlineURL?.trim?.() !== "";
  
  // Çift tıklamaları önlemek için
  const [isDisabled, setIsDisabled] = useState(false);
  
  const handlePress = () => {
    if (isDisabled) return;
    
    setIsDisabled(true);
    onPress(event);
    
    // 500ms sonra butonu tekrar aktif hale getir
    setTimeout(() => {
      setIsDisabled(false);
    }, 500);
  };
  
  return (
    <TouchableOpacity 
      onPress={handlePress} 
      disabled={isDisabled}
      className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} mx-4 mb-4 rounded-lg overflow-hidden shadow-sm`}
      style={{ height: 130 }} // Sabit yükseklik
    >
      <View className="flex-row">
        {/* Sol taraftaki görsel */}
        <View className="w-1/3 relative" style={{ height: 130 }}>
          {/* Önce gradient arka plan */}
          <View 
            style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            //  backgroundColor: isDarkMode ? '#1f2937' : '#f3f4f6',
              borderBottomLeftRadius: 8,
              borderTopLeftRadius: 8,
              overflow: 'hidden'
            }}
            className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
          >
            {/* Gradient arka plan - Image ile aynı container içinde */}
            <View 
              style={{ 
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                borderBottomLeftRadius: 8,
                borderTopLeftRadius: 8,
                overflow: 'hidden',

                zIndex: 1
              }}
              className={`bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300`}
            />
            
            {/* Fotoğraf object-contain olarak */}
            <Image 
              source={{ uri: event.eventimage || "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-event-image.png?alt=media&token=baf5e7d5-6ee0-4c0e-bb14-e823279ef051" }} 
              style={{ 
                position: 'absolute',
                width: '100%', 
                height: '100%',
                borderBottomLeftRadius: 8,
                borderTopLeftRadius: 8,
                zIndex: 2
              }}
              resizeMode="contain"
            />
          </View>
          
          {/* Kategori işareti */}
          {event.eventcategory && (
            <View className="absolute top-1 left-1 bg-black/50 px-2 py-1 rounded-md" style={{zIndex: 3}}>
              <Text className="text-white text-xs font-medium">{event.eventcategory}</Text>
            </View>
          )}
        </View>
        
        {/* Sağ taraftaki içerik */}
        <View className="flex-1 p-3 gap-1">
          {/* Etkinlik adı - Maksimum 2 satır */}
          <Text 
            className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} font-bold mb-1`}
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ fontSize: 15 }}
          >
            {event.eventname || t.events.untitledEvent}
          </Text>
          
          {/* Tarih ve saat */}
          <View className="flex-row items-center mt-1">
            <Ionicons name="calendar-outline" size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs ml-1 mr-3`}>
              {formatDate(event.eventstartdate)}
            </Text>
            <Ionicons name="time-outline" size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
            <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs ml-1`}>
              {event.eventstarttime || "00:00"}
            </Text>
          </View>
          
          {/* Konum veya Online bilgisi */}
          <View className="flex-row items-center mt-1">
            {isOnline ? (
              <>
                <Ionicons name="globe-outline" size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
                <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs ml-1`}>
                  {t.events.onlineEvent}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="location-outline" size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
                <Text 
                  className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs ml-1`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {event.eventRegion ? event.eventRegion !== "Bütün bölgələr" ? event.eventRegion + "," + event.eventlocation : event.eventlocation : event.eventlocation || t.events.unknown}
                </Text>
              </>
            )}
          </View>
          
          {/* Etkinlik Bilgileri: Tür, Ücret, Belge - İkonlarla */}
          <View className="flex-row items-center mt-1 justify-start">
            {/* Etkinlik türü */}
            <View className="flex-row items-center mr-2">
              <Ionicons name="easel-outline" size={14} color={isDarkMode ? "#818cf8" : "#4F46E5"} />
              <Text className={`ml-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatEventType(event.eventType)}
              </Text>
            </View>
            
            {/* Ücret durumu */}
            <View className="flex-row items-center mr-2">
              <Ionicons name={event.payment==="Ödənişli" ? "cash-outline" : "wallet-outline"} size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs ml-1`}>
                {event.payment || t.events.free}
              </Text>
            </View>
            
            {/* Belge durumu */}
            {event.eventDocument && (
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
                <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs ml-1`}>{event.eventDocument}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Slider bileşeni - Yaklaşan etkinlikler için
export function UpcomingEventCard({ item, onPress, isDarkMode }) {
  // item null veya undefined ise boş bir obje kullan
  const event = item || {};
  const { language } = useLanguage();
  const t = translations[language];
  
  // Kart için eski boyuta dönüyoruz
  const CARD_SIZE = width * 0.7;
  
  // Çift tıklamaları önlemek için
  const [isDisabled, setIsDisabled] = useState(false);
  
  const handlePress = () => {
    if (isDisabled) return;
    
    setIsDisabled(true);
    onPress(event);
    
    // 500ms sonra butonu tekrar aktif hale getir
    setTimeout(() => {
      setIsDisabled(false);
    }, 500);
  };
  
  return (
    <TouchableOpacity 
      className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-md`}
      onPress={handlePress}
      disabled={isDisabled}
      style={{ 
        width: CARD_SIZE, 
        marginHorizontal: 4,
        borderRadius: 12
      }}
    >
      <View className="p-1">
        {/* Etkinlik görseli container */}
        <View className="relative overflow-hidden" style={{ width: CARD_SIZE - 8, height: (CARD_SIZE - 8) * 0.7 }}>
          {/* Container stillerini ayarlayan dış view */}
          <View
            style={{ 
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              overflow: 'hidden',
           //   backgroundColor: '#f3f4f6',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 12,
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 24,
            }}
            className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
          >
            {/* Önce gradient arka plan */}
            <View 
              className={`absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300 `}
              style={{ 
                borderTopLeftRadius: 24,
                borderTopRightRadius: 12,
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 24,
                zIndex: 1
              }} 
            />
            
            {/* Sonra fotoğraf */}
            <Image 
              source={{ uri: event.eventimage || "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-event-image.png?alt=media&token=baf5e7d5-6ee0-4c0e-bb14-e823279ef051" }} 
              style={{ 
                width: CARD_SIZE - 8, 
                height: (CARD_SIZE - 8) * 0.7,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 12,
                borderBottomLeftRadius: 12,
                borderBottomRightRadius: 24,
                zIndex: 2
              }}
              resizeMode="contain"
            />
          </View>
          
          {/* Kategori işareti - Sol üst köşe */}
          <View className={`absolute top-0 left-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} px-3 py-2 rounded-br-lg`} style={{zIndex: 3}}>
            <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} text-xs font-medium`}>{event.eventcategory || "Event"}</Text>
          </View>
          
          {/* Tarih bilgisi - Sağ alt köşe */}
          <View className={`absolute bottom-0 right-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} px-3 py-2 rounded-tl-lg`} style={{zIndex: 3}}>
            <Text className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} text-xs font-medium`}>{formatDate(event.eventstartdate)}</Text>
          </View>
        </View>
        
        {/* Etkinlik bilgileri */}
        <View className="p-3">
          {/* Etkinlik adı */}
          <Text 
            className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} font-bold mb-2`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.eventname || t.events.untitledEvent}
          </Text>
          
          {/* Etkinlik Bilgileri: Tür, Ücret, Belge - İkonlarla */}
          <View className="flex-row flex-wrap">
            {/* Etkinlik türü */}
            <View className="flex-row items-center mr-2">
              <Ionicons name="easel-outline" size={14} color={isDarkMode ? "#818cf8" : "#4F46E5"} />
              <Text className={`ml-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatEventType(event.eventType)}
              </Text>
            </View>
            
            {/* Ücret durumu */}
            <View className="flex-row items-center mr-2">
              <Ionicons name={event.payment==="Ödənişli" ? "cash-outline" : "wallet-outline"} size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
              <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs ml-1`}>
                {event.payment || t.events.free}
              </Text>
            </View>
            
            {/* Belge durumu */}
            {event.eventDocument && (
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={14} color={isDarkMode ? "#818cf8" : "#6366F1"} />
                <Text className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-xs ml-1`}>{event.eventDocument}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const PlaceholderEventCard = ({ isDarkMode }) => (
  <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-4 mb-4`} style={{ height: 130 }}>
    <View className="flex-row">
      <View className="w-1/3 relative" style={{ height: 100 }}>
        <View className={`absolute left-0 right-0 top-0 bottom-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ borderBottomLeftRadius: 8, borderTopLeftRadius: 8 }} />
      </View>
      <View className="flex-1 p-3">
        <View className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4 mb-2`} />
        <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/2 mb-2`} />
        <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/3`} />
      </View>
    </View>
  </View>
);

export const PlaceholderUpcomingEventCard = ({ isDarkMode }) => (
  <View className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md p-1`} style={{ width: CARD_WIDTH, marginHorizontal: 4, borderRadius: 12 }}>
    <View className="relative overflow-hidden" style={{ width: CARD_WIDTH - 8, height: (CARD_WIDTH - 8) * 0.7 }}>
      <View className={`absolute left-0 right-0 top-0 bottom-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} style={{ borderTopLeftRadius: 24, borderTopRightRadius: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 24 }} />
    </View>
    <View className="p-3">
      <View className={`h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-3/4 mb-2`} />
      <View className={`h-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} rounded w-1/2 mb-2`} />
    </View>
  </View>
); 