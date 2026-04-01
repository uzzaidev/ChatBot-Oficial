"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BillingInfo {
  subscription: {
    status: string;
    plan_name: string;
  } | null;
  role: string;
}

// Routes that should NEVER be blocked by the payment wall
const ALLOWED_ROUTES = [
  "/dashboard/billing",
  "/dashboard/admin",
  "/dashboard/settings",
];

const isRouteAllowed = (pathname: string): boolean =>
  ALLOWED_ROUTES.some((r) => pathname.startsWith(r));

const BLOCKED_STATUSES = new Set([
  "pending_payment",
  "suspended",
  "canceled",
  "incomplete",
]);

export function PaymentWall({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const res = await apiFetch("/api/billing");
        if (!res.ok) {
          setBilling(null);
          return;
        }
        const json = await res.json();
        setBilling(json);
      } catch {
        setBilling(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  // Don't block while loading
  if (loading) return <>{children}</>;

  // Admins are never blocked
  if (billing?.role === "admin") return <>{children}</>;

  // Allow certain routes (billing page itself, settings)
  if (isRouteAllowed(pathname)) return <>{children}</>;

  // If subscription exists and is active/trial/past_due — allow through
  const status = billing?.subscription?.status;
  if (status && !BLOCKED_STATUSES.has(status)) return <>{children}</>;

  // No subscription OR blocked status → show payment wall
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await apiFetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promoCode: promoCode || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao iniciar checkout");
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err: any) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Acesso Restrito</CardTitle>
          <CardDescription>
            {status === "suspended"
              ? "Sua conta foi suspensa por falta de pagamento."
              : status === "canceled"
              ? "Sua assinatura foi cancelada."
              : "É necessário ter uma assinatura ativa para acessar o dashboard."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan info */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">UzzApp Pro</p>
              <p className="text-xs text-muted-foreground">
                R$ 249,00/mês — WhatsApp AI completo
              </p>
            </div>
          </div>

          {/* Promo code */}
          <div>
            <Label htmlFor="promo-code" className="text-sm">
              Código promocional (opcional)
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="promo-code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Ex: LANCAMENTO50"
              />
              <Ticket className="h-4 w-4 mt-2.5 text-muted-foreground flex-shrink-0" />
            </div>
          </div>

          {checkoutError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {checkoutError}
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={checkoutLoading}
          >
            {checkoutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Efetuar Pagamento
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Pagamento processado com segurança via Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
