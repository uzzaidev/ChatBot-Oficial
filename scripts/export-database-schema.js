/**
 * Script para Exportar Schema Completo do Banco de Dados
 * 
 * ⚠️ SEGURANÇA: Este script é 100% SEGURO - APENAS LEITURA
 * - ✅ Apenas faz SELECT (consulta) - nunca modifica o banco
 * - ✅ Apenas lê arquivos de migration - nunca executa SQL
 * - ✅ Apenas gera arquivos locais - nunca modifica projeto
 * - ✅ Usa apenas views de sistema (pg_catalog, information_schema)
 * - ❌ NÃO faz INSERT, UPDATE, DELETE, CREATE, ALTER, DROP
 * 
 * Exporta (apenas leitura):
 * - Todas as tabelas e colunas
 * - Políticas RLS
 * - Triggers
 * - Funções
 * - Constraints e Foreign Keys
 * - Índices
 * 
 * Analisa (apenas leitura):
 * - Arquivos de migration do Supabase
 * - Compara banco vs migrations
 * 
 * Arquivos gerados (apenas em docs/database/):
 * - schema-export.json (dados completos)
 * - schema-export.md (documentação legível)
 * - schema-comparison.md (relatório comparativo)
 * 
 * Uso:
 *   npm run db:export
 * 
 * Requer: Variáveis de ambiente do Supabase configuradas (.env.local)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Carregar .env.local usando o mesmo padrão dos scripts de restore
require('dotenv').config({ 
  path: path.join(__dirname, '..', '.env.local') 
});

// Configuração da conexão - COMPATÍVEL com o padrão do projeto
// Usa as mesmas variáveis que os scripts em db/restore/
const getConnectionString = () => {
  // Prioridade 1: POSTGRES_URL (pooled) - padrão do projeto
  if (process.env.POSTGRES_URL) {
    // Remove query params se existirem (como sslmode)
    return process.env.POSTGRES_URL.replace(/\?.*$/, '');
  }
  
  // Prioridade 2: POSTGRES_URL_NON_POOLING - usado em scripts de restore
  if (process.env.POSTGRES_URL_NON_POOLING) {
    return process.env.POSTGRES_URL_NON_POOLING.replace(/\?.*$/, '');
  }
  
  // Prioridade 3: Montar a partir de variáveis individuais (padrão de src/lib/postgres.ts)
  const host = process.env.POSTGRES_HOST || 'db.jhodhxvvhohygijqcxbo.supabase.co';
  const port = process.env.POSTGRES_PORT || '6543'; // Pooler padrão
  const user = process.env.POSTGRES_USER || 'postgres.jhodhxvvhohygijqcxbo';
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE || 'postgres';
  
  if (!password) {
    throw new Error(
      '❌ Variáveis de ambiente não configuradas!\n\n' +
      'Configure no .env.local uma das opções:\n' +
      '1. POSTGRES_URL=postgresql://... (recomendado)\n' +
      '2. POSTGRES_URL_NON_POOLING=postgresql://...\n' +
      '3. POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD\n\n' +
      'Ver: src/lib/postgres.ts ou db/restore/restore-pg.js para referência'
    );
  }
  
  return `postgres://${user}:${password}@${host}:${port}/${database}`;
};

async function exportSchema() {
  const connectionString = getConnectionString();
  
  // Log sanitizado (esconde senha)
  const sanitizedConn = connectionString.replace(/:[^:@]+@/, ':****@');
  console.log(`📋 Usando connection string: ${sanitizedConn}\n`);
  
  const client = new Client({
    connectionString,
    ssl: { 
      rejectUnauthorized: false // Necessário para Supabase
    }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...\n');
    await client.connect();
    console.log('✅ Conectado com sucesso!\n');

    const schema = {
      exported_at: new Date().toISOString(),
      database_info: {},
      tables: [],
      rls_policies: [],
      triggers: [],
      functions: [],
      constraints: [],
      indexes: [],
      migrations_analysis: null // Será preenchido depois
    };

    // 1. Informações do banco
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database_name,
        version() as postgres_version,
        current_user as current_user
    `);
    schema.database_info = dbInfo.rows[0];

    // 2. Tabelas e Colunas
    console.log('📋 Exportando tabelas e colunas...');
    
    // Query otimizada para Primary Keys (suporta PKs compostas)
    const tables = await client.query(`
      SELECT
        n.nspname AS table_schema,
        c.relname AS table_name,
        a.attname AS column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
        NOT a.attnotnull AS is_nullable,
        COALESCE(pg_get_expr(d.adbin, d.adrelid), '') AS column_default,
        a.attnum AS ordinal_position,
        CASE 
          WHEN pk.column_name IS NOT NULL THEN true 
          ELSE false 
        END AS is_primary_key
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN pg_catalog.pg_attrdef d ON a.attrelid = d.adrelid AND a.attnum = d.adnum
      LEFT JOIN (
        SELECT 
          ku.table_schema, 
          ku.table_name, 
          ku.column_name,
          ku.ordinal_position
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku
          ON tc.constraint_name = ku.constraint_name
          AND tc.table_schema = ku.table_schema
          AND tc.table_catalog = ku.table_catalog
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON n.nspname = pk.table_schema 
        AND c.relname = pk.table_name 
        AND a.attname = pk.column_name
      WHERE c.relkind = 'r'  -- Apenas tabelas (não views)
        AND n.nspname = 'public'
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY n.nspname, c.relname, a.attnum;
    `);

    // Agrupar colunas por tabela
    const tablesMap = {};
    tables.rows.forEach(row => {
      const key = `${row.table_schema}.${row.table_name}`;
      if (!tablesMap[key]) {
        tablesMap[key] = {
          schema: row.table_schema,
          name: row.table_name,
          columns: []
        };
      }
      tablesMap[key].columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
        position: row.ordinal_position,
        is_primary_key: row.is_primary_key
      });
    });
    schema.tables = Object.values(tablesMap);
    console.log(`   ✅ ${schema.tables.length} tabelas encontradas`);

    // 3. Políticas RLS
    console.log('🔒 Exportando políticas RLS...');
    const rls = await client.query(`
      SELECT
        nsp.nspname AS table_schema,
        cls.relname AS table_name,
        pol.polname AS policy_name,
        pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
        pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression,
        CASE pol.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'a' THEN 'INSERT'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
          ELSE pol.polcmd::text
        END AS for_command,
        pol.polroles AS roles
      FROM pg_catalog.pg_policy pol
      JOIN pg_catalog.pg_class cls ON pol.polrelid = cls.oid
      JOIN pg_catalog.pg_namespace nsp ON cls.relnamespace = nsp.oid
      WHERE nsp.nspname = 'public'
      ORDER BY table_schema, table_name, policy_name;
    `);
    schema.rls_policies = rls.rows;
    console.log(`   ✅ ${schema.rls_policies.length} políticas encontradas`);

    // 4. Triggers
    console.log('⚡ Exportando triggers...');
    const triggers = await client.query(`
      SELECT
        n.nspname AS table_schema,
        c.relname AS table_name,
        t.tgname AS trigger_name,
        pg_get_triggerdef(t.oid, true) AS trigger_definition,
        p.proname AS function_name
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      LEFT JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
      ORDER BY table_schema, table_name, trigger_name;
    `);
    schema.triggers = triggers.rows;
    console.log(`   ✅ ${schema.triggers.length} triggers encontrados`);

    // 5. Funções
    console.log('🔧 Exportando funções...');
    // Primeiro, pegar lista de funções sem tentar pg_get_functiondef (evita erro com agregadas)
    const functionsList = await client.query(`
      SELECT
        n.nspname AS function_schema,
        p.proname AS function_name,
        p.oid AS function_oid,
        p.prokind AS function_kind,
        pg_get_function_arguments(p.oid) AS arguments,
        pg_get_function_result(p.oid) AS return_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.prokind IN ('f', 'p')  -- Apenas funções normais (f) e procedures (p)
      ORDER BY function_schema, function_name;
    `);
    
    // Agora pegar definições apenas para funções válidas
    const functionsWithDef = [];
    for (const func of functionsList.rows) {
      try {
        const defResult = await client.query(`
          SELECT pg_get_functiondef($1) AS definition
        `, [func.function_oid]);
        functionsWithDef.push({
          function_schema: func.function_schema,
          function_name: func.function_name,
          arguments: func.arguments,
          return_type: func.return_type,
          definition: defResult.rows[0]?.definition || null
        });
      } catch (err) {
        // Se falhar ao pegar definição, inclui sem definição
        functionsWithDef.push({
          function_schema: func.function_schema,
          function_name: func.function_name,
          arguments: func.arguments,
          return_type: func.return_type,
          definition: null
        });
      }
    }
    
    schema.functions = functionsWithDef;
    console.log(`   ✅ ${schema.functions.length} funções encontradas`);

    // 6. Constraints e Foreign Keys
    console.log('🔗 Exportando constraints e foreign keys...');
    const constraints = await client.query(`
      SELECT
        tc.table_schema,
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK')
      ORDER BY tc.table_name, tc.constraint_name;
    `);
    schema.constraints = constraints.rows;
    console.log(`   ✅ ${schema.constraints.length} constraints encontradas`);

    // 7. Índices
    console.log('📇 Exportando índices...');
    const indexes = await client.query(`
      SELECT
        schemaname AS table_schema,
        tablename AS table_name,
        indexname AS index_name,
        indexdef AS index_definition
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    schema.indexes = indexes.rows;
    console.log(`   ✅ ${indexes.rows.length} índices encontrados`);

    // 8. Analisar Migrations do Supabase
    console.log('📦 Analisando migrations do Supabase...');
    let migrationsAnalysis = null;
    let comparison = null;
    
    try {
      migrationsAnalysis = analyzeMigrations();
      schema.migrations_analysis = migrationsAnalysis;
      console.log(`   ✅ ${migrationsAnalysis.tables_in_migrations.length} tabelas encontradas nas migrations`);
      console.log(`   ✅ ${migrationsAnalysis.functions_in_migrations.length} funções encontradas nas migrations`);

      // 9. Comparar Banco vs Migrations
      console.log('🔍 Comparando banco de dados com migrations...');
      comparison = compareDatabaseWithMigrations(schema, migrationsAnalysis);
      schema.comparison = comparison;
      
      if (comparison.tables.missing_in_database.length > 0) {
        console.log(`   ⚠️  ${comparison.tables.missing_in_database.length} tabelas nas migrations mas NÃO no banco`);
      }
      if (comparison.tables.missing_in_migrations.length > 0) {
        console.log(`   ⚠️  ${comparison.tables.missing_in_migrations.length} tabelas no banco mas NÃO nas migrations`);
      }
      if (comparison.tables.missing_in_database.length === 0 && comparison.tables.missing_in_migrations.length === 0) {
        console.log(`   ✅ Banco e migrations estão sincronizados!`);
      }
    } catch (error) {
      console.log(`   ⚠️  Erro ao analisar migrations: ${error.message}`);
      console.log(`   (Continuando sem análise de migrations...)`);
      schema.migrations_analysis = { error: error.message };
      schema.comparison = null;
    }

    // Salvar em JSON
    const outputDir = path.join(__dirname, '..', 'docs', 'database');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonPath = path.join(outputDir, 'schema-export.json');
    fs.writeFileSync(jsonPath, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`\n✅ Schema exportado para: ${jsonPath}`);

    // Salvar em Markdown (formato legível)
    const mdPath = path.join(outputDir, 'schema-export.md');
    const mdContent = generateMarkdown(schema);
    fs.writeFileSync(mdPath, mdContent, 'utf8');
    console.log(`✅ Documentação Markdown gerada: ${mdPath}`);

    // Salvar relatório comparativo (se houver comparação)
    if (schema.comparison) {
      const comparisonPath = path.join(outputDir, 'schema-comparison.md');
      const comparisonContent = generateComparisonReport(schema);
      fs.writeFileSync(comparisonPath, comparisonContent, 'utf8');
      console.log(`✅ Relatório comparativo gerado: ${comparisonPath}\n`);
    }

    console.log('📊 Resumo:');
    console.log(`   - ${schema.tables.length} tabelas no banco`);
    console.log(`   - ${schema.rls_policies.length} políticas RLS`);
    console.log(`   - ${schema.triggers.length} triggers`);
    console.log(`   - ${schema.functions.length} funções`);
    console.log(`   - ${schema.constraints.length} constraints`);
    console.log(`   - ${schema.indexes.length} índices`);
    
    if (schema.comparison) {
      console.log(`\n📦 Análise de Migrations:`);
      console.log(`   - ${schema.migrations_analysis.migration_files.length} arquivos de migration analisados`);
      console.log(`   - ${schema.migrations_analysis.tables_in_migrations.length} tabelas encontradas nas migrations`);
      if (schema.comparison.tables.missing_in_database.length > 0) {
        console.log(`   ⚠️  ${schema.comparison.tables.missing_in_database.length} tabelas precisam ser criadas no banco`);
      }
      if (schema.comparison.tables.missing_in_migrations.length > 0) {
        console.log(`   ⚠️  ${schema.comparison.tables.missing_in_migrations.length} tabelas precisam ser documentadas nas migrations`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao exportar schema:', error.message);
    console.error('\n💡 Dica: Verifique se as variáveis de ambiente estão configuradas no .env.local');
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão encerrada.');
  }
}

/**
 * Analisa todas as migrations do Supabase para extrair tabelas, funções, etc.
 */
function analyzeMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const analysis = {
    tables_in_migrations: [],
    functions_in_migrations: [],
    policies_in_migrations: [],
    triggers_in_migrations: [],
    types_in_migrations: [],
    migration_files: []
  };

  if (!fs.existsSync(migrationsDir)) {
    console.log(`   ⚠️  Diretório de migrations não encontrado: ${migrationsDir}`);
    return analysis;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql') && !file.includes('MANUAL') && !file.endsWith('.md'))
    .sort();

  // Regex melhoradas para capturar nomes de tabelas com aspas, espaços, etc.
  // Suporta: CREATE TABLE "Clientes WhatsApp" ou CREATE TABLE clients
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(?:["'])?([\w\s]+?)(?:["'])?(?:\s|\(|;)/gi;
  const createFunctionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(?:["'])?(\w+)(?:["'])?/gi;
  const createPolicyRegex = /CREATE\s+POLICY\s+(?:["'])?(\w+)(?:["'])?/gi;
  const createTriggerRegex = /CREATE\s+TRIGGER\s+(?:["'])?(\w+)(?:["'])?/gi;
  const createTypeRegex = /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(?:["'])?(\w+)(?:["'])?/gi;

  files.forEach(file => {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    analysis.migration_files.push({
      file,
      size: fs.statSync(filePath).size,
      lines: content.split('\n').length
    });

    // Extrair tabelas (reset regex)
    createTableRegex.lastIndex = 0;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      let tableName = match[1].trim().toLowerCase();
      // Limpar espaços extras e caracteres especiais
      tableName = tableName.replace(/\s+/g, ' ').trim();
      // Ignorar tabelas do sistema ou temporárias
      if (tableName && tableName.length > 0 && 
          !tableName.startsWith('pg_') && !tableName.startsWith('_') && 
          !analysis.tables_in_migrations.includes(tableName)) {
        analysis.tables_in_migrations.push(tableName);
      }
    }

    // Extrair funções
    createFunctionRegex.lastIndex = 0;
    while ((match = createFunctionRegex.exec(content)) !== null) {
      const funcName = match[1].toLowerCase();
      if (!analysis.functions_in_migrations.includes(funcName)) {
        analysis.functions_in_migrations.push(funcName);
      }
    }

    // Extrair policies
    createPolicyRegex.lastIndex = 0;
    while ((match = createPolicyRegex.exec(content)) !== null) {
      const policyName = match[1].toLowerCase();
      if (!analysis.policies_in_migrations.includes(policyName)) {
        analysis.policies_in_migrations.push(policyName);
      }
    }

    // Extrair triggers
    createTriggerRegex.lastIndex = 0;
    while ((match = createTriggerRegex.exec(content)) !== null) {
      const triggerName = match[1].toLowerCase();
      if (!analysis.triggers_in_migrations.includes(triggerName)) {
        analysis.triggers_in_migrations.push(triggerName);
      }
    }

    // Extrair types
    createTypeRegex.lastIndex = 0;
    while ((match = createTypeRegex.exec(content)) !== null) {
      const typeName = match[1].toLowerCase();
      if (!analysis.types_in_migrations.includes(typeName)) {
        analysis.types_in_migrations.push(typeName);
      }
    }
  });

  // Ordenar
  analysis.tables_in_migrations.sort();
  analysis.functions_in_migrations.sort();
  analysis.policies_in_migrations.sort();
  analysis.triggers_in_migrations.sort();
  analysis.types_in_migrations.sort();

  return analysis;
}

/**
 * Compara o banco de dados com as migrations
 */
function compareDatabaseWithMigrations(schema, migrationsAnalysis) {
  // Normalizar nomes de tabelas (lowercase, sem espaços extras)
  // Criar mapas para comparação flexível (considera espaços e case)
  const normalizeTableName = (name) => {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  const dbTables = schema.tables.map(t => ({
    original: t.name,
    normalized: normalizeTableName(t.name)
  }));
  
  const migrationTables = migrationsAnalysis.tables_in_migrations.map(t => ({
    original: t,
    normalized: normalizeTableName(t)
  }));

  const dbTableNames = dbTables.map(t => t.normalized);
  const migrationTableNames = migrationTables.map(t => t.normalized);

  const missing_in_database = migrationTables
    .filter(t => !dbTableNames.includes(t.normalized))
    .map(t => t.original);
    
  const missing_in_migrations = dbTables
    .filter(t => !migrationTableNames.includes(t.normalized))
    .map(t => t.original);
    
  const in_both = dbTables
    .filter(t => migrationTableNames.includes(t.normalized))
    .map(t => t.original);

  const dbFunctions = schema.functions.map(f => f.function_name.toLowerCase());
  const migrationFunctions = migrationsAnalysis.functions_in_migrations;
  const missing_functions_in_db = migrationFunctions.filter(f => !dbFunctions.includes(f));
  const missing_functions_in_migrations = dbFunctions.filter(f => !migrationFunctions.includes(f));

  return {
    tables: {
      in_both,
      missing_in_database,
      missing_in_migrations,
      total_in_db: dbTables.length,
      total_in_migrations: migrationTables.length
    },
    functions: {
      missing_in_database: missing_functions_in_db,
      missing_in_migrations: missing_functions_in_migrations,
      total_in_db: dbFunctions.length,
      total_in_migrations: migrationFunctions.length
    },
    migration_files_count: migrationsAnalysis.migration_files.length
  };
}

/**
 * Gera relatório comparativo entre banco e migrations
 */
function generateComparisonReport(schema) {
  if (!schema.comparison || !schema.migrations_analysis) {
    return `# ⚠️ Relatório Comparativo Indisponível\n\nNão foi possível gerar o relatório comparativo.\n`;
  }

  const comparison = schema.comparison;
  const migrations = schema.migrations_analysis;

  let md = `# 🔍 Relatório Comparativo: Banco de Dados vs Migrations\n\n`;
  md += `**Gerado em:** ${new Date(schema.exported_at).toLocaleString('pt-BR')}\n\n`;
  md += `---\n\n`;

  // Resumo
  md += `## 📊 Resumo\n\n`;
  md += `| Métrica | Banco de Dados | Migrations | Status |\n`;
  md += `|---------|----------------|------------|--------|\n`;
  md += `| **Tabelas** | ${comparison.tables.total_in_db} | ${comparison.tables.total_in_migrations} | `;
  if (comparison.tables.missing_in_database.length === 0 && comparison.tables.missing_in_migrations.length === 0) {
    md += `✅ Sincronizado |\n`;
  } else {
    md += `⚠️ Desincronizado |\n`;
  }
  md += `| **Funções** | ${comparison.functions.total_in_db} | ${comparison.functions.total_in_migrations} | `;
  if (comparison.functions.missing_in_database.length === 0 && comparison.functions.missing_in_migrations.length === 0) {
    md += `✅ Sincronizado |\n`;
  } else {
    md += `⚠️ Desincronizado |\n`;
  }
  md += `| **Arquivos de Migration** | - | ${comparison.migration_files_count} | - |\n\n`;

  // Tabelas faltando no banco
  if (comparison.tables.missing_in_database.length > 0) {
    md += `## ⚠️ Tabelas nas Migrations mas NÃO no Banco\n\n`;
    md += `**Total:** ${comparison.tables.missing_in_database.length}\n\n`;
    md += `Estas tabelas estão definidas nas migrations mas não existem no banco:\n\n`;
    comparison.tables.missing_in_database.forEach(table => {
      md += `- \`${table}\` - ⚠️ **PRECISA SER CRIADA**\n`;
    });
    md += `\n**Ação:** Execute as migrations pendentes ou crie manualmente.\n\n`;
  }

  // Tabelas faltando nas migrations
  if (comparison.tables.missing_in_migrations.length > 0) {
    md += `## ⚠️ Tabelas no Banco mas NÃO nas Migrations\n\n`;
    md += `**Total:** ${comparison.tables.missing_in_migrations.length}\n\n`;
    md += `Estas tabelas existem no banco mas não estão documentadas nas migrations:\n\n`;
    comparison.tables.missing_in_migrations.forEach(table => {
      md += `- \`${table}\` - ⚠️ **PRECISA SER DOCUMENTADA**\n`;
    });
    md += `\n**Ação:** Crie uma migration para documentar ou remova se não for necessária.\n\n`;
  }

  // Tabelas sincronizadas
  if (comparison.tables.in_both.length > 0) {
    md += `## ✅ Tabelas Sincronizadas\n\n`;
    md += `**Total:** ${comparison.tables.in_both.length}\n\n`;
    md += `Estas tabelas existem tanto no banco quanto nas migrations:\n\n`;
    comparison.tables.in_both.forEach(table => {
      md += `- \`${table}\` ✅\n`;
    });
    md += `\n`;
  }

  // Funções faltando
  if (comparison.functions.missing_in_database.length > 0) {
    md += `## ⚠️ Funções nas Migrations mas NÃO no Banco\n\n`;
    comparison.functions.missing_in_database.forEach(func => {
      md += `- \`${func}\` - ⚠️ **PRECISA SER CRIADA**\n`;
    });
    md += `\n`;
  }

  if (comparison.functions.missing_in_migrations.length > 0) {
    md += `## ⚠️ Funções no Banco mas NÃO nas Migrations\n\n`;
    comparison.functions.missing_in_migrations.forEach(func => {
      md += `- \`${func}\` - ⚠️ **PRECISA SER DOCUMENTADA**\n`;
    });
    md += `\n`;
  }

  // Lista de migrations
  md += `## 📁 Arquivos de Migration Analisados\n\n`;
  md += `**Total:** ${migrations.migration_files.length} arquivos\n\n`;
  md += `| Arquivo | Tamanho | Linhas |\n`;
  md += `|---------|---------|--------|\n`;
  migrations.migration_files.forEach(file => {
    md += `| \`${file.file}\` | ${(file.size / 1024).toFixed(1)} KB | ${file.lines} |\n`;
  });

  md += `\n---\n\n`;
  md += `**Última atualização:** ${new Date().toLocaleString('pt-BR')}\n`;

  return md;
}

function generateMarkdown(schema) {
  let md = `# 📊 Schema do Banco de Dados - Exportação Completa\n\n`;
  md += `**Exportado em:** ${new Date(schema.exported_at).toLocaleString('pt-BR')}\n\n`;
  md += `**Database:** ${schema.database_info.database_name}\n`;
  md += `**PostgreSQL:** ${schema.database_info.postgres_version?.split(',')[0]}\n`;
  md += `**Usuário:** ${schema.database_info.current_user}\n\n`;
  md += `---\n\n`;

  // Tabelas
  md += `## 📋 Tabelas (${schema.tables.length})\n\n`;
  schema.tables.forEach(table => {
    md += `### \`${table.name}\`\n\n`;
    md += `**Schema:** \`${table.schema}\`\n\n`;
    md += `| Coluna | Tipo | Nullable | Default | PK |\n`;
    md += `|--------|------|----------|---------|----|\n`;
    table.columns.forEach(col => {
      md += `| \`${col.name}\` | \`${col.type}\` | ${col.nullable ? '✅' : '❌'} | ${col.default || '-'} | ${col.is_primary_key ? '🔑' : ''} |\n`;
    });
    md += `\n`;
  });

  // RLS Policies
  md += `## 🔒 Políticas RLS (${schema.rls_policies.length})\n\n`;
  const policiesByTable = {};
  schema.rls_policies.forEach(policy => {
    const key = `${policy.table_schema}.${policy.table_name}`;
    if (!policiesByTable[key]) {
      policiesByTable[key] = [];
    }
    policiesByTable[key].push(policy);
  });

  Object.entries(policiesByTable).forEach(([key, policies]) => {
    const [schema, table] = key.split('.');
    md += `### \`${table}\`\n\n`;
    policies.forEach(policy => {
      md += `- **${policy.policy_name}** (${policy.for_command})\n`;
      if (policy.using_expression) {
        md += `  - Using: \`${policy.using_expression}\`\n`;
      }
      if (policy.with_check_expression) {
        md += `  - With Check: \`${policy.with_check_expression}\`\n`;
      }
      md += `\n`;
    });
  });

  // Triggers
  if (schema.triggers.length > 0) {
    md += `## ⚡ Triggers (${schema.triggers.length})\n\n`;
    schema.triggers.forEach(trigger => {
      md += `### \`${trigger.table_name}.${trigger.trigger_name}\`\n\n`;
      md += `\`\`\`sql\n${trigger.trigger_definition}\n\`\`\`\n\n`;
    });
  }

  // Functions
  if (schema.functions.length > 0) {
    md += `## 🔧 Funções (${schema.functions.length})\n\n`;
    schema.functions.forEach(func => {
      md += `### \`${func.function_name}\`\n\n`;
      md += `**Argumentos:** \`${func.arguments}\`\n`;
      md += `**Retorno:** \`${func.return_type}\`\n\n`;
      md += `\`\`\`sql\n${func.definition}\n\`\`\`\n\n`;
    });
  }

  // Constraints
  if (schema.constraints.length > 0) {
    md += `## 🔗 Constraints (${schema.constraints.length})\n\n`;
    const constraintsByTable = {};
    schema.constraints.forEach(constraint => {
      const key = constraint.table_name;
      if (!constraintsByTable[key]) {
        constraintsByTable[key] = [];
      }
      constraintsByTable[key].push(constraint);
    });

    Object.entries(constraintsByTable).forEach(([table, constraints]) => {
      md += `### \`${table}\`\n\n`;
      constraints.forEach(constraint => {
        md += `- **${constraint.constraint_name}** (${constraint.constraint_type})\n`;
        md += `  - Coluna: \`${constraint.column_name}\`\n`;
        if (constraint.foreign_table_name) {
          md += `  - Referencia: \`${constraint.foreign_table_name}.${constraint.foreign_column_name}\`\n`;
        }
        md += `\n`;
      });
    });
  }

  // Indexes
  if (schema.indexes.length > 0) {
    md += `## 📇 Índices (${schema.indexes.length})\n\n`;
    const indexesByTable = {};
    schema.indexes.forEach(index => {
      const key = index.table_name;
      if (!indexesByTable[key]) {
        indexesByTable[key] = [];
      }
      indexesByTable[key].push(index);
    });

    Object.entries(indexesByTable).forEach(([table, indexes]) => {
      md += `### \`${table}\`\n\n`;
      indexes.forEach(index => {
        md += `- **${index.index_name}**\n`;
        md += `  \`\`\`sql\n  ${index.index_definition}\n  \`\`\`\n\n`;
      });
    });
  }

  return md;
}

// Executar
if (require.main === module) {
  exportSchema().catch(console.error);
}

module.exports = { exportSchema };

