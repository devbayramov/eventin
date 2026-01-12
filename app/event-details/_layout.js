import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function EventDetailsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'android' ? 'slide_from_right' : undefined,
        presentation: 'modal',
        orientation: 'portrait'
      }}
    />
  );
} 