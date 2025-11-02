/**
 * TESTE DE CONEXÃO COM SUPABASE
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testConnection() {
  console.log('🔌 Testando conexão com Supabase PostgreSQL...\n');
  
  const connectionString = "postgres://postgres.jhodhxvvhohygijqcxbo:affJLwPDtzPm0LYI@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";
  
  console.log('📋 Connection String:', connectionString.replace(/:[^:@]+@/, ':****@'));
  console.log('');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('⏳ Conectando...');
    await client.connect();
    console.log('✅ CONECTADO COM SUCESSO!\n');
    
    // Testar query simples
    console.log('🔍 Testando query...');
    const result = await client.query('SELECT version();');
    console.log('✅ Query executada!');
    console.log('📊 PostgreSQL Version:', result.rows[0].version);
    console.log('');
    
    // Listar tabelas
    console.log('📋 Listando tabelas disponíveis...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log(`\n✅ ${tables.rows.length} tabelas encontradas:\n`);
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('\n✅ CONEXÃO FUNCIONANDO PERFEITAMENTE!');
    
  } catch (error) {
    console.error('❌ ERRO AO CONECTAR:', error.message);
    console.error('\n🔍 Detalhes:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão encerrada.');
  }
}

testConnection();
