// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm, type ProductFormValues } from "@/components/ProductForm";
import { Button } from "@/components/ui/button";

interface StripeProductRow {
  id: string;
  stripe_product_id: string;
  stripe_price_id: string | null;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  type: "one_time" | "subscription";
  interval: "month" | "year" | null;
  active: boolean;
}

interface AccountResponse {
  account: {
    clientSlug?: string;
  } | null;
  clientSlug?: string | null;
}

export default function PaymentsProductsPage() {
  const [products, setProducts] = useState<StripeProductRow[]>([]);
  const [editingProduct, setEditingProduct] = useState<StripeProductRow | null>(null);
  const [clientSlug, setClientSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const [productsResponse, accountResponse] = await Promise.all([
        fetch("/api/stripe/connect/products", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/stripe/connect/account", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const productsJson = await productsResponse.json();
      const accountJson = (await accountResponse.json()) as AccountResponse;

      if (!productsResponse.ok) {
        throw new Error(productsJson?.error ?? "Falha ao listar produtos.");
      }

      setProducts(productsJson.products ?? []);
      setClientSlug(accountJson?.account?.clientSlug ?? accountJson?.clientSlug ?? null);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao carregar catalogo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const createProduct = async (values: ProductFormValues) => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/stripe/connect/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao criar produto.");
      }

      setMessage("Produto criado com sucesso.");
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao criar produto.");
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async (values: ProductFormValues) => {
    if (!editingProduct) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/stripe/connect/products/${editingProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao atualizar produto.");
      }

      setMessage("Produto atualizado com sucesso.");
      setEditingProduct(null);
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao atualizar produto.");
    } finally {
      setSaving(false);
    }
  };

  const archiveProduct = async (productId: string) => {
    const confirmed = window.confirm("Deseja arquivar este produto?");
    if (!confirmed) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/stripe/connect/products/${productId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error ?? "Falha ao arquivar produto.");
      }

      setMessage("Produto arquivado com sucesso.");
      await fetchProducts();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao arquivar produto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Produtos Stripe</h1>
          <p className="text-sm text-muted-foreground">
            Crie produtos na conta conectada usando Stripe-Account header.
          </p>
        </div>
        <div className="flex gap-2">
          {clientSlug && (
            <Button asChild variant="outline">
              <Link href={`/store/${clientSlug}`} target="_blank">
                Abrir storefront
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/dashboard/payments">Voltar</Link>
          </Button>
        </div>
      </div>

      {editingProduct ? (
        <ProductForm
          title={`Editar produto: ${editingProduct.name}`}
          submitLabel="Salvar alteracoes"
          loading={saving}
          initialValues={{
            name: editingProduct.name,
            description: editingProduct.description ?? "",
            amountCentavos: editingProduct.amount,
            currency: editingProduct.currency,
            type: editingProduct.type,
            interval: editingProduct.interval ?? undefined,
          }}
          onSubmit={updateProduct}
        />
      ) : (
        <ProductForm loading={saving} onSubmit={createProduct} />
      )}

      {editingProduct && (
        <Button variant="ghost" onClick={() => setEditingProduct(null)}>
          Cancelar edicao
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando produtos...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum produto criado ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                name: product.name,
                description: product.description,
                amount: product.amount,
                currency: product.currency,
                type: product.type,
                interval: product.interval,
                active: product.active,
              }}
              clientSlug={clientSlug ?? undefined}
              showDashboardActions
              onEdit={() => setEditingProduct(product)}
              onArchive={() => archiveProduct(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
