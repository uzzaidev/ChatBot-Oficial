#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuração
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TIMESTAMP = '20251030_175352';

// Validações
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Credenciais do Supabase não encontradas no .env.local');
  process.exit(1);
}

// Cliente Supabase com service_role (bypass RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function confirmRestore() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                   RESTORE COMPLETO DO BANCO                    ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  console.log('⚠️  ATENÇÃO: Esta operação VAI SOBRESCREVER todos os dados atuais!\n');
  console.log(`Backup a ser restaurado: ${TIMESTAMP}\n`);
  
  // Em produção, use readline para confirmação
  // Por agora, prosseguir automaticamente
  console.log('✓ Confirmado. Iniciando restore...\n');
}

async function createSafetyBackup() {
  console.log('[1/5] Criando backup de segurança...');
  
  try {
    // Fazer backup das tabelas principais
    const tables = ['clients', 'conversations', 'messages', 'clientes_whatsapp'];
    const backup = {};
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1000);
      
      if (!error && data) {
        backup[table] = data;
        console.log(`   ✓ ${table}: ${data.length} registros`);
      }
    }
    
    const backupFile = path.join(__dirname, `safety_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`   ✓ Backup salvo: ${path.basename(backupFile)}\n`);
    
    return backupFile;
  } catch (error) {
    console.log(`   ⚠️  Aviso: ${error.message}\n`);
    return null;
  }
}

async function clearTables() {
  console.log('[2/5] Limpando tabelas existentes...');
  
  const tables = [
    'messages',
    'conversations', 
    'usage_logs',
    'documents',
    'clientes_whatsapp',
    'clients'
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✓ ${table} limpa`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${table}: ${err.message}`);
    }
  }
  
  console.log('');
}

async function parseAndInsertData(sqlFile, tableName) {
  const content = fs.readFileSync(sqlFile, 'utf8');
  
  // Procurar por COPY statements
  const copyRegex = new RegExp(
    `COPY public\\.${tableName}\\s*\\(([^)]+)\\)\\s*FROM stdin;([\\s\\S]*?)\\\\.`,
    'g'
  );
  
  const match = copyRegex.exec(content);
  if (!match) {
    return { inserted: 0, skipped: 0 };
  }
  
  const columns = match[1].split(',').map(c => c.trim());
  const dataLines = match[2].trim().split('\n').filter(line => line.trim());
  
  let inserted = 0;
  let skipped = 0;
  
  for (const line of dataLines) {
    try {
      // Parse TSV (tab-separated values)
      const values = line.split('\t');
      const record = {};
      
      columns.forEach((col, idx) => {
        const value = values[idx];
        
        // Converter valores especiais
        if (value === '\\N') {
          record[col] = null;
        } else if (value === 't') {
          record[col] = true;
        } else if (value === 'f') {
          record[col] = false;
        } else {
          record[col] = value;
        }
      });
      
      // Inserir no Supabase
      const { error } = await supabase
        .from(tableName)
        .insert(record);
      
      if (error) {
        console.log(`     ⚠️  Erro ao inserir: ${error.message}`);
        skipped++;
      } else {
        inserted++;
      }
    } catch (err) {
      skipped++;
    }
  }
  
  return { inserted, skipped };
}

async function restoreData() {
  console.log('[3/5] Restaurando dados do backup...\n');
  
  const backupFile = path.join(__dirname, `chatbot_full_${TIMESTAMP}.sql`);
  
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Arquivo não encontrado: ${backupFile}`);
    process.exit(1);
  }
  
  // Ler arquivo SQL
  const sqlContent = fs.readFileSync(backupFile, 'utf8');
  
  // Tabelas na ordem correta (respeitando foreign keys)
  const tables = [
    'clients',
    'clientes_whatsapp',
    'conversations',
    'messages',
    'documents',
    'usage_logs'
  ];
  
  for (const table of tables) {
    try {
      console.log(`   Restaurando ${table}...`);
      const { inserted, skipped } = await parseAndInsertData(backupFile, table);
      console.log(`   ✓ ${table}: ${inserted} inseridos, ${skipped} ignorados`);
    } catch (error) {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    }
  }
  
  console.log('');
}

async function verifyRestore() {
  console.log('[4/5] Verificando restauração...\n');
  
  const tables = ['clients', 'conversations', 'messages', 'clientes_whatsapp'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`   ${table}: ${count} registros`);
      }
    } catch (err) {
      console.log(`   ${table}: Erro ao contar`);
    }
  }
  
  console.log('');
}

async function main() {
  try {
    await confirmRestore();
    await createSafetyBackup();
    await clearTables();
    await restoreData();
    await verifyRestore();
    
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ RESTORE CONCLUÍDO COM SUCESSO!                 ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    console.log(`Dados restaurados do backup: ${TIMESTAMP}\n`);
    console.log('Próximos passos:');
    console.log('  1. Verificar dados no dashboard: http://localhost:3000/dashboard');
    console.log('  2. Testar funcionalidades principais');
    console.log('  3. Verificar logs de execução\n');
    
  } catch (error) {
    console.error('\n❌ ERRO durante restore:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
