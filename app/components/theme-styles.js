import { useTheme } from '../../context/theme';

// Tema için ortak stil özellikleri
const lightColors = {
  background: '#ffffff',
  backgroundSecondary: '#f3f4f6',
  text: '#1f2937',
  textSecondary: '#6b7280',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  border: '#e5e7eb',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  cardBackground: '#ffffff',
  cardBorder: '#e5e7eb',
  inputBackground: '#ffffff',
  inputBorder: '#d1d5db',
};

const darkColors = {
  background: '#1f2937',
  backgroundSecondary: '#111827',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  primary: '#818cf8',
  primaryDark: '#6366f1',
  border: '#374151',
  success: '#34d399',
  error: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa',
  cardBackground: '#1f2937',
  cardBorder: '#374151',
  inputBackground: '#374151',
  inputBorder: '#4b5563',
};

// Tema stillerini hook olarak dışa aktarma
export function useThemeStyles() {
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  // Sayfa stilleri
  const pageStyles = {
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    scrollContainer: {
      backgroundColor: colors.background,
    },
  };

  // Kart stilleri
  const cardStyles = {
    container: {
      backgroundColor: colors.cardBackground,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      marginVertical: 8,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 12,
    },
  };

  // Buton stilleri
  const buttonStyles = {
    primary: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: colors.primary,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      primary: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
      },
      secondary: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
  };

  // Form stilleri
  const formStyles = {
    input: {
      backgroundColor: colors.inputBackground,
      borderColor: colors.inputBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      color: colors.text,
      fontSize: 16,
    },
    label: {
      color: colors.text,
      fontSize: 16,
      marginBottom: 8,
      fontWeight: '500',
    },
    error: {
      color: colors.error,
      fontSize: 14,
      marginTop: 4,
    },
  };

  // Metin stilleri
  const textStyles = {
    h1: {
      color: colors.text,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    h2: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    h3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    body: {
      color: colors.text,
      fontSize: 16,
    },
    caption: {
      color: colors.textSecondary,
      fontSize: 14,
    },
  };

  return {
    colors,
    pageStyles,
    cardStyles,
    buttonStyles,
    formStyles,
    textStyles,
    isDarkMode,
  };
} 