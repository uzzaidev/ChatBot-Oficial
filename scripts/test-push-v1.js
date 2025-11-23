/**
 * Script para enviar notificação push de teste via Firebase Cloud Messaging API V1
 * 
 * INSTRUÇÕES:
 * 1. Obter Service Account JSON do Firebase:
 *    - Firebase Console → ⚙️ Project Settings → Service Accounts
 *    - Criar/baixar Service Account Key (JSON)
 *    - Salvar como: firebase-service-account.json (na raiz do projeto)
 *
 * 2. Copiar Token do Supabase:
 *    - Supabase → Table Editor → push_tokens → Copiar coluna "token"
 *
 * 3. Instalar dependência:
 *    npm install firebase-admin
 *
 * 4. Editar este script e colar o token abaixo
 *
 * 5. Executar: node scripts/test-push-v1.js
 */

const admin = require('firebase-admin');
const path = require('path');

// ============================================================================
// CONFIGURAÇÃO - COLE O TOKEN AQUI
// ============================================================================

const TOKEN = 'ca8tSH2CS7ufYnF4uXY97v:APA91bGYIPaKIGKV1UWV4_bwaeYZY1f6IFW0y-s4rLsx2Q2hPZLDUy8g-m4X7upPdrdX6PqzgaB_QRqZE9s4EL_rARZ1ebViWY3hoi4zAxXXW6Mob-dTFKA';

// ============================================================================
// NÃO MODIFICAR ABAIXO
// ============================================================================

// Caminho do arquivo de service account
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

// Verificar se arquivo existe
const fs = require('fs');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERRO: Arquivo firebase-service-account.json não encontrado!');
  console.error('');
  console.error('Como obter:');
  console.error('1. Firebase Console → ⚙️ Project Settings → Service Accounts');
  console.error('2. Criar/baixar Service Account Key (JSON)');
  console.error('3. Salvar como: firebase-service-account.json (na raiz do projeto)');
  process.exit(1);
}

// Verificar se token foi configurado
if (TOKEN === 'COLE_SEU_TOKEN_DO_SUPABASE_AQUI') {
  console.error('❌ ERRO: Configure o TOKEN antes de executar!');
  console.error('');
  console.error('Como obter:');
  console.error('1. Supabase → Table Editor → push_tokens');
  console.error('2. Copiar valor da coluna "token"');
  process.exit(1);
}

// Carregar service account
const serviceAccount = require(serviceAccountPath);

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  console.error('❌ Erro ao inicializar Firebase Admin:', error.message);
  process.exit(1);
}

// Preparar mensagem
const message = {
  notification: {
    title: 'Teste Push',
    body: 'Esta é uma notificação de teste do UzzApp'
  },
  data: {
    type: 'test',
    chat_id: 'test-123'
  },
  token: TOKEN
};

console.log('');
console.log('========================================');
console.log('Enviando notificação de teste...');
console.log('========================================');
console.log('Token:', TOKEN.substring(0, 20) + '...');
console.log('');

// Enviar notificação
admin.messaging().send(message)
  .then((response) => {
    console.log('✅ SUCESSO! Notificação enviada!');
    console.log('');
    console.log('Resposta do Firebase:');
    console.log(JSON.stringify(response, null, 2));
    console.log('');
    console.log('Verifique o device/emulador - a notificação deve aparecer!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ ERRO ao enviar notificação!');
    console.error('');
    console.error('Código:', error.code);
    console.error('Mensagem:', error.message);
    console.error('');
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.error('Token inválido. Verifique se:');
      console.error('1. Token está correto');
      console.error('2. Token não expirou');
      console.error('3. App está registrado corretamente');
    } else if (error.code === 'messaging/registration-token-not-registered') {
      console.error('Token não registrado. O app pode ter sido desinstalado.');
    }
    
    process.exit(1);
  });

