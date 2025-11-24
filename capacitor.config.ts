import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out',
  
  // ⚠️ LIVE RELOAD - APENAS PARA DESENVOLVIMENTO
  // Remove esta seção antes de buildar para produção!
  server: {
    // Use o IP da sua rede local (WiFi)
    // Para descobrir: ipconfig | findstr IPv4
    url: 'http://192.168.0.20:3000',  // Altere para seu IP se necessário
    cleartext: true  // Permite HTTP (necessário para dev server local)
  }
};

export default config;
