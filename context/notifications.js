import { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';
const PUSH_TOKEN_KEY = '@push_token';

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

  const notificationListener = useRef();
  const responseListener = useRef();

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

        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setExpoPushToken(token);
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
          // Save to Firestore
          await savePushTokenToFirestore(token);
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
    });

    // Listen for notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Handle notification tap - navigate to relevant screen
      console.log('Notification tapped:', data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
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
