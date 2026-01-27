import { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const PUSH_TOKEN_KEY = '@push_token';
const NOTIFICATIONS_LIST_KEY = '@notifications_list';
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Background task - app bağlı ikən gələn bildirişləri saxla
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background notification error:', error);
    return;
  }

  if (data) {
    const notification = data.notification;
    if (notification) {
      try {
        // Mövcud bildirişləri al
        const savedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_LIST_KEY);
        let currentNotifications = savedNotifications ? JSON.parse(savedNotifications) : [];

        const notificationId = notification.request?.identifier || Date.now().toString();

        // Dublikat yoxla
        const alreadyExists = currentNotifications.some(n => n.id === notificationId);
        if (!alreadyExists) {
          const newNotification = {
            id: notificationId,
            title: notification.request?.content?.title || 'Bildiriş',
            body: notification.request?.content?.body || '',
            data: notification.request?.content?.data || {},
            receivedAt: new Date().toISOString(),
            read: false,
          };

          currentNotifications = [newNotification, ...currentNotifications];
          await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(currentNotifications));
          console.log('Background notification saved:', newNotification.title);
        }
      } catch (e) {
        console.error('Error saving background notification:', e);
      }
    }
  }
});

// Push token-i Firestore-a saxla
export const savePushTokenToFirestore = async (token) => {
  try {
    const user = auth.currentUser;
    if (!user || !token) return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      await updateDoc(userRef, {
        expoPushToken: token,
        pushTokenUpdatedAt: new Date().toISOString(),
        platform: Platform.OS,
      });
    } else {
      await setDoc(userRef, {
        expoPushToken: token,
        pushTokenUpdatedAt: new Date().toISOString(),
        platform: Platform.OS,
      }, { merge: true });
    }

    console.log('Push token saved to Firestore');
  } catch (error) {
    console.error('Error saving push token to Firestore:', error);
  }
};

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Default notification settings
const DEFAULT_SETTINGS = {
  allNotifications: true,
  eventReminders: true,
  newEvents: true,
  followedOrganisers: true,
  promotions: false,
};

// Notifications context
const NotificationsContext = createContext({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  toggleAllNotifications: () => {},
  isLoading: true,
  expoPushToken: null,
  notification: null,
  registerForPushNotifications: () => {},
  // Bildiriş siyahısı üçün yeni funksiyalar
  notificationsList: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAllNotifications: () => {},
  addNotification: () => {},
});

