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
};

export default config;
