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

interface StorefrontPageProps {
  params: Promise<{
    clientSlug: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { clientSlug } = await params;
  const supabase = createServiceClient() as any;

  const { data: client } = await supabase
    .from("clients")
    .select("id, name, slug")
    .eq("slug", clientSlug)
    .single();

  if (!client) {
    notFound();
  }

  const { data: products } = await supabase
    .from("stripe_products")
    .select("*")
    .eq("client_id", client.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{client.name}</h1>
          <p className="text-sm text-slate-600">
            Storefront publico para compra de produtos via Stripe Checkout.
          </p>
          <p className="text-xs text-slate-500">
            Nota tecnica: em producao, prefira um identificador publico dedicado no lugar de slug.
          </p>
        </header>

        {!products || products.length === 0 ? (
          <div className="rounded-md border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-600">Nenhum produto disponivel no momento.</p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product: any) => (
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
                clientSlug={clientSlug}
              />
            ))}
          </section>
        )}

        <footer>
          <Link href="/" className="text-sm underline text-slate-700">
            Voltar para o site
          </Link>
        </footer>
      </div>
    </main>
  );
}

