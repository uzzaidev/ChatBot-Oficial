/**
 * RESTORE DIRETO DO BACKUP ORIGINAL
 * Executa os arquivos .sql do backup como eles são
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { Client } = require('pg');

async function main() {
  console.log('🔄 RESTORE COMPLETO DO BACKUP ORIGINAL\n');
  
  const client = new Client({
    connectionString: "postgres://postgres.jhodhxvvhohygijqcxbo:affJLwPDtzPm0LYI@aws-1-sa-east-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔌 Conectando...');
    await client.connect();
    console.log('✅ Conectado!\n');
    
    // PASSO 1: Dropar tabelas existentes
    console.log('🗑️  PASSO 1: Removendo tabelas existentes do schema public...');
    await client.query(`
      DROP TABLE IF EXISTS public.messages CASCADE;
      DROP TABLE IF EXISTS public.conversations CASCADE;
      DROP TABLE IF EXISTS public.usage_logs CASCADE;
      DROP TABLE IF EXISTS public.clientes_whatsapp CASCADE;
      DROP TABLE IF EXISTS public.clients CASCADE;
      DROP VIEW IF EXISTS public."Clientes WhatsApp" CASCADE;
    `);
    console.log('✅ Tabelas removidas!\n');
    
    // PASSO 2: Executar STRUCTURE (criar tudo do zero)
    console.log('📦 PASSO 2: Executando chatbot_structure_20251030_175352.sql...');
    let structure = fs.readFileSync('db/chatbot_structure_20251030_175352.sql', 'utf-8');
    
    // Remover comandos específicos do pg_dump que não funcionam via client.query
    structure = structure.replace(/\\restrict .*/g, '');
    structure = structure.replace(/^--.*$/gm, ''); // Remover comentários
    structure = structure.replace(/^\s*$/gm, ''); // Remover linhas vazias
    
    await client.query(structure);
    console.log('✅ Estrutura restaurada!\n');
    
    // PASSO 3: Executar DATA (inserir todos os dados)
    console.log('💾 PASSO 3: Executando chatbot_data_20251030_175352.sql...');
    let data = fs.readFileSync('db/chatbot_data_20251030_175352.sql', 'utf-8');
    
    // Limpar comandos especiais
    data = data.replace(/\\restrict .*/g, '');
    data = data.replace(/^--.*$/gm, '');
    
    await client.query(data);
    console.log('✅ Dados restaurados!\n');
    
    // VERIFICAR
    console.log('📊 VERIFICAÇÃO FINAL:\n');
    const tables = ['clients', 'clientes_whatsapp', 'conversations', 'messages', 'usage_logs'];
    
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${result.rows[0].count} registros`);
    }
    
    console.log('\n✅ RESTORE CONCLUÍDO COM SUCESSO!');
    console.log('📌 Banco restaurado EXATAMENTE como estava em 30/10/2025 17:53');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

main();
