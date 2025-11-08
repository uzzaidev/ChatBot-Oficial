#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração
const CONNECTION_STRING = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const TIMESTAMP = '20251030_175352';

console.log('\n================================================================');
console.log('      RESTORE VIA CONEXAO DIRETA POSTGRESQL                    ');
console.log('================================================================\n');

if (!CONNECTION_STRING) {
  console.error('❌ ERRO: POSTGRES_URL_NON_POOLING não encontrado no .env.local');
  process.exit(1);
}

console.log('✓ Connection string encontrada\n');

async function executeSQL(client, sqlFile, description) {
  console.log(`${description}...`);
  
  const filePath = path.join(__dirname, sqlFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    return false;
  }
  
  let sql = fs.readFileSync(filePath, 'utf8');
  
  // Remover linhas com \restrict (comando pg_dump específico)
  sql = sql.replace(/^\\restrict .+$/gm, '');
  
  // Remover comandos SET que podem causar problema
  sql = sql.replace(/^SET .+;$/gm, '');
  
  // Remover comentários TOC
  sql = sql.replace(/^-- TOC entry.+$/gm, '');
  
  try {
    console.log(`   Executando SQL (${Math.round(sql.length / 1024)}KB)...`);
    await client.query(sql);
    console.log(`✓ ${description} concluída!\n`);
    return true;
  } catch (error) {
    console.error(`⚠️  Erro: ${error.message}`);
    console.log(`   (Algumas queries podem falhar se dados já existem)\n`);
    return false;
  }
}

async function verifyRestore(client) {
  console.log('[4/4] Verificando restauração...\n');
  
  const tables = ['clients', 'conversations', 'messages', 'clientes_whatsapp'];
  
  for (const table of tables) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`   ${table.padEnd(20)}: ${count} registros`);
    } catch (error) {
      console.log(`   ${table.padEnd(20)}: Erro - ${error.message}`);
    }
  }
  
  console.log('');
}

async function main() {
  // Parsear connection string manualmente
  const connStr = CONNECTION_STRING.replace(/\?.*$/, ''); // Remove query params
  
  const client = new Client({
    connectionString: connStr,
    ssl: false  // Desabilitar SSL completamente
  });

  try {
    console.log('[1/4] Conectando ao banco...');
    await client.connect();
    console.log('✓ Conectado ao PostgreSQL!\n');

    // Passo 2: Restaurar estrutura
    await executeSQL(
      client,
      `chatbot_structure_${TIMESTAMP}.sql`,
      '[2/4] Restaurando ESTRUTURA do banco'
    );

    // Passo 3: Restaurar dados
    await executeSQL(
      client,
      `chatbot_data_${TIMESTAMP}.sql`,
      '[3/4] Restaurando DADOS do banco'
    );

    // Passo 4: Verificar
    await verifyRestore(client);

    console.log('================================================================');
    console.log('         RESTORE CONCLUIDO COM SUCESSO!                        ');
    console.log('================================================================\n');
    console.log('Próximos passos:');
    console.log('  1. Testar dashboard: npm run dev');
    console.log('  2. Abrir: http://localhost:3000/dashboard');
    console.log('  3. Verificar se conversas aparecem\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
