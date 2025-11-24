const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiPath = path.join(__dirname, '..', 'src', 'app', 'api');
const apiBackupPath = path.join(__dirname, '..', 'src', 'app', '_api_temp');

console.log('📱 Iniciando build mobile...\n');
console.log('ℹ️  App mobile usa helper de API que aponta para produção\n');

try {
  // 1. Mover rotas API temporariamente
  if (fs.existsSync(apiPath)) {
    console.log('📦 Movendo rotas API temporariamente...');
    if (fs.existsSync(apiBackupPath)) {
      fs.rmSync(apiBackupPath, { recursive: true, force: true });
    }
    fs.renameSync(apiPath, apiBackupPath);
    console.log('✅ APIs movidas\n');
  }

  // 2. Build do Next.js
  console.log('🔨 Executando build do Next.js...');

  // Definir URL da API para mobile
  const apiUrl = 'https://uzzapp.uzzai.com.br';
  console.log(`📡 API URL para mobile: ${apiUrl}\n`);

  execSync(`doppler run --config prd -- cross-env CAPACITOR_BUILD=true NEXT_PUBLIC_API_URL=${apiUrl} next build`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Build concluído\n');

} catch (error) {
  console.error('❌ Erro no build:', error.message);
  throw error;
} finally {
  // 3. Restaurar APIs
  if (fs.existsSync(apiBackupPath)) {
    console.log('🔄 Restaurando rotas API...');
    if (fs.existsSync(apiPath)) {
      fs.rmSync(apiPath, { recursive: true, force: true });
    }
    fs.renameSync(apiBackupPath, apiPath);
    console.log('✅ APIs restauradas\n');
  }
}

console.log('🎉 Build mobile concluído!\n');
console.log('📝 Próximos passos:');
console.log('   1. npx cap sync android');
console.log('   2. npx cap open android');
