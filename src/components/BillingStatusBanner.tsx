"use client";

import { createClientBrowser } from "@/lib/supabase";
import { AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type BannerState = "past_due" | "suspended" | null;

/**
 * Shows a warning/error banner when the client's plan is past_due or suspended.
 * Fetches plan_status + grace_period_ends_at from /api/billing.
 */
export const BillingStatusBanner = () => {
  const [status, setStatus] = useState<BannerState>(null);
  const [graceEnds, setGraceEnds] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const supabase = createClientBrowser();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch("/api/billing", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;

        const json = await res.json();
        const planStatus = json.subscription?.status;
        const grace = json.subscription?.grace_period_ends_at;

        if (planStatus === "suspended" || planStatus === "canceled") {
          setStatus("suspended");
        } else if (planStatus === "past_due") {
          setStatus("past_due");
          setGraceEnds(grace);
        }
      } catch {
        // Silent fail — banner is non-critical
      }
    };

    checkStatus();
  }, []);

  if (!status) return null;

  const daysLeft = graceEnds
    ? Math.max(
        0,
        Math.ceil(
          (new Date(graceEnds).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  if (status === "suspended") {
    return (
      <div className="mx-2 mb-3 sm:mx-0 rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-3">
        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-destructive">Conta suspensa</p>
          <p className="text-muted-foreground">
            Sua assinatura foi cancelada e o WhatsApp foi desconectado.{" "}
            <Link
              href="/dashboard/billing"
              className="underline text-primary hover:text-primary/80"
            >
              Reativar plano
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-3 sm:mx-0 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-yellow-600 dark:text-yellow-400">
          Pagamento pendente
        </p>
        <p className="text-muted-foreground">
          Sua última cobrança falhou.{" "}
          {daysLeft !== null && daysLeft > 0
            ? `Você tem ${daysLeft} dia${
                daysLeft !== 1 ? "s" : ""
              } para regularizar antes da suspensão.`
            : "Regularize o pagamento para evitar a suspensão."}{" "}
          <Link
            href="/dashboard/billing"
            className="underline text-primary hover:text-primary/80"
          >
            Ver faturamento
          </Link>
        </p>
      </div>
    </div>
  );
};
