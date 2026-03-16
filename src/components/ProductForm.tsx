// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface ProductFormValues {
  name: string;
  description?: string;
  amountCentavos: number;
  currency: string;
  type: "one_time" | "subscription";
  interval?: "month" | "year";
}

interface ProductFormProps {
  title?: string;
  submitLabel?: string;
  initialValues?: Partial<ProductFormValues>;
  loading?: boolean;
  onSubmit: (values: ProductFormValues) => Promise<void> | void;
}

export function ProductForm({
  title = "Criar produto",
  submitLabel = "Salvar produto",
  initialValues,
  loading = false,
  onSubmit,
}: ProductFormProps) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [amountCentavos, setAmountCentavos] = useState(
    initialValues?.amountCentavos ? String(initialValues.amountCentavos) : ""
  );
  const [currency, setCurrency] = useState(initialValues?.currency ?? "usd");
  const [type, setType] = useState<"one_time" | "subscription">(
    initialValues?.type ?? "one_time"
  );
  const [interval, setInterval] = useState<"month" | "year">(
    initialValues?.interval ?? "month"
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const amount = Number(amountCentavos);
    if (!name.trim()) {
      setError("Nome e obrigatorio.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe um valor valido em centavos.");
      return;
    }

    const payload: ProductFormValues = {
      name: name.trim(),
      description: description.trim() || undefined,
      amountCentavos: Math.round(amount),
      currency: currency.toLowerCase(),
      type,
      interval: type === "subscription" ? interval : undefined,
    };

    await onSubmit(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Plano Premium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Descricao</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descricao opcional para o checkout"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="product-amount">Valor (centavos)</Label>
              <Input
                id="product-amount"
                value={amountCentavos}
                onChange={(event) => setAmountCentavos(event.target.value)}
                placeholder="Ex: 1990"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-currency">Moeda</Label>
              <Input
                id="product-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                placeholder="usd"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as "one_time" | "subscription")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">Pagamento unico</SelectItem>
                  <SelectItem value="subscription">Assinatura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "subscription" && (
              <div className="space-y-2">
                <Label>Intervalo</Label>
                <Select
                  value={interval}
                  onValueChange={(value) => setInterval(value as "month" | "year")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Mensal</SelectItem>
                    <SelectItem value="year">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

