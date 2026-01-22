/**
 * 🧪 Test Endpoint: Flow Execution
 *
 * Testa o FlowExecutor sem precisar do webhook real
 *
 * POST /api/test/flow-execution
 *   - action: 'start' - Inicia um flow para um contato
 *     Body: { action: 'start', flowId, phone, clientId }
 *   - action: 'continue' - Continua execução de um flow
 *     Body: { action: 'continue', phone, clientId, userResponse, interactiveResponseId }
 *
 * GET /api/test/flow-execution/status?phone=XXX&clientId=YYY
 *   - Ver status atual da execução
 *
 * NOTE: Transfer to bot/human is tested via flow blocks (ai_handoff, human_handoff)
 */

import { NextRequest, NextResponse } from 'next/server';
import { FlowExecutor } from '@/lib/flows/flowExecutor';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/test/flow-execution/start
 * Inicia um flow para um contato
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { flowId, phone, clientId, action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action is required (start | continue)' },
        { status: 400 }
      );
    }

    const executor = new FlowExecutor();

    if (action === 'start') {
      // INICIAR FLOW
      if (!flowId || !phone || !clientId) {
        return NextResponse.json(
          { error: 'flowId, phone, and clientId are required' },
          { status: 400 }
        );
      }

      console.log(`🚀 [TEST] Iniciando flow ${flowId} para ${phone}`);

      const execution = await executor.startFlow(flowId, clientId, phone);

      return NextResponse.json({
        success: true,
        message: 'Flow iniciado com sucesso',
        data: {
          executionId: execution.id,
          flowId: execution.flowId,
          phone: execution.phone,
          currentBlockId: execution.currentBlockId,
          status: execution.status,
          variables: execution.variables
        },
        instructions: {
          next: 'Envie uma mensagem via WhatsApp ou use /api/test/flow-execution com action=continue',
          checkStatus: `GET /api/test/flow-execution/status?phone=${phone}&clientId=${clientId}`
        }
      });
    }

    if (action === 'continue') {
      // CONTINUAR FLOW
      const { userResponse, interactiveResponseId } = body;

      if (!phone || !clientId) {
        return NextResponse.json(
          { error: 'phone and clientId are required' },
          { status: 400 }
        );
      }

      console.log(`▶️ [TEST] Continuando flow para ${phone}`);
      console.log(`   User response: "${userResponse}"`);
      console.log(`   Interactive ID: ${interactiveResponseId || 'N/A'}`);

      await executor.continueFlow(
        clientId,
        phone,
        userResponse || '',
        interactiveResponseId
      );

      return NextResponse.json({
        success: true,
        message: 'Flow continuado com sucesso',
        instructions: {
          checkStatus: `GET /api/test/flow-execution/status?phone=${phone}&clientId=${clientId}`
        }
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Valid: start, continue` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('❌ [TEST] Error in flow-execution:', error);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test/flow-execution/status?phone=XXX&clientId=YYY
 * Ver status atual da execução e do contato
 */
export async function GET(req: NextRequest) {
  try {
    const phone = req.nextUrl.searchParams.get('phone');
    const clientId = req.nextUrl.searchParams.get('clientId');

    if (!phone || !clientId) {
      return NextResponse.json(
        { error: 'phone and clientId query params are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // 1. Buscar execução ativa
    const { data: execution, error: execError } = await supabase
      .from('flow_executions')
      .select('*, interactive_flows(name)')
      .eq('client_id', clientId)
      .eq('phone', phone)
      .eq('status', 'active')
      .maybeSingle();

    // 2. Buscar status do contato
    const supabaseAny = supabase as any;
    const { data: customer, error: custError } = await supabaseAny
      .from('clientes_whatsapp')
      .select('telefone, nome, status, created_at')
      .eq('telefone', phone)
      .eq('client_id', clientId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        customer: customer ? {
          phone: customer.telefone,
          name: customer.nome,
          status: customer.status,
          createdAt: customer.created_at
        } : null,
        execution: execution ? {
          id: execution.id,
          flowId: execution.flow_id,
          flowName: execution.interactive_flows?.name,
          currentBlockId: execution.current_block_id,
          status: execution.status,
          variables: execution.variables,
          history: execution.history,
          startedAt: execution.started_at,
          lastStepAt: execution.last_step_at
        } : null,
        hasActiveFlow: !!execution,
        contactStatus: customer?.status || 'not_found'
      }
    });

  } catch (error: any) {
    console.error('❌ [TEST] Error getting flow status:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
