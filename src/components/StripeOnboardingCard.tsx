// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StripeAccountStatus {
  stripeAccountId: string;
  accountStatus: "pending" | "onboarding" | "active" | "restricted" | "disabled";
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

export function StripeOnboardingCard() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [account, setAccount] = useState<StripeAccountStatus | null>(null);

  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");

  const statusLabel = useMemo(() => {
    if (!account) return "Sem conta conectada";
    if (account.accountStatus === "active") return "Conta ativa e apta a receber pagamentos";
    if (account.accountStatus === "onboarding") return "Onboarding em andamento";
    if (account.accountStatus === "restricted") return "Conta com restricoes";
    if (account.accountStatus === "disabled") return "Conta desativada";
    return "Conta criada aguardando onboarding";
  }, [account]);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/connect/account", {
        method: "GET",
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao consultar status da conta Stripe.");
      }
      setAccount(json.account ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado ao carregar status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const createConnectedAccount = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/connect/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          businessName,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao criar conta conectada.");
      }

      setMessage("Conta conectada criada com sucesso.");
      setAccount(json.account ?? null);

      // Redireciona imediatamente para onboarding quando URL estiver disponivel.
      if (json.onboardingUrl) {
        window.location.href = json.onboardingUrl;
        return;
      }
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado ao criar conta conectada.");
    } finally {
      setBusy(false);
    }
  };

  const startOrResumeOnboarding = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/connect/account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao gerar link de onboarding.");
      }

      if (!json.url) {
        throw new Error("A API nao retornou URL de onboarding.");
      }

      window.location.href = json.url;
    } catch (err: any) {
      setError(err?.message ?? "Erro inesperado ao abrir onboarding.");
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onboarding Stripe Connect</CardTitle>
        <CardDescription>
          Conecte sua conta para coletar pagamentos e acompanhe o status em tempo real pela API da Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando status...</p>
        ) : (
          <>
            <div className="rounded-md border border-border p-4 bg-muted/20">
              <p className="text-sm font-medium">{statusLabel}</p>
              {account && (
                <div className="mt-3 text-sm space-y-1 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Conta:</span>{" "}
                    {account.stripeAccountId}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Requirements:</span>{" "}
                    {account.requirementsStatus ?? "n/a"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Charges enabled:</span>{" "}
                    {String(account.chargesEnabled)}
                  </p>
                </div>
              )}
            </div>

            {!account && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="stripe-email">Email de contato</Label>
                  <Input
                    id="stripe-email"
                    type="email"
                    placeholder="voce@empresa.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-business-name">Nome do negocio</Label>
                  <Input
                    id="stripe-business-name"
                    placeholder="Minha Empresa"
                    value={businessName}
                    onChange={(event) => setBusinessName(event.target.value)}
                  />
                </div>

                <Button onClick={createConnectedAccount} disabled={busy || !email || !businessName}>
                  {busy ? "Criando conta..." : "Conectar ao Stripe"}
                </Button>
              </div>
            )}

            {account && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={startOrResumeOnboarding} disabled={busy}>
                  {busy
                    ? "Abrindo onboarding..."
                    : "Onboard to collect payments"}
                </Button>
                <Button variant="outline" onClick={fetchStatus} disabled={busy}>
                  Atualizar status
                </Button>
              </div>
            )}
          </>
        )}

        {message && <p className="text-sm text-emerald-600">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

