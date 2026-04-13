import { getClientConfig } from "@/lib/config";
import { sendTemplateMessage, sendTextMessage } from "@/lib/meta";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds max execution time

interface ScheduledMessageWithClient {
  id: string;
  client_id: string;
  phone: string | number;
  message_type: string;
  content: string | null;
  template_id: string | null;
  template_params: Record<string, any> | null;
  status: string;
}

/**
 * POST /api/cron/scheduled-messages
 *
 * Process pending scheduled messages that are due to be sent.
 * This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions).
 *
 * Security: Requires CRON_SECRET header for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Get pending messages that are due
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("scheduled_messages")
      .select(
        `
        id,
        client_id,
        phone,
        message_type,
        content,
        template_id,
        template_params,
        status
      `,
      )
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching pending messages:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No pending messages to process",
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Cache client configs to avoid repeated Vault lookups for same client
    const clientConfigCache = new Map<
      string,
      Awaited<ReturnType<typeof getClientConfig>>
    >();

    // Process each message
    for (const msg of pendingMessages as unknown as ScheduledMessageWithClient[]) {
      results.processed++;

      try {
        // Get client config (Vault-based credentials) - cached per client
        let config = clientConfigCache.get(msg.client_id);
        if (!config) {
          config = await getClientConfig(msg.client_id);
          if (config) clientConfigCache.set(msg.client_id, config);
        }

        if (!config) {
          throw new Error(
            `Client config not found for client ${msg.client_id}`,
          );
        }

        const phone = String(msg.phone);
        let wamid: string | undefined;

        if (msg.message_type === "template") {
          if (!msg.template_id) {
            throw new Error("Template message missing template_id");
          }
          const components = msg.template_params?.components || [];
          // Extract simple text parameters from body component for sendTemplateMessage
          const bodyComp = components.find((c: any) => c.type === "body");
          const parameters: string[] | undefined = bodyComp?.parameters
            ?.filter((p: any) => p.type === "text")
            .map((p: any) => String(p.text));

          const result = await sendTemplateMessage(
            phone,
            msg.template_id,
            msg.template_params?.language || "pt_BR",
            parameters,
            config,
          );
          wamid = result.messageId;
        } else {
          if (!msg.content) {
            throw new Error("Text message missing content");
          }
          const result = await sendTextMessage(phone, msg.content, config);
          wamid = result.messageId;
        }

        // Update message status to sent
        await (supabase as any)
          .from("scheduled_messages")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            wamid: wamid || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", msg.id);

        // Log the sent message to messages table
        await (supabase as any).from("messages").insert({
          client_id: msg.client_id,
          phone: String(msg.phone),
          direction: "outgoing",
          type: "text",
          content: msg.content,
          wamid: wamid,
          status: "sent",
          created_at: new Date().toISOString(),
        });

        results.sent++;
      } catch (err: any) {
        const errorMessage = err.message || "Unknown error";
        results.failed++;
        results.errors.push(`Message ${msg.id}: ${errorMessage}`);

        // Update message status to failed
        await (supabase as any)
          .from("scheduled_messages")
          .update({
            status: "failed",
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", msg.id);
      }
    }

    console.log(
      `Scheduled messages processed: ${results.processed}, sent: ${results.sent}, failed: ${results.failed}`,
    );

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: any) {
    console.error("Error in scheduled messages cron:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/cron/scheduled-messages
 *
 * Health check / status endpoint
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Count pending messages
    const { count: pendingCount } = await supabase
      .from("scheduled_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Count due messages (pending and past scheduled_for)
    const { count: dueCount } = await supabase
      .from("scheduled_messages")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString());

    return NextResponse.json({
      status: "healthy",
      pending_messages: pendingCount || 0,
      due_messages: dueCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in scheduled messages health check:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
