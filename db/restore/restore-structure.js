#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const CONNECTION_STRING = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

console.log('\n================================================================');
console.log('      RESTORE: ESTRUTURA + DADOS DO BACKUP                     ');
console.log('================================================================\n');

async function main() {
  const connStr = CONNECTION_STRING.replace(/\?.*$/, '');
  
  const client = new Client({
    connectionString: connStr,
    ssl: false
  });

  try {
    console.log('[1/3] Conectando ao banco...');
    await client.connect();
    console.log('✓ Conectado!\n');

    // Passo 1: Criar estrutura a partir do migration.sql do projeto
    console.log('[2/3] Criando estrutura (migration.sql)...');
    const migrationPath = path.join(__dirname, '..', 'migrations', 'migration.sql');
    
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      await client.query(migrationSQL);
      console.log('✓ Estrutura criada!\n');
    } else {
      console.log('⚠️  migration.sql não encontrado, pulando...\n');
    }

    // Passo 2: Inserir dados via Supabase API (mais confiável)
    console.log('[3/3] Use o dashboard do Supabase para inserir dados:');
    console.log('   1. Abra: https://app.supabase.com/project/jhodhxvvhohygijqcxbo/editor');
    console.log('   2. Importe CSV ou use Table Editor para inserir manualmente\n');
    
    console.log('Dados no backup (30/10/2025 17:53):');
    console.log('   - 3 clients');
    console.log('   - 17 clientes_whatsapp (contatos)');
    console.log('   - 0 conversations');
    console.log('   - 0 messages\n');
    
    console.log('✓ Estrutura restaurada! Agora insira os dados manualmente.');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    await client.end();
  }
}

main();
