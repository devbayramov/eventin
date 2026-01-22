import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/theme';
import { useNotifications } from '../context/notifications';
import { useLanguage, translations } from '../context/language';

// Bildiriş kartı komponenti
const NotificationItem = ({ item, onPress, onMarkAsRead, isDarkMode }) => {
  const timeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'İndicə';
      if (diffMins < 60) return `${diffMins} dəq əvvəl`;
      if (diffHours < 24) return `${diffHours} saat əvvəl`;
      if (diffDays < 7) return `${diffDays} gün əvvəl`;
      return date.toLocaleDateString('az-AZ');
    } catch (e) {
      return '';
    }
  };

  // Null check
  if (!item) return null;

  const itemData = item.data || {};
  const iconName = itemData.icon || 'notifications';

  return (
    <TouchableOpacity
      onPress={() => {
        if (onMarkAsRead) onMarkAsRead(item.id);
        if (onPress) onPress(item);
      }}
      className={`mx-4 mb-3 p-4 rounded-xl ${
        item.read
          ? isDarkMode
            ? 'bg-gray-800/50'
            : 'bg-gray-100'
          : isDarkMode
          ? 'bg-gray-800 border-l-4 border-indigo-500'
          : 'bg-white border-l-4 border-indigo-500 shadow-sm'
      }`}
    >
      <View className="flex-row items-start">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            item.read
              ? isDarkMode
                ? 'bg-gray-700'
                : 'bg-gray-200'
              : 'bg-indigo-100'
          }`}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={item.read ? (isDarkMode ? '#6B7280' : '#9CA3AF') : '#6366F1'}
          />
        </View>
        <View className="flex-1">
          <Text
            className={`font-semibold mb-1 ${
              item.read
                ? isDarkMode
                  ? 'text-gray-400'
                  : 'text-gray-500'
                : isDarkMode
                ? 'text-white'
                : 'text-gray-900'
            }`}
          >
            {item.title}
          </Text>
          <Text
            className={`text-sm ${
              item.read
                ? isDarkMode
                  ? 'text-gray-500'
                  : 'text-gray-400'
                : isDarkMode
                ? 'text-gray-300'
                : 'text-gray-600'
            }`}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text
            className={`text-xs mt-2 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {timeAgo(item.receivedAt)}
          </Text>
        </View>
        {!item.read && (
          <View className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1" />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { language } = useLanguage();
  const t = translations[language];
  const {
    notificationsList,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
  } = useNotifications();

  const [showClearModal, setShowClearModal] = useState(false);

  const handleNotificationPress = (notification) => {
    try {
      const data = notification?.data || {};
      console.log('Notification data:', data);

      // Bildirişin data-sına görə yönləndir
      if (data.eventId) {
        router.push({
          pathname: '/event-details/[id]',
          params: { id: data.eventId }
        });
      } else if (data.route) {
        router.push(data.route);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleClearAll = () => {
    setShowClearModal(true);
  };

  const confirmClearAll = () => {
    clearAllNotifications();
    setShowClearModal(false);
  };

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-8">
      <View
        className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}
      >
        <Ionicons
          name="notifications-off-outline"
          size={48}
          color={isDarkMode ? '#6B7280' : '#9CA3AF'}
        />
      </View>
      <Text
        className={`text-lg font-semibold mb-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-700'
        }`}
      >
        Bildiriş yoxdur
      </Text>
      <Text
        className={`text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
      >
        Yeni bildirişlər gəldikdə burada görünəcək
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: isDarkMode ? '#111827' : '#F9FAFB' }}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#111827' : '#F9FAFB'}
      />

      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDarkMode ? '#E5E7EB' : '#374151'}
          />
        </TouchableOpacity>

        <Text
          className={`text-lg font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Bildirişlər
          {unreadCount > 0 && (
            <Text className="text-indigo-500"> ({unreadCount})</Text>
          )}
        </Text>

        <View className="flex-row">
          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              className={`w-10 h-10 rounded-full items-center justify-center mr-2 ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name="checkmark-done"
                size={22}
                color={isDarkMode ? '#818CF8' : '#6366F1'}
              />
            </TouchableOpacity>
          )}
          {notificationsList.length > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color="#EF4444"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      {notificationsList.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={notificationsList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onPress={handleNotificationPress}
              onMarkAsRead={markAsRead}
              isDarkMode={isDarkMode}
            />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Clear All Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View
            className={`w-full rounded-2xl p-6 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-3">
                <Ionicons name="trash-outline" size={32} color="#EF4444" />
              </View>
              <Text
                className={`text-xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Bütün bildirişləri sil?
              </Text>
              <Text
                className={`text-center ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Bu əməliyyat geri qaytarıla bilməz. Bütün bildirişlər silinəcək.
              </Text>
            </View>

            <View className="flex-row mt-4">
              <TouchableOpacity
                onPress={() => setShowClearModal(false)}
                className={`flex-1 py-3 rounded-xl mr-2 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Ləğv et
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmClearAll}
                className="flex-1 py-3 rounded-xl bg-red-500 ml-2"
              >
                <Text className="text-center font-semibold text-white">
                  Sil
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