// Register for push notifications
async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    try {
      // EAS Project ID - app.config.js-dən və ya hardcoded
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId ??
        '41b04da9-7852-4895-9150-5a64b8345080'; // Fallback projectId

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push token alındı:', token);
    } catch (error) {
      console.error('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Notifications Provider
export const NotificationsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notificationsList, setNotificationsList] = useState([]);

  const notificationListener = useRef();
  const responseListener = useRef();

  // Oxunmamış bildiriş sayı
  const unreadCount = notificationsList.filter(n => !n.read).length;

  // Load saved settings and register for push notifications on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load saved settings
        const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (savedSettings !== null) {
          setSettings(JSON.parse(savedSettings));
        }

        // Load saved push token
        const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (savedToken) {
          setExpoPushToken(savedToken);
        }

        // Load saved notifications list
        const savedNotifications = await AsyncStorage.getItem(NOTIFICATIONS_LIST_KEY);
        let currentNotifications = [];
        if (savedNotifications) {
          currentNotifications = JSON.parse(savedNotifications);
          setNotificationsList(currentNotifications);
        }

        // App bağlı ikən gələn bildirişi yoxla
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          const notification = lastResponse.notification;
          const notificationId = notification.request.identifier;

          // Bu bildiriş artıq siyahıda yoxdursa əlavə et
          const alreadyExists = currentNotifications.some(n => n.id === notificationId);
          if (!alreadyExists) {
            const newNotification = {
              id: notificationId,
              title: notification.request.content.title,
              body: notification.request.content.body,
              data: notification.request.content.data,
              receivedAt: new Date().toISOString(),
              read: false,
            };
            const updated = [newNotification, ...currentNotifications];
            setNotificationsList(updated);
            await AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));
          }
        }

        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
          // Save to Firestore
          await savePushTokenToFirestore(token);
        }

        // Background notification task-ı register et (iOS rebuild tələb edir)
        try {
          await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        } catch (taskError) {
          // iOS-da background notifications konfiqurasiya olunmayıbsa bu xəta baş verir
          // App yenidən build edilməlidir: npx expo prebuild --clean && npx expo run:ios
          console.log('Background notification task registration skipped:', taskError.message);
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
      // Bildirişi siyahıya əlavə et
      const newNotification = {
        id: notification.request.identifier || Date.now().toString(),
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        receivedAt: new Date().toISOString(),
        read: false,
      };
      setNotificationsList(prev => {
        const updated = [newNotification, ...prev];
        AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));
        return updated;
      });
    });

    // Listen for notification interactions (istifadəçi bildirişə basanda)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const notification = response.notification;
      const notificationId = notification.request.identifier;
      const data = notification.request.content.data;

      // Bildirişi siyahıya əlavə et (əgər yoxdursa)
      setNotificationsList(prev => {
        const alreadyExists = prev.some(n => n.id === notificationId);
        if (alreadyExists) return prev;

        const newNotification = {
          id: notificationId,
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: data,
          receivedAt: new Date().toISOString(),
          read: false,
        };
        const updated = [newNotification, ...prev];
        AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));
        return updated;
      });

      console.log('Notification tapped:', data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Save settings to AsyncStorage
  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  // Update a single setting
  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };

    // If turning off allNotifications, turn off all others too
    if (key === 'allNotifications' && !value) {
      newSettings.eventReminders = false;
      newSettings.newEvents = false;
      newSettings.followedOrganisers = false;
      newSettings.promotions = false;
    }

    // If turning on any individual setting, ensure allNotifications reflects this
    if (key !== 'allNotifications' && value) {
      const hasEnabledSetting =
        newSettings.eventReminders ||
        newSettings.newEvents ||
        newSettings.followedOrganisers ||
        newSettings.promotions;
      newSettings.allNotifications = hasEnabledSetting;
    }

    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Toggle all notifications
  const toggleAllNotifications = async (value) => {
    const newSettings = {
      allNotifications: value,
      eventReminders: value,
      newEvents: value,
      followedOrganisers: value,
      promotions: value,
    };

    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  // Manual registration for push notifications
  const registerForPushNotifications = async () => {
    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    }
    return token;
  };

  // Bildirişi oxunmuş kimi işarələ
  const markAsRead = async (notificationId) => {
    setNotificationsList(prev => {
      const updated = prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Bütün bildirişləri oxunmuş kimi işarələ
  const markAllAsRead = async () => {
    setNotificationsList(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Bütün bildirişləri sil
  const clearAllNotifications = async () => {
    setNotificationsList([]);
    await AsyncStorage.removeItem(NOTIFICATIONS_LIST_KEY);
  };

  // Manuel bildiriş əlavə et (test üçün və ya local notifications üçün)
  const addNotification = async (title, body, data = {}) => {
    const newNotification = {
      id: Date.now().toString(),
      title,
      body,
      data,
      receivedAt: new Date().toISOString(),
      read: false,
    };
    setNotificationsList(prev => {
      const updated = [newNotification, ...prev];
      AsyncStorage.setItem(NOTIFICATIONS_LIST_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <NotificationsContext.Provider
      value={{
        settings,
        updateSetting,
        toggleAllNotifications,
        isLoading,
        expoPushToken,
        notification,
        registerForPushNotifications,
        // Bildiriş siyahısı üçün yeni funksiyalar
        notificationsList,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAllNotifications,
        addNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

// Hook to use notifications context
export const useNotifications = () => useContext(NotificationsContext);

// Helper function to schedule a local notification
export const scheduleLocalNotification = async (title, body, data = {}, trigger = null) => {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // null means immediately
  });
  return id;
};

// Helper function to cancel a scheduled notification
export const cancelScheduledNotification = async (notificationId) => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

// Helper function to cancel all scheduled notifications
export const cancelAllScheduledNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
