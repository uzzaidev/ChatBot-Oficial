import type { CapacitorConfig } from '@capacitor/cli';

// CapacitorCookies/CapacitorHttp OFF on every platform (since 2026-11-03, Capacitor 8).
// They intercept fetch/document.cookie and route them through the native cookie jar.
// iOS: the native jar (HTTPCookieStorage) diverges from the WKWebView jar, so the
// Supabase cookie session (@supabase/ssr) didn't survive a relaunch. UzzOPS, Liga and
// Convoca hit the same class of bug ("login looks fine, next request goes back to
// /login") and run with both off. The web app already works without them (browser and
// iOS), so Android now uses the plain WebView cookie store too.
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
    CapacitorCookies: {
      enabled: false,
    },
    CapacitorHttp: {
      enabled: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    // @capacitor-firebase/messaging (não @capacitor/push-notifications): no iOS
    // este plugin troca o token APNs pelo token FCM automaticamente, então o
    // backend (FCM HTTP v1, src/lib/push-dispatch.ts) recebe o mesmo formato
    // de token em Android e iOS.
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
  },
};

export default config;
