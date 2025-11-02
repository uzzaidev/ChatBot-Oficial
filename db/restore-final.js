#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const CONNECTION_STRING = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
const TIMESTAMP = '20251030_175352';

console.log('\n================================================================');
console.log('      RESTORE COMPLETO - INSERCAO DIRETA VIA POSTGRESQL        ');
console.log('================================================================\n');

function parseCopyData(sqlContent, tableName) {
  // Procurar pelo bloco COPY para esta tabela
  const copyRegex = new RegExp(
    `COPY public\\.${tableName}\\s*\\(([^)]+)\\)\\s*FROM stdin;([\\s\\S]*?)\\\\.`,
    'i'
  );
  
  const match = copyRegex.exec(sqlContent);
  if (!match) {
    return null;
  }
  
  const columns = match[1].split(',').map(c => c.trim().replace(/"/g, ''));
  const dataLines = match[2].trim().split('\n').filter(line => line.trim() && line.trim() !== '\\.');
  
  const records = [];
  
  for (const line of dataLines) {
    const values = line.split('\t');
    const record = {};
    
    columns.forEach((col, idx) => {
      let value = values[idx];
      
      // Converter valores especiais
      if (value === '\\N' || value === undefined) {
        record[col] = null;
      } else if (value === 't') {
        record[col] = true;
      } else if (value === 'f') {
        record[col] = false;
      } else {
        // Remover escape de tabs e newlines
        value = value.replace(/\\t/g, '\t').replace(/\\n/g, '\n');
        record[col] = value;
      }
    });
    
    records.push(record);
  }
  
  return { columns, records };
}

async function insertRecords(client, tableName, records, columnMapping = null) {
  if (!records || records.length === 0) {
    console.log(`   ${tableName}: Nenhum dado para inserir\n`);
    return { inserted: 0, skipped: 0 };
  }
  
  let inserted = 0;
  let skipped = 0;
  
  for (const record of records) {
    try {
      // Se tiver mapeamento de colunas, aplicar
      let finalRecord = record;
      if (columnMapping) {
        finalRecord = {};
        for (const [oldCol, newCol] of Object.entries(columnMapping)) {
          if (record[oldCol] !== undefined) {
            finalRecord[newCol] = record[oldCol];
          }
        }
      }
      
      // Remover colunas que não existem mais no schema atual
      const columns = Object.keys(finalRecord).filter(col => finalRecord[col] !== undefined);
      const values = columns.map(col => finalRecord[col]);
      
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      const columnsStr = columns.map(col => `"${col}"`).join(', ');
      
      const query = `INSERT INTO ${tableName} (${columnsStr}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      
      await client.query(query, values);
      inserted++;
    } catch (error) {
      // Ignorar erros de colunas que não existem
      if (!error.message.includes('does not exist') && 
          !error.message.includes('violates')) {
        console.log(`     ⚠️  Erro: ${error.message.substring(0, 100)}`);
      }
      skipped++;
    }
  }
  
  return { inserted, skipped };
}

async function main() {
  const dataFile = path.join(__dirname, `chatbot_data_${TIMESTAMP}.sql`);
  
  if (!fs.existsSync(dataFile)) {
    console.error(`❌ Arquivo não encontrado: ${dataFile}`);
    process.exit(1);
  }
  
  console.log(`[1/5] Lendo arquivo de backup (${Math.round(fs.statSync(dataFile).size / 1024 / 1024)}MB)...`);
  const sqlContent = fs.readFileSync(dataFile, 'utf8');
  console.log('✓ Arquivo carregado\n');
  
  const connStr = CONNECTION_STRING.replace(/\?.*$/, '');
  const client = new Client({
    connectionString: connStr,
    ssl: false
  });

  try {
    console.log('[2/5] Conectando ao banco...');
    await client.connect();
    console.log('✓ Conectado!\n');
    
    console.log('[3/5] Extraindo dados do backup...\n');
    
    // Parsear dados de cada tabela
    const tables = {
      'clients': parseCopyData(sqlContent, 'clients'),
      'clientes_whatsapp': parseCopyData(sqlContent, 'clientes_whatsapp'),
      'conversations': parseCopyData(sqlContent, 'conversations'),
      'messages': parseCopyData(sqlContent, 'messages'),
      'execution_logs': parseCopyData(sqlContent, 'execution_logs'),
      'usage_logs': parseCopyData(sqlContent, 'usage_logs')
    };
    
    for (const [tableName, data] of Object.entries(tables)) {
      if (data && data.records) {
        console.log(`   ${tableName}: ${data.records.length} registros encontrados`);
      }
    }
    
    console.log('\n[4/5] Inserindo dados...\n');
    
    // Inserir clients (com mapeamento para ignorar colunas antigas)
    if (tables.clients && tables.clients.records.length > 0) {
      console.log('   Inserindo clients...');
      const { inserted, skipped } = await insertRecords(client, 'clients', tables.clients.records);
      console.log(`   ✓ clients: ${inserted} inseridos, ${skipped} ignorados\n`);
    }
    
    // Inserir clientes_whatsapp
    if (tables.clientes_whatsapp && tables.clientes_whatsapp.records.length > 0) {
      console.log('   Inserindo clientes_whatsapp...');
      const { inserted, skipped } = await insertRecords(client, 'clientes_whatsapp', tables.clientes_whatsapp.records);
      console.log(`   ✓ clientes_whatsapp: ${inserted} inseridos, ${skipped} ignorados\n`);
    }
    
    // Inserir conversations
    if (tables.conversations && tables.conversations.records.length > 0) {
      console.log('   Inserindo conversations...');
      const { inserted, skipped } = await insertRecords(client, 'conversations', tables.conversations.records);
      console.log(`   ✓ conversations: ${inserted} inseridos, ${skipped} ignorados\n`);
    }
    
    // Inserir messages
    if (tables.messages && tables.messages.records.length > 0) {
      console.log('   Inserindo messages...');
      const { inserted, skipped } = await insertRecords(client, 'messages', tables.messages.records);
      console.log(`   ✓ messages: ${inserted} inseridos, ${skipped} ignorados\n`);
    }
    
    // Inserir execution_logs
    if (tables.execution_logs && tables.execution_logs.records.length > 0) {
      console.log('   Inserindo execution_logs...');
      const { inserted, skipped } = await insertRecords(client, 'execution_logs', tables.execution_logs.records);
      console.log(`   ✓ execution_logs: ${inserted} inseridos, ${skipped} ignorados\n`);
    }
    
    console.log('[5/5] Verificando dados inseridos...\n');
    
    const verifyTables = ['clients', 'clientes_whatsapp', 'conversations', 'messages'];
    
    for (const table of verifyTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = result.rows[0].count;
        console.log(`   ${table.padEnd(20)}: ${count} registros`);
      } catch (error) {
        console.log(`   ${table.padEnd(20)}: Erro - ${error.message}`);
      }
    }
    
    console.log('\n================================================================');
    console.log('         RESTORE CONCLUIDO COM SUCESSO!                        ');
    console.log('================================================================\n');
    console.log('Proximos passos:');
    console.log('  1. Testar dashboard: npm run dev');
    console.log('  2. Abrir: http://localhost:3000/dashboard');
    console.log('  3. Verificar se dados aparecem\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
