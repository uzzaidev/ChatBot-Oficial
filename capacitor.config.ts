import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out'
  // ⚠️ LIVE RELOAD - REMOVIDO
  // Para usar live reload, descomente a seção abaixo e inicie o dev server (npm run dev)
  // server: {
  //   url: 'http://192.168.0.20:3000',  // Seu IP local
  //   cleartext: true
  // }
};

export default config;
