/**
 * 🔍 NODE 15: Check Interactive Flow
 *
 * Phase 4: Integration with Webhook + Status Routing
 *
 * Verifies if there's an active interactive flow or if a new flow should be started.
 * This node executes BEFORE the AI agent processing.
 *
 * Logic:
 * 1. Check if there's an active execution for this contact
 *    - If YES: continue the flow (via FlowExecutor)
 * 2. If NO, check if there's a trigger match (keyword, always, first contact)
 *    - If YES: start new flow
 * 3. If NEITHER: return shouldContinueToAI = true
 */

import { FlowExecutor } from "@/lib/flows/flowExecutor";
import { createServerClient } from "@/lib/supabase-server";

export interface CheckInteractiveFlowInput {
  clientId: string;
  phone: string;
  content: string;
  isInteractiveReply: boolean;
  interactiveResponseId?: string;
  isFirstContact?: boolean;
}

export interface CheckInteractiveFlowOutput {
  shouldContinueToAI: boolean;
  flowExecuted: boolean;
  flowStarted: boolean;
  flowName?: string;
}

/**
 * Check if interactive flow should be executed
 *
 * @param input - Input parameters
 * @returns Output indicating whether to continue to AI or flow was executed
 */
export const checkInteractiveFlow = async (
  input: CheckInteractiveFlowInput,
): Promise<CheckInteractiveFlowOutput> => {
  const {
    clientId,
    phone,
    content,
    isInteractiveReply,
    interactiveResponseId,
    isFirstContact,
  } = input;

  console.log(`🔍 [NODE 15] Checking interactive flow for ${phone}`);
  console.log(`🔍 [NODE 15] Client ID: ${clientId}`);

  const supabase = createServerClient();
  const executor = new FlowExecutor();

  try {
    // 1. Check for active execution
    const { data: activeExecution, error: executionError } = await supabase
      .from("flow_executions")
      .select("*, interactive_flows(name)")
      .eq("client_id", clientId)
      .eq("phone", phone)
      .eq("status", "active")
      .maybeSingle();

    console.log(
      `🔍 [NODE 15] Active execution query result:`,
      JSON.stringify({ data: activeExecution, error: executionError }),
    );

    if (executionError) {
      console.error(
        `❌ [NODE 15] Error checking active execution: ${executionError.message}`,
      );
      // Continue to AI on error (fail-safe)
      return {
        shouldContinueToAI: true,
        flowExecuted: false,
        flowStarted: false,
      };
    }

    if (activeExecution) {
      console.log(
        `▶️ [NODE 15] Continuing active flow: ${activeExecution.interactive_flows.name}`,
      );

      // Continue existing flow
      await executor.continueFlow(
        clientId,
        phone,
        content,
        interactiveResponseId,
      );

      return {
        shouldContinueToAI: false,
        flowExecuted: true,
        flowStarted: false,
        flowName: activeExecution.interactive_flows.name,
      };
    }

    // 2. Check if a new flow should be started

    // 2a. Check for flows with trigger "always" (always active)
    const { data: alwaysFlows, error: alwaysError } = await supabase
      .from("interactive_flows")
      .select("id, name")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .eq("trigger_type", "always")
      .limit(1);

    console.log(
      `🔍 [NODE 15] Always flows query result:`,
      JSON.stringify({ data: alwaysFlows, error: alwaysError }),
    );

    if (alwaysError) {
      console.error(
        `❌ [NODE 15] Error checking always flows: ${alwaysError.message}`,
      );
    } else if (alwaysFlows && alwaysFlows.length > 0) {
      const flow = alwaysFlows[0];
      console.log(`🚀 [NODE 15] Starting "always" flow: ${flow.name}`);

      await executor.startFlow(flow.id, clientId, phone);

      return {
        shouldContinueToAI: false,
        flowExecuted: true,
        flowStarted: true,
        flowName: flow.name,
      };
    }

    // 2b. Check for flows with trigger "keyword"
    if (content && content.trim().length > 0) {
      const contentLower = content.toLowerCase().trim();

      const { data: keywordFlows, error: keywordError } = await supabase
        .from("interactive_flows")
        .select("id, name, trigger_keywords")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .eq("trigger_type", "keyword");

      if (keywordError) {
        console.error(
          `❌ [NODE 15] Error checking keyword flows: ${keywordError.message}`,
        );
      } else if (keywordFlows) {
        for (const flow of keywordFlows) {
          const keywords = flow.trigger_keywords || [];
          const hasMatch = keywords.some((keyword: string) =>
            contentLower.includes(keyword.toLowerCase())
          );

          if (hasMatch) {
            console.log(`🚀 [NODE 15] Starting flow by keyword: ${flow.name}`);

            await executor.startFlow(flow.id, clientId, phone);

            return {
              shouldContinueToAI: false,
              flowExecuted: true,
              flowStarted: true,
              flowName: flow.name,
            };
          }
        }
      }
    }

    // 3. No flow matched by trigger
    // If we got here, check if there's ANY active flow for this client
    // This is used when status is manually set to 'fluxo_inicial'
    console.log(
      `🔍 [NODE 15] No trigger matched, checking for any active flow`,
    );
    console.log(`🔍 [NODE 15] Querying with client_id: ${clientId}`);

    const { data: anyActiveFlow, error: anyFlowError } = await supabase
      .from("interactive_flows")
      .select("id, name, trigger_type, is_active")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .limit(1);

    console.log(
      `🔍 [NODE 15] Any active flow query result:`,
      JSON.stringify({ data: anyActiveFlow, error: anyFlowError }),
    );

    if (anyFlowError) {
      console.error(
        `❌ [NODE 15] Error checking any active flows: ${anyFlowError.message}`,
      );
    } else if (anyActiveFlow && anyActiveFlow.length > 0) {
      const flow = anyActiveFlow[0];
      console.log(`🚀 [NODE 15] Starting default active flow: ${flow.name}`);

      await executor.startFlow(flow.id, clientId, phone);

      return {
        shouldContinueToAI: false,
        flowExecuted: true,
        flowStarted: true,
        flowName: flow.name,
      };
    }

    // 4. No flow available at all
    console.log(`➡️ [NODE 15] No flow matched, continuing to AI`);
    console.log(
      `➡️ [NODE 15] Summary: clientId=${clientId}, phone=${phone}, content="${content}"`,
    );
    console.log(
      `➡️ [NODE 15] No active flows found for this client. Check if there are flows in interactive_flows table with is_active=true and client_id=${clientId}`,
    );

    return {
      shouldContinueToAI: true,
      flowExecuted: false,
      flowStarted: false,
    };
  } catch (error) {
    console.error("❌ [NODE 15] Error in checkInteractiveFlow:", error);

    // On error, continue to AI (fail-safe)
    return {
      shouldContinueToAI: true,
      flowExecuted: false,
      flowStarted: false,
    };
  }
};
