/**
 * 🔄 Flow Executor
 *
 * Phase 3: Executor + Status Control
 *
 * Executes interactive flows by:
 * 1. Starting flows and managing execution state
 * 2. Executing blocks (messages, lists, buttons, conditions, etc.)
 * 3. Controlling status transitions (bot → fluxo_inicial → bot/humano)
 * 4. Handling user responses and determining next blocks
 */

import { createServiceRoleClient } from "@/lib/supabase";
import {
  Condition,
  FlowBlock,
  FlowBlockType,
  FlowExecution,
  FlowExecutionDB,
  FlowExecutionStatus,
  FlowStep,
  InteractiveFlow,
  InteractiveFlowDB,
} from "@/types/interactiveFlows";
import {
  ListSection as InteractiveListSection,
  ReplyButton as InteractiveReplyButton,
  sendInteractiveButtons,
  sendInteractiveList,
} from "@/lib/whatsapp/interactiveMessages";

export class FlowExecutor {
  private supabase = createServiceRoleClient() as any;

  /**
   * 🚀 Start a new flow execution
   *
   * @param flowId - ID of the flow to start
   * @param clientId - Client ID
   * @param phone - Contact phone number
   * @returns Created execution
   */
  async startFlow(
    flowId: string,
    clientId: string,
    phone: string,
  ): Promise<FlowExecution> {
    try {
      console.log(`🚀 [FlowExecutor] Starting flow ${flowId} for ${phone}`);

      // 1. Fetch flow
      const { data: flowDB, error: flowError } = await this.supabase
        .from("interactive_flows")
        .select("*")
        .eq("id", flowId)
        .eq("client_id", clientId)
        .eq("is_active", true)
        .single();

      if (flowError || !flowDB) {
        throw new Error(`Flow not found or inactive: ${flowId}`);
      }

      const flow = this.dbToFlow(flowDB);

      // 2. Check for existing active execution
      const { data: existingExecution } = await this.supabase
        .from("flow_executions")
        .select("id")
        .eq("client_id", clientId)
        .eq("phone", phone)
        .eq("status", "active")
        .maybeSingle();

      if (existingExecution) {
        throw new Error(
          `Contact ${phone} already has an active flow execution: ${existingExecution.id}`,
        );
      }

      // 3. Create execution
      const { data: executionDB, error: executionError } = await this.supabase
        .from("flow_executions")
        .insert({
          flow_id: flowId,
          client_id: clientId,
          phone,
          current_block_id: flow.startBlockId,
          variables: {},
          history: [],
          status: "active",
        })
        .select()
        .single();

      if (executionError || !executionDB) {
        throw new Error(
          `Failed to create execution: ${executionError?.message}`,
        );
      }

      console.log(`✅ [FlowExecutor] Execution created: ${executionDB.id}`);

      // 4. ⭐ CHANGE STATUS TO 'fluxo_inicial'
      const { error: statusError } = await this.supabase
        .from("clientes_whatsapp")
        .update({ status: "fluxo_inicial" })
        .eq("telefone", phone)
        .eq("client_id", clientId);

      if (statusError) {
        console.error(
          `❌ [FlowExecutor] Failed to update status to fluxo_inicial: ${statusError.message}`,
        );
        // Continue anyway - status update is not critical for execution
      } else {
        console.log(
          `✅ [FlowExecutor] Status changed: bot → fluxo_inicial (${phone})`,
        );
      }

      // 5. Execute first block
      await this.executeBlock(executionDB.id, flow.startBlockId, flow);

      return this.dbToExecution(executionDB);
    } catch (error) {
      console.error("❌ [FlowExecutor] Error starting flow:", error);
      throw error;
    }
  }

