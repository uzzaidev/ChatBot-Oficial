import type { CapacitorConfig } from '@capacitor/cli';

// iOS: CapacitorCookies/CapacitorHttp intercept fetch and write cookies to the
// native URLSession jar (HTTPCookieStorage), separate from the WKWebView's own
// jar (WKWebsiteDataStore). Supabase's cookie-based session (@supabase/ssr) is
// set by the WKWebView, so on iOS the native jar and the WebView jar diverge and
// the session doesn't survive a relaunch. Android's WebView shares a single
// cookie store, so it's unaffected. Build iOS with `CAPACITOR_PLATFORM=ios`.
const isIosBuild = process.env.CAPACITOR_PLATFORM === 'ios';

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
      enabled: !isIosBuild,
    },
    CapacitorHttp: {
      enabled: !isIosBuild,
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
