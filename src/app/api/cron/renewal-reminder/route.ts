/**
 * Cron endpoint: warn clients 7 days before automatic subscription renewal.
 *
 * Designed to be called by Vercel Cron (vercel.json) or external scheduler.
 * Queries platform_client_subscriptions with current_period_end landing on
 * "today + 7 days" and emails the client's notification_email so the
 * automatic renewal charge isn't a surprise.
 *
 * Security: Protected by CRON_SECRET header check.
 */

import { sendEmail } from "@/lib/gmail";
import { createServiceClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const LOG_PREFIX = "[cron:renewal-reminder]";
const REMINDER_DAYS_BEFORE = 7;

const formatDateBR = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

const formatCurrency = (amountCents: number, currency: string): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

const buildEmailHtml = (params: {
  clientName: string;
  periodEnd: string;
  planName: string;
  amount: number;
  currency: string;
}): string => {
  const { clientName, periodEnd, planName, amount, currency } = params;
  const renewalDate = formatDateBR(periodEnd);
  const priceLabel = formatCurrency(amount, currency);

  return `
Olá, ${clientName}!<br><br>
Este é um aviso automático: sua assinatura do plano <strong>${planName}</strong> será renovada automaticamente em <strong>${renewalDate}</strong> (daqui a ${REMINDER_DAYS_BEFORE} dias).<br><br>
Valor da renovação: <strong>${priceLabel}</strong>.<br><br>
Se você não deseja renovar, cancele antes dessa data pelo painel. Caso não haja nenhuma ação, a cobrança será feita automaticamente no cartão cadastrado.<br><br>
Qualquer dúvida, é só responder este email.
`.trim();
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient() as any;

    const targetDay = new Date();
    targetDay.setUTCDate(targetDay.getUTCDate() + REMINDER_DAYS_BEFORE);
    const startOfDay = new Date(
      Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate(), 0, 0, 0),
    );
    const endOfDay = new Date(
      Date.UTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth(), targetDay.getUTCDate(), 23, 59, 59, 999),
    );

    const { data: subscriptions, error } = await supabase
      .from("platform_client_subscriptions")
      .select(
        "id, client_id, plan_name, plan_amount, plan_currency, current_period_end, status, cancel_at_period_end",
      )
      .eq("status", "active")
      .eq("cancel_at_period_end", false)
      .gte("current_period_end", startOfDay.toISOString())
      .lte("current_period_end", endOfDay.toISOString());

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      console.info(`${LOG_PREFIX} No renewals in ${REMINDER_DAYS_BEFORE} days`);
      return NextResponse.json({ notified: 0 });
    }

    console.info(
      `${LOG_PREFIX} Found ${subscriptions.length} subscriptions renewing on ${startOfDay.toISOString().slice(0, 10)}`,
    );

    const results: Array<{
      clientId: string;
      success: boolean;
      skipped?: string;
      error?: string;
    }> = [];

    for (const sub of subscriptions) {
      try {
        // Idempotência: não reenviar se já avisamos para este período.
        const { data: existingReminder } = await supabase
          .from("subscription_renewal_reminders")
          .select("id")
          .eq("client_id", sub.client_id)
          .eq("period_end", sub.current_period_end)
          .maybeSingle();

        if (existingReminder) {
          results.push({ clientId: sub.client_id, success: true, skipped: "already_sent" });
          continue;
        }

        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("name, notification_email")
          .eq("id", sub.client_id)
          .single();

        if (clientError || !client) {
          throw new Error(`Client not found: ${clientError?.message ?? "unknown"}`);
        }

        let emailTo: string | null = client.notification_email ?? null;

        if (!emailTo) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("client_id", sub.client_id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          emailTo = profile?.email ?? null;
        }

        if (!emailTo) {
          results.push({ clientId: sub.client_id, success: false, skipped: "no_email" });
          console.warn(`${LOG_PREFIX} No email found for client ${sub.client_id}, skipping`);
          continue;
        }

        const html = buildEmailHtml({
          clientName: client.name ?? "cliente",
          periodEnd: sub.current_period_end,
          planName: sub.plan_name ?? "pro",
          amount: sub.plan_amount ?? 0,
          currency: sub.plan_currency ?? "brl",
        });

        await sendEmail(emailTo, "Sua assinatura será renovada em breve", html);

        const { error: logError } = await supabase.from("subscription_renewal_reminders").insert({
          client_id: sub.client_id,
          subscription_id: sub.id,
          period_end: sub.current_period_end,
          email_to: emailTo,
        });
        if (logError) throw logError;

        results.push({ clientId: sub.client_id, success: true });
        console.info(`${LOG_PREFIX} Notified client ${sub.client_id} at ${emailTo}`);
      } catch (err: any) {
        results.push({ clientId: sub.client_id, success: false, error: err?.message ?? "unknown" });
        console.error(`${LOG_PREFIX} Failed for ${sub.client_id}:`, err);
      }
    }

    const successCount = results.filter((r) => r.success && !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const failCount = results.filter((r) => !r.success).length;

    console.info(
      `${LOG_PREFIX} Done: ${successCount} notified, ${skippedCount} skipped, ${failCount} failed`,
    );

    return NextResponse.json({
      notified: successCount,
      skipped: skippedCount,
      failed: failCount,
      details: results,
    });
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Cron error:`, error);
    return NextResponse.json(
      { error: "Cron execution failed", details: error?.message },
      { status: 500 },
    );
  }
}