  /**
   * ▶️ Continue an active flow execution
   *
   * @param clientId - Client ID
   * @param phone - Contact phone number
   * @param userResponse - User's text response
   * @param interactiveResponseId - ID from interactive response (button/list)
   */
  async continueFlow(
    clientId: string,
    phone: string,
    userResponse: string,
    interactiveResponseId?: string,
  ): Promise<void> {
    try {
      console.log(
        `▶️ [FlowExecutor] Continuing flow for ${phone}, response: ${
          userResponse || interactiveResponseId
        }`,
      );

      // 1. Get active execution with flow data
      const { data: executionDB, error: executionError } = await this.supabase
        .from("flow_executions")
        .select("*, interactive_flows(*)")
        .eq("client_id", clientId)
        .eq("phone", phone)
        .eq("status", "active")
        .maybeSingle();

      if (executionError || !executionDB) {
        console.error(
          `❌ [FlowExecutor] No active execution found for ${phone}`,
        );
        return;
      }

      const execution = this.dbToExecution(executionDB);
      const flowDB = (executionDB as any)
        .interactive_flows as InteractiveFlowDB;
      const flow = this.dbToFlow(flowDB);

      // 2. Find current block
      const currentBlock = flow.blocks.find((b) =>
        b.id === execution.currentBlockId
      );

      if (!currentBlock) {
        throw new Error(`Current block not found: ${execution.currentBlockId}`);
      }

      // 3. Determine next block based on response
      const nextBlockId = this.determineNextBlock(
        currentBlock,
        userResponse,
        interactiveResponseId,
        execution.variables,
        flow,
      );

      if (!nextBlockId) {
        // No next block - complete flow
        console.log(`✅ [FlowExecutor] Flow completed (no next block)`);
        await this.completeFlow(execution.id);
        return;
      }

      // 4. Update execution history and variables
      const newHistory: FlowStep[] = [
        ...execution.history,
        {
          blockId: currentBlock.id,
          blockType: currentBlock.type,
          executedAt: new Date(),
          userResponse,
          interactiveResponseId,
          nextBlockId,
        },
      ];

      const newVariables = { ...execution.variables };
      if (interactiveResponseId) {
        newVariables.last_interactive_response = interactiveResponseId;
      }
      if (userResponse) {
        newVariables.last_user_response = userResponse;
      }

      // 5. Update execution in database
      const { error: updateError } = await this.supabase
        .from("flow_executions")
        .update({
          current_block_id: nextBlockId,
          variables: newVariables,
          history: newHistory,
          last_step_at: new Date().toISOString(),
        })
        .eq("id", execution.id);

      if (updateError) {
        throw new Error(`Failed to update execution: ${updateError.message}`);
      }

      // 6. Execute next block
      await this.executeBlock(execution.id, nextBlockId, flow);
    } catch (error) {
      console.error("❌ [FlowExecutor] Error continuing flow:", error);
      throw error;
    }
  }

  /**
   * 🔄 Execute a specific block
   *
   * @private
   */
  private async executeBlock(
    executionId: string,
    blockId: string,
    flow: InteractiveFlow,
  ): Promise<void> {
    const block = flow.blocks.find((b) => b.id === blockId);

    if (!block) {
      throw new Error(`Block not found: ${blockId}`);
    }

    // Get execution data (phone, variables)
    const { data: execution, error } = await this.supabase
      .from("flow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (error || !execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    console.log(
      `🔄 [FlowExecutor] Executing block ${block.id} (${block.type})`,
    );

    switch (block.type) {
      case "start":
        // Start block doesn't do anything, just advance
        await this.advanceToNextBlock(executionId, blockId, flow);
        break;

      case "message":
        await this.executeMessageBlock(execution.phone, block);
        // Wait for user response
        break;

      case "interactive_list":
        await this.executeInteractiveListBlock(
          execution.phone,
          execution.client_id,
          block,
        );
        // Keep execution pointing to this interactive block while waiting for reply
        await this.setCurrentBlock(executionId, block.id);
        // Wait for user response
        break;

      case "interactive_buttons":
        await this.executeInteractiveButtonsBlock(
          execution.phone,
          execution.client_id,
          block,
        );
        // Keep execution pointing to this interactive block while waiting for reply
        await this.setCurrentBlock(executionId, block.id);
        // Wait for user response
        break;

      case "condition":
        await this.executeConditionBlock(
          executionId,
          block,
          execution.variables,
          flow,
        );
        break;

      case "action":
        await this.executeActionBlock(executionId, block, execution.variables);
        await this.advanceToNextBlock(executionId, blockId, flow);
        break;

      case "delay":
        await this.executeDelayBlock(executionId, block, flow);
        break;

      case "webhook":
        await this.executeWebhookBlock(block, execution.variables);
        await this.advanceToNextBlock(executionId, blockId, flow);
        break;

      case "ai_handoff":
        await this.transferToBot(
          executionId,
          execution.phone,
          execution.client_id,
        );
        break;

      case "human_handoff":
        await this.transferToHuman(
          executionId,
          execution.phone,
          execution.client_id,
        );
        break;

      case "end":
        await this.completeFlow(executionId);
        break;

      default:
        console.warn(`⚠️ [FlowExecutor] Unknown block type: ${block.type}`);
        break;
    }
  }

