/**
 * RESTORE COMPLETO DO BACKUP
 * Restaura EXATAMENTE como estava, executando o SQL do backup original
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  console.log('🔄 RESTORE COMPLETO - EXECUTANDO BACKUP ORIGINAL\n');
  
  // Connection string
  const connectionString = "postgres://postgres.jhodhxvvhohygijqcxbo:affJLwPDtzPm0LYI@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  console.log('🔌 Conectando ao PostgreSQL...');
  await client.connect();
  console.log('✅ Conectado!\n');
  
  // Ler arquivo de structure
  console.log('📖 Lendo chatbot_structure_20251030_175352.sql...');
  const structureSQL = fs.readFileSync('db/chatbot_structure_20251030_175352.sql', 'utf-8');
  
  // Ler arquivo de data
  console.log('📖 Lendo chatbot_data_20251030_175352.sql...');
  const dataSQL = fs.readFileSync('db/chatbot_data_20251030_175352.sql', 'utf-8');
  
  console.log('\n⚙️  EXECUTANDO RESTORE COMPLETO...\n');
  
  try {
    // Executar structure (criar tabelas, functions, etc)
    console.log('1️⃣  Criando estrutura do banco...');
    await client.query(structureSQL);
    console.log('✅ Estrutura criada!\n');
    
    // Executar data (inserir dados)
    console.log('2️⃣  Restaurando dados...');
    await client.query(dataSQL);
    console.log('✅ Dados restaurados!\n');
    
    // Verificar
    console.log('📊 VERIFICAÇÃO:\n');
    
    const tables = ['clients', 'clientes_whatsapp', 'conversations', 'messages', 'execution_logs', 'usage_logs'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ${table}: ${result.rows[0].count} registros`);
      } catch (err) {
        console.log(`   ${table}: tabela não existe ou erro`);
      }
    }
    
    console.log('\n✅ RESTORE CONCLUÍDO COM SUCESSO!');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\nPilha:', error.stack);
  }
  
  await client.end();
}

main().catch(console.error);
