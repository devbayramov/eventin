import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OrganisersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: Platform.OS === 'android' ? 'slide_from_right' : 'default',
        presentation: 'modal',
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationTypeForReplace: 'push'
      }}
    />
  );
} 