  /**
   * 💬 Execute message block - send text message
   *
   * @private
   */
  private async executeMessageBlock(
    phone: string,
    block: FlowBlock,
  ): Promise<void> {
    const { messageText } = block.data;

    if (!messageText) {
      throw new Error("Message block has no messageText");
    }

    console.log(
      `💬 [FlowExecutor] Sending message to ${phone}: ${messageText}`,
    );

    // TODO: Integrate with WhatsApp send message function
    // For now, just log
    // await sendWhatsAppMessage(phone, messageText)
  }

  /**
   * 📋 Execute interactive list block
   *
   * @private
   */
  private async executeInteractiveListBlock(
    phone: string,
    clientId: string,
    block: FlowBlock,
  ): Promise<void> {
    const { listHeader, listBody, listFooter, listButtonText, listSections } =
      block.data;

    if (
      !listBody || !listButtonText || !listSections || listSections.length === 0
    ) {
      throw new Error("Invalid list block configuration");
    }

    console.log(`📋 [FlowExecutor] Sending interactive list to ${phone}`);

    // Convert to library format
    const sections: InteractiveListSection[] = listSections.map((section) => ({
      title: section.title,
      rows: section.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
      })),
    }));

    await sendInteractiveList(phone, {
      header: listHeader,
      body: listBody,
      footer: listFooter,
      buttonText: listButtonText,
      sections,
    });

    // Save message to database with interactive metadata
    await this.saveInteractiveMessage(phone, clientId, {
      type: "list",
      header: listHeader,
      body: listBody,
      footer: listFooter,
      buttonText: listButtonText,
      sections: listSections,
    });

    console.log(`✅ [FlowExecutor] Interactive list sent to ${phone}`);
  }

  /**
   * 🔘 Execute interactive buttons block
   *
   * @private
   */
  private async executeInteractiveButtonsBlock(
    phone: string,
    clientId: string,
    block: FlowBlock,
  ): Promise<void> {
    const { buttonsBody, buttons, buttonsFooter } = block.data;

    if (!buttonsBody || !buttons || buttons.length === 0) {
      throw new Error("Invalid buttons block configuration");
    }

    if (buttons.length > 3) {
      throw new Error("Maximum 3 buttons allowed");
    }

    console.log(`🔘 [FlowExecutor] Sending interactive buttons to ${phone}`);

    // Convert to library format
    const buttonsList: InteractiveReplyButton[] = buttons.map((btn) => ({
      id: btn.id,
      title: btn.title,
    }));

    await sendInteractiveButtons(phone, {
      body: buttonsBody,
      footer: buttonsFooter,
      buttons: buttonsList,
    });

    // Save message to database with interactive metadata
    await this.saveInteractiveMessage(phone, clientId, {
      type: "button",
      body: buttonsBody,
      footer: buttonsFooter,
      buttons: buttonsList,
    });

    console.log(`✅ [FlowExecutor] Interactive buttons sent to ${phone}`);
  }

  /**
   * 🔀 Execute condition block - evaluate conditions and branch
   *
   * @private
   */
  private async executeConditionBlock(
    executionId: string,
    block: FlowBlock,
    variables: Record<string, any>,
    flow: InteractiveFlow,
  ): Promise<void> {
    const nextBlockId = this.evaluateConditions(block, variables);

    if (nextBlockId) {
      await this.executeBlock(executionId, nextBlockId, flow);
    } else {
      // No condition matched and no default - end flow
      console.log(`⚠️ [FlowExecutor] No condition matched, ending flow`);
      await this.completeFlow(executionId);
    }
  }

  /**
   * ⚡ Execute action block - set variables, add tags, etc.
   *
   * @private
   */
  private async executeActionBlock(
    executionId: string,
    block: FlowBlock,
    variables: Record<string, any>,
  ): Promise<void> {
    const { actionType, actionParams } = block.data;

    if (!actionType) {
      console.warn(`⚠️ [FlowExecutor] Action block has no actionType`);
      return;
    }

    const newVariables = { ...variables };

    switch (actionType) {
      case "set_variable":
        if (actionParams?.name && actionParams?.value !== undefined) {
          newVariables[actionParams.name] = actionParams.value;
          console.log(
            `⚡ [FlowExecutor] Set variable: ${actionParams.name} = ${actionParams.value}`,
          );
        }
        break;

      case "increment":
        if (actionParams?.name) {
          newVariables[actionParams.name] =
            (newVariables[actionParams.name] || 0) + 1;
          console.log(
            `⚡ [FlowExecutor] Incremented variable: ${actionParams.name} = ${
              newVariables[actionParams.name]
            }`,
          );
        }
        break;

      case "add_tag":
        // TODO: Implement tag management
        console.log(`⚡ [FlowExecutor] Add tag: ${actionParams?.tag}`);
        break;

      case "remove_tag":
        // TODO: Implement tag management
        console.log(`⚡ [FlowExecutor] Remove tag: ${actionParams?.tag}`);
        break;

      default:
        console.warn(`⚠️ [FlowExecutor] Unknown action type: ${actionType}`);
        break;
    }

    // Update variables in database
    const { error } = await this.supabase
      .from("flow_executions")
      .update({ variables: newVariables })
      .eq("id", executionId);

    if (error) {
      console.error(
        `❌ [FlowExecutor] Failed to update variables: ${error.message}`,
      );
    }
  }

  /**
   * ⏳ Execute delay block
   *
   * @private
   */
  private async executeDelayBlock(
    executionId: string,
    block: FlowBlock,
    flow: InteractiveFlow,
  ): Promise<void> {
    const { delaySeconds } = block.data;

    if (!delaySeconds || delaySeconds <= 0) {
      console.warn(`⚠️ [FlowExecutor] Invalid delay: ${delaySeconds}`);
      await this.advanceToNextBlock(executionId, block.id, flow);
      return;
    }

    console.log(`⏳ [FlowExecutor] Delay: ${delaySeconds}s`);

    // TODO: Implement proper delay with job scheduler or setTimeout
    // For now, just log and advance
    await this.advanceToNextBlock(executionId, block.id, flow);
  }

  /**
   * 🌐 Execute webhook block
   *
   * @private
   */
  private async executeWebhookBlock(
    block: FlowBlock,
    variables: Record<string, any>,
  ): Promise<void> {
    const { webhookUrl, webhookMethod, webhookHeaders, webhookBody } =
      block.data;

    if (!webhookUrl) {
      console.warn(`⚠️ [FlowExecutor] Webhook block has no URL`);
      return;
    }

    try {
      console.log(`🌐 [FlowExecutor] Calling webhook: ${webhookUrl}`);

      const response = await fetch(webhookUrl, {
        method: webhookMethod || "POST",
        headers: {
          "Content-Type": "application/json",
          ...webhookHeaders,
        },
        body: webhookBody ? JSON.stringify(webhookBody) : undefined,
      });

      console.log(`✅ [FlowExecutor] Webhook response: ${response.status}`);
    } catch (error) {
      console.error(`❌ [FlowExecutor] Webhook error:`, error);
    }
  }

  /**
   * 🤖 Transfer to Bot/AI
   *
   * @private
   */
  private async transferToBot(
    executionId: string,
    phone: string,
    clientId: string,
  ): Promise<void> {
    console.log(`🤖 [FlowExecutor] Transferring ${phone} to Bot/AI`);

    // 1. Update contact status
    const { error: statusError } = await this.supabase
      .from("clientes_whatsapp")
      .update({ status: "bot" })
      .eq("telefone", phone)
      .eq("client_id", clientId);

    if (statusError) {
      console.error(
        `❌ [FlowExecutor] Failed to update status to bot: ${statusError.message}`,
      );
    } else {
      console.log(
        `✅ [FlowExecutor] Status changed: fluxo_inicial → bot (${phone})`,
      );
    }

    // 2. Mark flow as completed
    const { error: flowError } = await this.supabase
      .from("flow_executions")
      .update({
        status: "transferred_ai",
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    if (flowError) {
      console.error(
        `❌ [FlowExecutor] Failed to mark flow as transferred_ai: ${flowError.message}`,
      );
    }
  }

  /**
   * 👤 Transfer to Human Agent
   *
   * @private
   */
  private async transferToHuman(
    executionId: string,
    phone: string,
    clientId: string,
  ): Promise<void> {
    console.log(`👤 [FlowExecutor] Transferring ${phone} to Human Agent`);

    // 1. Update contact status
    const { error: statusError } = await this.supabase
      .from("clientes_whatsapp")
      .update({ status: "humano" })
      .eq("telefone", phone)
      .eq("client_id", clientId);

    if (statusError) {
      console.error(
        `❌ [FlowExecutor] Failed to update status to humano: ${statusError.message}`,
      );
    } else {
      console.log(
        `✅ [FlowExecutor] Status changed: fluxo_inicial → humano (${phone})`,
      );
    }

    // 2. Mark flow as completed
    const { error: flowError } = await this.supabase
      .from("flow_executions")
      .update({
        status: "transferred_human",
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    if (flowError) {
      console.error(
        `❌ [FlowExecutor] Failed to mark flow as transferred_human: ${flowError.message}`,
      );
    }

    // 3. Notify agent
    await this.notifyAgent(phone, clientId);
  }

  /**
   * ✅ Complete flow without explicit transfer
   *
   * @private
   */
  private async completeFlow(executionId: string): Promise<void> {
    console.log(`✅ [FlowExecutor] Completing flow: ${executionId}`);

    const { data: execution, error: fetchError } = await this.supabase
      .from("flow_executions")
      .select("phone, client_id")
      .eq("id", executionId)
      .single();

    if (fetchError || !execution) {
      console.error(
        `❌ [FlowExecutor] Failed to fetch execution: ${fetchError?.message}`,
      );
      return;
    }

    // Default status: bot (allow AI to respond)
    const { error: statusError } = await this.supabase
      .from("clientes_whatsapp")
      .update({ status: "bot" })
      .eq("telefone", execution.phone)
      .eq("client_id", execution.client_id);

    if (statusError) {
      console.error(
        `❌ [FlowExecutor] Failed to update status to bot: ${statusError.message}`,
      );
    } else {
      console.log(
        `✅ [FlowExecutor] Flow completed - Status: fluxo_inicial → bot (${execution.phone})`,
      );
    }

    const { error: flowError } = await this.supabase
      .from("flow_executions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", executionId);

    if (flowError) {
      console.error(
        `❌ [FlowExecutor] Failed to mark flow as completed: ${flowError.message}`,
      );
    }
  }

  /**
   * 📧 Notify agent of human handoff
   *
   * @private
   */
  private async notifyAgent(phone: string, clientId: string): Promise<void> {
    // TODO: Implement agent notification (email, realtime, etc.)
    console.log(
      `📧 [FlowExecutor] Notifying agent: new conversation from ${phone}`,
    );
  }

  /**
   * ➡️ Advance to next block automatically
   *
   * Used for blocks without user interaction (message, action, delay, webhook)
   *
   * @private
   */
  private async advanceToNextBlock(
    executionId: string,
    currentBlockId: string,
    flow: InteractiveFlow,
  ): Promise<void> {
    // Find any edge from current block (for blocks without sourceHandle like message, action, delay)
    // Note: Buttons and lists use determineNextBlock() instead, which handles sourceHandle
    const nextEdge = flow.edges.find((e) => e.source === currentBlockId);

    if (nextEdge) {
      console.log(
        `➡️ [FlowExecutor] Advancing to next block: ${nextEdge.target}`,
      );
      await this.executeBlock(executionId, nextEdge.target, flow);
    } else {
      // No next block - complete flow
      console.log(
        `⚠️ [FlowExecutor] No outgoing edge found for block ${currentBlockId}, completing flow`,
      );
      await this.completeFlow(executionId);
    }
  }

  /**
   * 🔍 Determine next block based on current block and user response
   *
   * For interactive buttons and lists, this finds the next block by:
   * 1. Matching the user's response ID to a button/list item
   * 2. Finding the edge with that sourceHandle
   * 3. Returning the target block ID from the edge
   *
   * @private
   */
  private determineNextBlock(
    currentBlock: FlowBlock,
    userResponse: string,
    interactiveResponseId: string | undefined,
    variables: Record<string, any>,
    flow: InteractiveFlow,
  ): string | null {
    // For interactive lists and buttons, match by ID
    if (currentBlock.type === "interactive_list" && interactiveResponseId) {
      const sections = currentBlock.data.listSections || [];

      // First check if nextBlockId is set in the row data (legacy approach)
      for (const section of sections) {
        const row = section.rows.find((r) => r.id === interactiveResponseId);
        if (row && row.nextBlockId) {
          console.log(
            `📋 [FlowExecutor] Found nextBlockId in list row data: ${row.nextBlockId}`,
          );
          return row.nextBlockId;
        }
      }

      // If not found in data, look for edge with matching sourceHandle
      const edge = flow.edges.find(
        (e) =>
          e.source === currentBlock.id &&
          e.sourceHandle === interactiveResponseId,
      );

      if (edge) {
        console.log(
          `📋 [FlowExecutor] Found edge for list item ${interactiveResponseId} -> ${edge.target}`,
        );
        return edge.target;
      }

      console.warn(
        `⚠️ [FlowExecutor] No connection found for list item: ${interactiveResponseId}`,
      );
      return null;
    }

    if (currentBlock.type === "interactive_buttons" && interactiveResponseId) {
      const buttons = currentBlock.data.buttons || [];

      // First check if nextBlockId is set in button data (legacy approach)
      const button = buttons.find((b) => b.id === interactiveResponseId);
      if (button && button.nextBlockId) {
        console.log(
          `🔘 [FlowExecutor] Found nextBlockId in button data: ${button.nextBlockId}`,
        );
        return button.nextBlockId;
      }

      // If not found in data, look for edge with matching sourceHandle
      const edge = flow.edges.find(
        (e) =>
          e.source === currentBlock.id &&
          e.sourceHandle === interactiveResponseId,
      );

      if (edge) {
        console.log(
          `🔘 [FlowExecutor] Found edge for button ${interactiveResponseId} -> ${edge.target}`,
        );
        return edge.target;
      }

      console.warn(
        `⚠️ [FlowExecutor] No connection found for button: ${interactiveResponseId}`,
      );
      return null;
    }

    // For other block types, return null (let executeBlock handle it)
    return null;
  }

  /**
   * 🧮 Evaluate conditions
   *
   * @private
   */
  private evaluateConditions(
    block: FlowBlock,
    variables: Record<string, any>,
  ): string | null {
    const conditions = block.data.conditions || [];

    for (const condition of conditions) {
      const varValue = variables[condition.variable];
      let match = false;

      switch (condition.operator) {
        case "==":
          match = varValue == condition.value;
          break;
        case "!=":
          match = varValue != condition.value;
          break;
        case ">":
          match = Number(varValue) > Number(condition.value);
          break;
        case "<":
          match = Number(varValue) < Number(condition.value);
          break;
        case "contains":
          match = String(varValue || "").includes(String(condition.value));
          break;
        case "not_contains":
          match = !String(varValue || "").includes(String(condition.value));
          break;
      }

      if (match) {
        console.log(
          `✅ [FlowExecutor] Condition matched: ${condition.variable} ${condition.operator} ${condition.value}`,
        );
        return condition.nextBlockId;
      }
    }

    // No condition matched - use default
    const defaultNextBlockId = block.data.defaultNextBlockId;
    if (defaultNextBlockId) {
      console.log(
        `➡️ [FlowExecutor] Using default next block: ${defaultNextBlockId}`,
      );
      return defaultNextBlockId;
    }

    console.log(
      `⚠️ [FlowExecutor] No condition matched and no default next block`,
    );
    return null;
  }

  /**
   * 🔄 Convert database flow to typed flow
   *
   * @private
   */
  private dbToFlow(flowDB: InteractiveFlowDB): InteractiveFlow {
    return {
      id: flowDB.id,
      clientId: flowDB.client_id,
      name: flowDB.name,
      description: flowDB.description || undefined,
      isActive: flowDB.is_active,
      triggerType: flowDB.trigger_type,
      triggerKeywords: flowDB.trigger_keywords || undefined,
      triggerQrCode: flowDB.trigger_qr_code || undefined,
      blocks: flowDB.blocks,
      edges: flowDB.edges,
      startBlockId: flowDB.start_block_id,
      createdBy: flowDB.created_by || undefined,
      createdAt: new Date(flowDB.created_at),
      updatedAt: new Date(flowDB.updated_at),
    };
  }

  /**
   * 🔄 Convert database execution to typed execution
   *
   * @private
   */
  private dbToExecution(executionDB: FlowExecutionDB): FlowExecution {
    return {
      id: executionDB.id,
      flowId: executionDB.flow_id,
      clientId: executionDB.client_id,
      phone: executionDB.phone,
      currentBlockId: executionDB.current_block_id,
      variables: executionDB.variables,
      history: executionDB.history,
      status: executionDB.status,
      startedAt: new Date(executionDB.started_at),
      lastStepAt: new Date(executionDB.last_step_at),
      completedAt: executionDB.completed_at
        ? new Date(executionDB.completed_at)
        : undefined,
    };
  }

  /**
   * 🧭 Persist current block so the next user response is routed correctly
   */
  private async setCurrentBlock(
    executionId: string,
    blockId: string,
  ): Promise<void> {
    await this.supabase
      .from("flow_executions")
      .update({
        current_block_id: blockId,
        last_step_at: new Date().toISOString(),
      })
      .eq("id", executionId);
  }

  /**
   * 💾 Save interactive message to database
   *
   * Stores the interactive message in the messages table so it can be
   * displayed properly in the conversation view
   *
   * @private
   */
  private async saveInteractiveMessage(
    phone: string,
    clientId: string,
    interactiveData: {
      type: "button" | "list";
      body: string;
      footer?: string;
      buttons?: Array<{ id: string; title: string }>;
      header?: string;
      buttonText?: string;
      sections?: any[];
    },
  ): Promise<void> {
    try {
      // Get or create conversation
      const { data: conversation } = await this.supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("phone", phone)
        .maybeSingle();

      let conversationId = conversation?.id;

      if (!conversationId) {
        // Create conversation
        const { data: newConversation, error: createError } = await this
          .supabase
          .from("conversations")
          .insert({
            client_id: clientId,
            phone,
            status: "fluxo_inicial",
            last_message: interactiveData.body,
          })
          .select("id")
          .single();

        if (createError) {
          console.error(
            `❌ [FlowExecutor] Failed to create conversation: ${createError.message}`,
          );
          return;
        }

        conversationId = newConversation.id;
      }

      // Save message
      const { error: messageError } = await this.supabase
        .from("messages")
        .insert({
          client_id: clientId,
          conversation_id: conversationId,
          phone,
          content: interactiveData.body,
          type: "interactive",
          direction: "outgoing",
          status: "sent",
          metadata: {
            interactive: interactiveData,
          },
        });

      if (messageError) {
        console.error(
          `❌ [FlowExecutor] Failed to save interactive message: ${messageError.message}`,
        );
      } else {
        console.log(`✅ [FlowExecutor] Interactive message saved to database`);
      }
    } catch (error) {
      console.error(
        `❌ [FlowExecutor] Error saving interactive message:`,
        error,
      );
    }
  }
}
