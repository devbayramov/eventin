import React from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2; // 2 sütun olarak kartlar için genişlik (kenar boşlukları çıkarıldı)

// Ana Organizatör kartı bileşeni
export default function OrganiserCard({ item, onPress, isDarkMode, t, followersLoading }) {
  return (
    <TouchableOpacity 
      onPress={() => onPress && onPress(item)} 
      style={{
        width: CARD_WIDTH,
        marginHorizontal: 5,
        marginBottom: 15,
        borderRadius: 12,
        backgroundColor: isDarkMode ? '#1F2937' : '#fff',
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 2,
        padding: 12,
        alignItems: 'center',
      }}
    >
      {/* Organizatör logosu */}
      <View 
        style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
          marginBottom: 8,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Image 
          source={{ uri: item.logoURL || "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-organizer-logo.png?alt=media" }} 
          style={{ 
            width: '100%', 
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>
      
      {/* Organizatör adı */}
      <Text 
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: isDarkMode ? '#E5E7EB' : '#333',
          textAlign: 'center',
          marginBottom: 4,
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.companyName.length > 15 ? item.companyName.substring(0, 15) + '..' : item.companyName}
      </Text>
      
      {/* Organizatör sektörü */}
      <Text 
        style={{
          fontSize: 12,
          color: isDarkMode ? '#9CA3AF' : '#666',
          textAlign: 'center',
          marginBottom: 8,
        }}
        numberOfLines={1}
      >
        {item.sector || (t ? t.general.category : "Kateqoriya")}
      </Text>
      
      {/* Takipçi sayısı */}
      <View 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="people-outline" size={14} color={isDarkMode ? "#818CF8" : "#6366F1"} />
        {followersLoading ? (
          <View 
            style={{
              width: 40,
              height: 12,
              backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
              borderRadius: 4,
              marginLeft: 4,
            }}
          />
        ) : (
          <Text 
            style={{
              fontSize: 12,
              color: isDarkMode ? "#818CF8" : "#6366F1",
              marginLeft: 4,
            }}
          >
            {item.followersCount || 0} {t ? t.organisers.followers : "izləyici"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Favori Organizatör kartı - Farklı bir tasarımla
export function FavoriteOrganiserCard({ item, onPress, isDarkMode, t, followersLoading }) {
  return (
    <TouchableOpacity 
      onPress={() => onPress && onPress(item)} 
      style={{
        width: width * 0.4,
        marginHorizontal: 5,
        marginRight: 12,
        borderRadius: 12,
        backgroundColor: isDarkMode ? '#1F2937' : '#fff',
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 2,
        padding: 12,
        alignItems: 'center',
      }}
    >
      {/* Organizatör logosu */}
      <View 
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          overflow: 'hidden',
          backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
          marginBottom: 8,
        }}
      >
        <Image 
          source={{ uri: item.logoURL || "https://firebasestorage.googleapis.com/v0/b/eventin-e83c1.appspot.com/o/app-images%2Fdefault-organizer-logo.png?alt=media" }} 
          style={{ 
            width: '100%', 
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>
      
      {/* Organizatör adı */}
      <Text 
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: isDarkMode ? '#E5E7EB' : '#333',
          textAlign: 'center',
          marginBottom: 4,
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.companyName.length > 15 ? item.companyName.substring(0, 15) + '..' : item.companyName}
      </Text>
      
      {/* Takipçi sayısı */}
      <View 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="people-outline" size={14} color={isDarkMode ? "#818CF8" : "#6366F1"} />
        {followersLoading ? (
          <View 
            style={{
              width: 40,
              height: 12,
              backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
              borderRadius: 4,
              marginLeft: 4,
            }}
          />
        ) : (
          <Text 
            style={{
              fontSize: 12,
              color: isDarkMode ? "#818CF8" : "#6366F1",
              marginLeft: 4,
            }}
          >
            {item.followersCount || 0} {t ? t.organisers.followers : "izləyici"}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Placeholder Organizatör kartı
export function PlaceholderOrganiserCard({ isDarkMode }) {
  return (
    <View 
      style={{
        width: CARD_WIDTH,
        marginHorizontal: 5,
        marginBottom: 15,
        borderRadius: 12,
        backgroundColor: isDarkMode ? '#1F2937' : '#fff',
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 2,
        padding: 10,
        alignItems: 'center',
      }}
    >
      {/* Placeholder logo */}
      <View 
        style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          marginBottom: 8,
        }}
      />
      
      {/* Placeholder isim */}
      <View 
        style={{
          width: '80%',
          height: 16,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          borderRadius: 4,
          marginBottom: 4,
        }}
      />
      
      {/* Placeholder kategori */}
      <View 
        style={{
          width: '60%',
          height: 12,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          borderRadius: 4,
          marginBottom: 8,
        }}
      />
      
      {/* Placeholder takipçi */}
      <View 
        style={{
          width: '40%',
          height: 12,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          borderRadius: 4,
        }}
      />
    </View>
  );
}

// Placeholder Favori Organizatör kartı
export function PlaceholderFavoriteOrganiserCard({ isDarkMode }) {
  return (
    <View 
      style={{
        width: width * 0.4,
        marginHorizontal: 10,
        marginRight: 12,
        borderRadius: 12,
        backgroundColor: isDarkMode ? '#1F2937' : '#fff',
        shadowColor: isDarkMode ? '#000' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 4,
        elevation: 2,
        padding: 12,
        alignItems: 'center',
      }}
    >
      {/* Placeholder logo */}
      <View 
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          marginBottom: 8,
        }}
      />
      
      {/* Placeholder isim */}
      <View 
        style={{
          width: '80%',
          height: 16,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          borderRadius: 4,
          marginBottom: 4,
        }}
      />
      
      {/* Placeholder takipçi */}
      <View 
        style={{
          width: '40%',
          height: 12,
          backgroundColor: isDarkMode ? '#374151' : '#f0f0f0',
          borderRadius: 4,
        }}
      />
    </View>
  );
} 