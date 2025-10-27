import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { query } from '@/lib/postgres'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/check-table-schema
 * Verifica o schema da tabela "Clientes WhatsApp"
 * e testa se o UPSERT vai funcionar
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[check-table-schema] 🔍 Verificando schema da tabela...')

    // 1. Verificar estrutura da tabela via pg direto
    const schemaResult = await query<any>(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Clientes WhatsApp'
      ORDER BY ordinal_position
    `)

    console.log(`[check-table-schema] ✅ Colunas encontradas: ${schemaResult.rows.length}`)

    // 2. Verificar constraints (especialmente UNIQUE em telefone)
    const constraintsResult = await query<any>(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'Clientes WhatsApp'
    `)

    console.log(`[check-table-schema] ✅ Constraints encontradas: ${constraintsResult.rows.length}`)

    // 3. Verificar RLS (Row Level Security)
    const rlsResult = await query<any>(`
      SELECT
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables
      WHERE tablename = 'Clientes WhatsApp'
    `)

    // 4. Verificar se Supabase consegue acessar
    const supabase = createServerClient()
    const { data: testData, error: testError } = await supabase
      .from('Clientes WhatsApp')
      .select('telefone, nome, status')
      .limit(5)

    console.log('[check-table-schema] ✅ Teste de SELECT via Supabase:', testError ? 'FALHOU' : 'OK')

    // 5. Contar registros
    const countResult = await query<any>(`
      SELECT COUNT(*) as total FROM "Clientes WhatsApp"
    `)

    return NextResponse.json({
      success: true,
      schema: {
        columns: schemaResult.rows,
        constraints: constraintsResult.rows,
        rls: rlsResult.rows[0],
        totalRecords: countResult.rows[0]?.total || 0,
      },
      supabaseTest: {
        success: !testError,
        error: testError?.message,
        recordCount: testData?.length || 0,
      },
      analysis: {
        hasUniqueConstraint: constraintsResult.rows.some(
          (c: any) => c.constraint_type === 'UNIQUE' && c.column_name === 'telefone'
        ),
        hasRLS: rlsResult.rows[0]?.rowsecurity === true,
        canUseSupabase: !testError,
      },
    })
  } catch (error: any) {
    console.error('[check-table-schema] ❌ Erro:', error)
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
      },
      { status: 500 }
    )
  }
}
