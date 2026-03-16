import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uzzai.uzzapp',
  appName: 'UzzApp',
  webDir: 'out',
  // Safe mobile strategy: load production web app directly.
  server: {
    url: 'https://uzzapp.uzzai.com.br',
    cleartext: false,
  },

  ios: {
    // Deployment target (17.4+) é configurado no Podfile e Xcode
    scheme: 'UzzApp',
    contentInset: 'automatic',
    // webContentsDebuggingEnabled: true, // Descomentar apenas em dev
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
  },
};

export default config;
