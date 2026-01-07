/**
 * Endpoint administrativo para atualizar clientes em status 'trial' para 'active'
 *
 * GET /api/admin/fix-trial-clients - Ver clientes em trial
 * POST /api/admin/fix-trial-clients - Atualizar para active
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET - Listar clientes em status 'trial'
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Buscar clientes em trial
    const { data: trialClients, error } = await (supabase as any)
      .from('clients')
      .select('id, name, slug, status, created_at, plan')
      .eq('status', 'trial')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar clientes trial:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: trialClients?.length || 0,
      clients: trialClients || [],
      message:
        trialClients && trialClients.length > 0
          ? `Encontrados ${trialClients.length} cliente(s) em status 'trial'`
          : 'Nenhum cliente em status trial',
    });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * POST - Atualizar clientes de 'trial' para 'active'
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Verificar se é para atualizar um cliente específico ou todos
    const body = await request.json().catch(() => ({}));
    const { clientId } = body;

    if (clientId) {
      // Atualizar cliente específico
      const { data: updatedClient, error } = await (supabase as any)
        .from('clients')
        .update({ status: 'active' })
        .eq('id', clientId)
        .eq('status', 'trial') // Só atualiza se estiver em trial
        .select('id, name, slug, status')
        .single();

      if (error) {
        console.error('Erro ao atualizar cliente:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!updatedClient) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Cliente não encontrado ou já está ativo',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ok: true,
        message: 'Cliente atualizado com sucesso',
        client: updatedClient,
      });
    } else {
      // Atualizar TODOS os clientes em trial
      const { data: updatedClients, error } = await (supabase as any)
        .from('clients')
        .update({ status: 'active' })
        .eq('status', 'trial')
        .select('id, name, slug, status');

      if (error) {
        console.error('Erro ao atualizar clientes:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        message: `${updatedClients?.length || 0} cliente(s) atualizado(s) de 'trial' para 'active'`,
        count: updatedClients?.length || 0,
        clients: updatedClients || [],
      });
    }
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
