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
import { sendTextMessage as sendWhatsAppText } from "@/lib/meta";
import { getClientConfig } from "@/lib/config";

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

      // 4. ⭐ CREATE OR UPDATE customer record with status 'fluxo_inicial'
      const { error: statusError } = await this.supabase
        .from("clientes_whatsapp")
        .upsert(
          {
            telefone: phone,
            client_id: clientId,
            status: "fluxo_inicial",
            nome: phone, // Will be updated later if we get the real name
          },
          {
            onConflict: "telefone,client_id",
            ignoreDuplicates: false,
          },
        );

      if (statusError) {
        console.error(
          `❌ [FlowExecutor] Failed to upsert customer record: ${statusError.message}`,
        );
        // Continue anyway - status update is not critical for execution
      } else {
        console.log(
          `✅ [FlowExecutor] Customer record ensured in clientes_whatsapp (${phone})`,
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

      // Persist a user reply so it appears in the conversation history
      await this.saveIncomingMessage(
        phone,
        clientId,
        userResponse,
        interactiveResponseId,
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
          block,
        );
        break;

      case "human_handoff":
        await this.transferToHuman(
          executionId,
          execution.phone,
          execution.client_id,
          block,
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

    const { messageId: wamid } = await sendInteractiveList(phone, {
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
      wamid,
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

    const { messageId: wamid } = await sendInteractiveButtons(phone, {
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
      wamid,
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
    block: FlowBlock,
  ): Promise<void> {
    console.log(`🤖 [FlowExecutor] Transferring ${phone} to Bot/AI`);

    const {
      transitionMessage,
      autoRespond = true,
      includeFlowContext = true,
      contextFormat = "summary",
    } = block.data;

    // 1. Get execution with history
    const { data: executionDB, error: execError } = await this.supabase
      .from("flow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execError || !executionDB) {
      console.error(
        `❌ [FlowExecutor] Failed to fetch execution: ${execError?.message}`,
      );
      return;
    }

    const execution = this.dbToExecution(executionDB);

    // Persist collected lead/contact data from flow variables to customer metadata
    // so the data survives beyond the flow execution lifecycle.
    await this.persistCollectedMetadata(clientId, phone, execution.variables);

    // 2. Send transition message (if configured)
    if (transitionMessage) {
      await this.sendTextMessage(phone, clientId, transitionMessage);
      await this.saveOutgoingMessage(phone, clientId, transitionMessage);
    }

    // 3. Update contact status
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

    // 4. Mark flow as completed
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

    // 5. AUTO-RESPONSE FROM BOT
    if (autoRespond) {
      // Format flow context
      const flowContext = includeFlowContext
        ? this.formatFlowContext(execution, contextFormat)
        : null;

      // Get last user message
      const lastUserMessage = this.getLastUserMessage(execution);

      // Trigger bot response
      await this.triggerBotResponse(
        phone,
        clientId,
        lastUserMessage,
        flowContext,
      );
    }
  }

  /**
   * Merge selected flow variables into clientes_whatsapp.metadata (JSONB).
   * This is a best-effort operation and must never break flow execution.
   */
  private async persistCollectedMetadata(
    clientId: string,
    phone: string,
    variables: Record<string, any>,
  ): Promise<void> {
    try {
      if (!variables || typeof variables !== "object") {
        return;
      }

      const mapped = this.mapFlowVariablesToContactMetadata(variables);
      if (Object.keys(mapped).length === 0) {
        return;
      }

      const { data: currentCustomer, error: readError } = await this.supabase
        .from("clientes_whatsapp")
        .select("metadata")
        .eq("telefone", phone)
        .eq("client_id", clientId)
        .maybeSingle();

      if (readError) {
        console.warn(
          "[FlowExecutor] Could not read existing customer metadata:",
          readError.message,
        );
        return;
      }

      const existing = this.toPlainObject(currentCustomer?.metadata);
      const merged = {
        ...existing,
        ...mapped,
        last_flow_metadata_update_at: new Date().toISOString(),
      };

      const { error: updateError } = await this.supabase
        .from("clientes_whatsapp")
        .update({ metadata: merged })
        .eq("telefone", phone)
        .eq("client_id", clientId);

      if (updateError) {
        console.warn(
          "[FlowExecutor] Could not update customer metadata:",
          updateError.message,
        );
      }
    } catch (error) {
      console.warn(
        "[FlowExecutor] Unexpected error while persisting customer metadata:",
        error,
      );
    }
  }

  private mapFlowVariablesToContactMetadata(
    variables: Record<string, any>,
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    const scalarEntries = Object.entries(variables).filter(([, value]) => {
      return (
        value !== null &&
        value !== undefined &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean")
      );
    });

    for (const [rawKey, value] of scalarEntries) {
      const key = this.normalizeKey(rawKey);
      if (!key) continue;

      if (this.isKnownMetadataKey(key)) {
        metadata[key] = value;
        continue;
      }

      // Allow custom lead fields with explicit prefixes.
      if (key.startsWith("lead_") || key.startsWith("crm_")) {
        metadata[key] = value;
      }
    }

    // Alias mapping for common terms used in conversational flows.
    const aliasMap: Array<{ aliases: string[]; target: string }> = [
      { aliases: ["email", "e_mail"], target: "email" },
      { aliases: ["cpf", "documento", "document"], target: "cpf" },
      {
        aliases: ["como_conheceu", "origem", "source", "canal_origem"],
        target: "como_conheceu",
      },
      { aliases: ["indicado_por", "indicacao", "referral"], target: "indicado_por" },
      { aliases: ["objetivo", "objetivo_yoga"], target: "objetivo" },
      {
        aliases: ["tecnofit_reservado", "reservou_tecnofit"],
        target: "tecnofit_reservado",
      },
      { aliases: ["slack_avisado", "aviso_slack"], target: "slack_avisado" },
    ];

    for (const mapping of aliasMap) {
      if (metadata[mapping.target] !== undefined) continue;

      for (const alias of mapping.aliases) {
        const aliasValue = variables[alias];
        if (aliasValue !== null && aliasValue !== undefined && aliasValue !== "") {
          metadata[mapping.target] = aliasValue;
          break;
        }
      }
    }

    return metadata;
  }

  private isKnownMetadataKey(key: string): boolean {
    return [
      "cpf",
      "email",
      "como_conheceu",
      "indicado_por",
      "objetivo",
      "tecnofit_reservado",
      "slack_avisado",
      "instrutor_preferido",
      "responsavel_agendamento",
    ].includes(key);
  }

  private normalizeKey(key: string): string {
    if (!key || typeof key !== "string") return "";

    return key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private toPlainObject(value: any): Record<string, any> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value;
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
    block: FlowBlock,
  ): Promise<void> {
    console.log(`👤 [FlowExecutor] Transferring ${phone} to Human Agent`);

    const {
      transitionMessage,
      notifyAgent = true,
    } = block.data;

    // 1. Get execution with history
    const { data: executionDB, error: execError } = await this.supabase
      .from("flow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execError || !executionDB) {
      console.error(
        `❌ [FlowExecutor] Failed to fetch execution: ${execError?.message}`,
      );
      return;
    }

    const execution = this.dbToExecution(executionDB);

    // 2. Send transition message (if configured)
    if (transitionMessage) {
      await this.sendTextMessage(phone, clientId, transitionMessage);
      await this.saveOutgoingMessage(phone, clientId, transitionMessage);
    }

    // 3. Update contact status
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

    // 4. Mark flow as completed
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

    // 5. Notify agent (if configured)
    if (notifyAgent) {
      await this.notifyAgent(phone, clientId);
    }
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
   * 📤 Send text message via WhatsApp
   *
   * @private
   */
  private async sendTextMessage(
    phone: string,
    clientId: string,
    message: string,
  ): Promise<void> {
    try {
      const config = await getClientConfig(clientId);
      await sendWhatsAppText(phone, message, config || undefined);
    } catch (error) {
      console.error(
        `❌ [FlowExecutor] Failed to send text message:`,
        error,
      );
      throw error;
    }
  }

  /**
   * 💾 Save outgoing message to database
   *
   * @private
   */
  private async saveOutgoingMessage(
    phone: string,
    clientId: string,
    content: string,
  ): Promise<void> {
    try {
      const { data: conversation } = await this.supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("phone", phone)
        .maybeSingle();

      const conversationId = conversation?.id;

      await this.supabase.from("messages").insert({
        client_id: clientId,
        conversation_id: conversationId,
        phone,
        content,
        type: "text",
        direction: "outgoing",
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ [FlowExecutor] Outgoing message saved to database`);
    } catch (error) {
      console.error(
        `❌ [FlowExecutor] Error saving outgoing message:`,
        error,
      );
    }
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
      wamid?: string;
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
          // Use 'queued' to represent pending(clock) in the UI until webhook confirms
          status: "queued",
          metadata: {
            interactive: interactiveData,
            ...(interactiveData.wamid ? { wamid: interactiveData.wamid } : {}),
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

  /**
   * 💾 Save the user's reply (text or interactive selection) into the messages table
   */
  private async saveIncomingMessage(
    phone: string,
    clientId: string,
    content: string,
    interactiveResponseId?: string,
  ): Promise<void> {
    try {
      const { data: conversation } = await this.supabase
        .from("conversations")
        .select("id")
        .eq("client_id", clientId)
        .eq("phone", phone)
        .maybeSingle();

      const conversationId = conversation?.id;
      const metadata: Record<string, unknown> = {};
      if (interactiveResponseId) {
        metadata.interactive_response_id = interactiveResponseId;
      }

      await this.supabase.from("messages").insert({
        client_id: clientId,
        conversation_id: conversationId,
        phone,
        content: content || "",
        type: "text",
        direction: "incoming",
        status: "sent",
        metadata: Object.keys(metadata).length ? metadata : null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `❌ [FlowExecutor] Error saving incoming message:`,
        error,
      );
    }
  }

  /**
   * 📝 Format flow execution context for bot
   *
   * @private
   */
  private formatFlowContext(
    execution: FlowExecution,
    format: "summary" | "full" = "summary",
  ): string {
    if (format === "summary") {
      // Resumo: apenas variáveis coletadas e última interação
      const vars = execution.variables;
      const lastStep = execution.history[execution.history.length - 1];

      const varsText = Object.keys(vars).length > 0
        ? Object.entries(vars)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
        : "Nenhuma variável coletada.";

      const lastInteraction = lastStep
        ? lastStep.userResponse || lastStep.interactiveResponseId || "N/A"
        : "N/A";

      const context = `[CONTEXTO DO FLUXO INTERATIVO]
O cliente acabou de passar por um fluxo interativo automatizado.

Dados coletados:
${varsText}

Última interação do cliente: ${lastInteraction}

IMPORTANTE: O cliente já forneceu essas informações. Use-as no contexto da conversa.`;

      // Limitar a 1000 caracteres
      return context.length > 1000
        ? context.substring(0, 1000) + "... [contexto truncado]"
        : context;
    } else {
      // Full: histórico completo de interações
      const steps = execution.history
        .map((step, i) => {
          const response = step.userResponse || step.interactiveResponseId ||
            "-";
          return `${i + 1}. [${step.blockType}] ${response}`;
        })
        .join("\n");

      const vars = execution.variables;
      const varsText = Object.keys(vars).length > 0
        ? Object.entries(vars)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")
        : "Nenhuma variável coletada.";

      const context = `[HISTÓRICO COMPLETO DO FLUXO INTERATIVO]

Sequência de interações:
${steps}

Variáveis coletadas:
${varsText}

IMPORTANTE: Use este histórico para entender o contexto completo da conversa.`;

      // Limitar a 2000 caracteres para formato full
      return context.length > 2000
        ? context.substring(0, 2000) + "... [contexto truncado]"
        : context;
    }
  }

  /**
   * 💬 Get last user message from flow execution
   *
   * @private
   */
  private getLastUserMessage(execution: FlowExecution): string {
    const history = execution.history;

    // Procurar de trás para frente a última resposta do usuário
    for (let i = history.length - 1; i >= 0; i--) {
      const step = history[i];
      if (step.userResponse) {
        return step.userResponse;
      }
      if (step.interactiveResponseId) {
        // Se for resposta interativa, retornar formatado
        return `[Selecionou: ${step.interactiveResponseId}]`;
      }
    }

    // Fallback: usuário não respondeu nada (improvável)
    return "Olá";
  }

  /**
   * 🤖 Trigger bot response after transfer
   *
   * @private
   */
  private async triggerBotResponse(
    phone: string,
    clientId: string,
    userMessage: string,
    flowContext: string | null,
  ): Promise<void> {
    try {
      console.log(
        `🤖 [FlowExecutor] Triggering bot response for ${phone} with context`,
      );

      // Buscar nome real do cliente
      const { data: customer } = await this.supabase
        .from("clientes_whatsapp")
        .select("nome")
        .eq("telefone", phone)
        .eq("client_id", clientId)
        .single();

      const customerName = customer?.nome || phone;

      // Salvar contexto do flow no histórico de chat
      // Isso permite que o bot veja o contexto quando gerar resposta
      if (flowContext) {
        await this.supabase.from("n8n_chat_histories").insert({
          session_id: phone,
          client_id: clientId,
          message: {
            type: "system",
            content: flowContext,
          },
          created_at: new Date().toISOString(),
        });
      }

      // Criar mock payload como se fosse webhook do WhatsApp
      const mockPayload = {
        object: "whatsapp_business_account" as const,
        entry: [
          {
            id: "mock",
            changes: [
              {
                value: {
                  messaging_product: "whatsapp" as const,
                  metadata: {
                    display_phone_number: phone,
                    phone_number_id: "mock",
                  },
                  contacts: [
                    {
                      profile: { name: customerName },
                      wa_id: phone,
                    },
                  ],
                  messages: [
                    {
                      from: phone,
                      id: `mock_${Date.now()}`,
                      timestamp: Math.floor(Date.now() / 1000).toString(),
                      type: "text" as const,
                      text: {
                        body: userMessage,
                      },
                    },
                  ],
                },
                field: "messages" as const,
              },
            ],
          },
        ],
      };

      // Importar dinamicamente para evitar dependência circular
      const { processChatbotMessage } = await import("@/flows/chatbotFlow");

      // Get client config
      const config = await getClientConfig(clientId);

      if (!config) {
        console.error(
          `❌ [FlowExecutor] No config found for client ${clientId}`,
        );
        return;
      }

      // Chamar chatbotFlow com o payload mock
      await processChatbotMessage(mockPayload, config);

      console.log(
        `✅ [FlowExecutor] Bot response triggered successfully for ${phone}`,
      );
    } catch (error) {
      console.error(
        `❌ [FlowExecutor] Error triggering bot response:`,
        error,
      );
      // Não lançar erro - transferência ainda foi feita
    }
  }
}
