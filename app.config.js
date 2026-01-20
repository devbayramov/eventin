export default ({ config }) => ({
  ...config,
  expo: {
    name: "eventin",
    slug: "eventin",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    scheme: "eventin",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    notification: {
      icon: "./assets/splash-icon.png",
      color: "#6366f1",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.eventin.app",
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/app-icon.png",
        backgroundColor: "#1F2937",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.eventin.app",
      googleServicesFile: "./google-services.json"

    },

    web: {
      output: "static",
      favicon: "./assets/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/app-icon.png",
          color: "#6366f1",
          sounds: [],
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      eas: {
        projectId: "41b04da9-7852-4895-9150-5a64b8345080",
      },
    },
  },
});
