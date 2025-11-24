import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out'
  // App mobile usa helper getApiBaseUrl() que aponta para produção
  // Ver: src/lib/api.ts
};

export default config;
