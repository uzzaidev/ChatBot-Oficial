// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { createServiceClient } from "@/lib/supabase-server";

interface ProductDetailsPageProps {
  params: Promise<{
    clientSlug: string;
    productId: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { clientSlug, productId } = await params;
  const supabase = createServiceClient() as any;

  const { data: product } = await supabase
    .from("stripe_products")
    .select("*, clients!inner(slug, name)")
    .eq("id", productId)
    .eq("clients.slug", clientSlug)
    .eq("active", true)
    .single();

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <Link href={`/store/${clientSlug}`} className="text-sm underline text-slate-700">
            Voltar ao catalogo
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Detalhes do produto</h1>
          <p className="text-sm text-slate-600">
            Compra processada com Stripe Checkout hospedado.
          </p>
        </div>

        <ProductCard
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
          clientSlug={clientSlug}
        />
      </div>
    </main>
  );
}

