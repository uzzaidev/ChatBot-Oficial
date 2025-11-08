/**
 * RESTORE AUTOMÁTICO DO BACKUP
 * 
 * Este script lê o backup original (chatbot_data_20251030_175352.sql)
 * e restaura TUDO que for possível, adaptando ao schema atual
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');

// Configuração do PostgreSQL  
let connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

// Remover sslmode=require da connection string
connectionString = connectionString.replace(/[?&]sslmode=require/, '');

if (!connectionString) {
  console.error('❌ POSTGRES_URL não encontrado no .env.local');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Função para extrair dados do formato COPY
function extractCopyData(sqlContent, tableName) {
  // Regex para capturar blocos COPY
  const regex = new RegExp(
    `COPY public\\.${tableName}\\s*\\(([^)]+)\\)\\s*FROM stdin;([\\s\\S]*?)\\\\\\.`,
    'gi'
  );
  
  const matches = [...sqlContent.matchAll(regex)];
  const allRecords = [];
  
  for (const match of matches) {
    const columns = match[1].split(',').map(c => c.trim());
    const dataBlock = match[2].trim();
    const lines = dataBlock.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line === '\\.') continue;
      
      // Parsear linha do formato COPY (separado por TAB)
      const values = [];
      let currentValue = '';
      let inEscape = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '\\' && !inEscape) {
          inEscape = true;
          continue;
        }
        
        if (inEscape) {
          if (char === 'N') {
            currentValue = null;
          } else if (char === 't') {
            currentValue += '\t';
          } else if (char === 'n') {
            currentValue += '\n';
          } else {
            currentValue += char;
          }
          inEscape = false;
          continue;
        }
        
        if (char === '\t') {
          values.push(currentValue === '' ? null : currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Adicionar último valor
      values.push(currentValue === '' ? null : currentValue);
      
      // Criar objeto com colunas
      const record = {};
      columns.forEach((col, idx) => {
        record[col] = values[idx];
      });
      
      allRecords.push(record);
    }
  }
  
  return { columns: matches[0]?.[1].split(',').map(c => c.trim()) || [], records: allRecords };
}

// Mapeamento de colunas do backup para o schema atual
const columnMappings = {
  clients: {
    // Backup -> Atual
    id: 'id',
    name: 'name',
    // slug: IGNORAR (não existe mais)
    // status: IGNORAR
    // plan: IGNORAR
    // notification_email: IGNORAR
    verify_token: (record) => record.verify_token || 'default-verify-token',
    meta_access_token: (record) => record.meta_access_token || 'default-meta-token',
    phone_number_id: (record) => record.phone_number_id || '0000000000',
    openai_api_key: (record) => record.openai_api_key || null,
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  clientes_whatsapp: {
    telefone: 'telefone',
    nome: 'nome',
    status: 'status',
    created_at: 'created_at',
    client_id: 'client_id'
  }
};

async function createTableIfNeeded() {
  console.log('📋 Verificando se tabela clientes_whatsapp existe...');
  
  const checkTable = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'clientes_whatsapp'
    );
  `);
  
  if (!checkTable.rows[0].exists) {
    console.log('⚙️  Criando tabela clientes_whatsapp...');
    
    await client.query(`
      CREATE TABLE public.clientes_whatsapp (
        telefone NUMERIC NOT NULL PRIMARY KEY,
        nome TEXT,
        status TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE
      );
      
      CREATE INDEX idx_clientes_whatsapp_client_id ON public.clientes_whatsapp(client_id);
      CREATE INDEX idx_clientes_whatsapp_status ON public.clientes_whatsapp(status);
      
      CREATE OR REPLACE VIEW public."Clientes WhatsApp" AS
      SELECT telefone, nome, status, created_at
      FROM public.clientes_whatsapp;
    `);
    
    console.log('✅ Tabela clientes_whatsapp criada!');
  } else {
    console.log('✅ Tabela clientes_whatsapp já existe');
  }
}

async function getCurrentSchema(tableName) {
  const result = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position;
  `, [tableName]);
  
  return result.rows.map(r => r.column_name);
}

async function restoreTable(tableName, backupData) {
  console.log(`\n📦 Restaurando ${tableName}...`);
  
  const currentColumns = await getCurrentSchema(tableName);
  console.log(`   Schema atual: ${currentColumns.join(', ')}`);
  
  const mapping = columnMappings[tableName];
  if (!mapping) {
    console.log(`   ⚠️  Sem mapeamento definido, pulando...`);
    return { inserted: 0, skipped: backupData.records.length };
  }
  
  let inserted = 0;
  let skipped = 0;
  
  for (const record of backupData.records) {
    try {
      // Construir dados mapeados
      const mappedData = {};
      
      for (const [currentCol, mapRule] of Object.entries(mapping)) {
        if (!currentColumns.includes(currentCol)) {
          // Coluna não existe no schema atual
          continue;
        }
        
        if (typeof mapRule === 'function') {
          mappedData[currentCol] = mapRule(record);
        } else if (typeof mapRule === 'string') {
          mappedData[currentCol] = record[mapRule];
        }
      }
      
      // Construir query INSERT
      const columns = Object.keys(mappedData);
      const values = Object.values(mappedData);
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (${tableName === 'clients' ? 'id' : 'telefone'}) DO UPDATE SET
        ${columns.filter(c => c !== 'id' && c !== 'telefone').map(c => `${c} = EXCLUDED.${c}`).join(', ')}
      `;
      
      await client.query(query, values);
      inserted++;
      
    } catch (error) {
      console.log(`   ⚠️  Erro ao inserir registro: ${error.message}`);
      skipped++;
    }
  }
  
  console.log(`   ✅ ${inserted} registros inseridos, ${skipped} ignorados`);
  return { inserted, skipped };
}

async function main() {
  console.log('🔄 RESTORE AUTOMÁTICO DO BACKUP\n');
  console.log('Arquivo: db/chatbot_data_20251030_175352.sql\n');
  
  // Ler arquivo de backup
  console.log('📖 Lendo arquivo de backup...');
  const backupFile = 'db/chatbot_data_20251030_175352.sql';
  
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Arquivo não encontrado: ${backupFile}`);
    process.exit(1);
  }
  
  const sqlContent = fs.readFileSync(backupFile, 'utf-8');
  console.log(`✅ Arquivo carregado (${(sqlContent.length / 1024).toFixed(1)} KB)\n`);
  
  // Conectar ao banco
  console.log('🔌 Conectando ao PostgreSQL...');
  await client.connect();
  console.log('✅ Conectado!\n');
  
  // Criar tabela clientes_whatsapp se necessário
  await createTableIfNeeded();
  
  // Extrair dados de cada tabela
  const tables = ['clients', 'clientes_whatsapp', 'conversations', 'messages', 'execution_logs', 'usage_logs'];
  const stats = {};
  
  for (const table of tables) {
    console.log(`\n🔍 Procurando dados de ${table}...`);
    const data = extractCopyData(sqlContent, table);
    
    if (data.records.length === 0) {
      console.log(`   ℹ️  Nenhum registro encontrado no backup`);
      stats[table] = { inserted: 0, skipped: 0 };
      continue;
    }
    
    console.log(`   ✅ ${data.records.length} registros encontrados`);
    stats[table] = await restoreTable(table, data);
  }
  
  // Verificar resultados
  console.log('\n\n📊 VERIFICAÇÃO FINAL:\n');
  
  for (const table of ['clients', 'clientes_whatsapp', 'conversations', 'messages']) {
    const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
    console.log(`   ${table}: ${result.rows[0].count} registros`);
  }
  
  // Resumo
  console.log('\n\n✅ RESTORE CONCLUÍDO!\n');
  console.log('Estatísticas:');
  for (const [table, stat] of Object.entries(stats)) {
    if (stat.inserted > 0 || stat.skipped > 0) {
      console.log(`   ${table}: ${stat.inserted} inseridos, ${stat.skipped} ignorados`);
    }
  }
  
  await client.end();
}

main().catch(error => {
  console.error('\n❌ ERRO:', error.message);
  console.error(error.stack);
  process.exit(1);
});
