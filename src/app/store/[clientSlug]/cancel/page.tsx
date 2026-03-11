// @stripe-module
// Este arquivo pertence ao modulo de pagamentos Stripe.
// Para extrair para repositorio proprio, copiar:
//   src/lib/stripe.ts, src/lib/stripe-connect.ts
//   src/app/api/stripe/
//   src/app/dashboard/payments/
//   src/app/store/
//   src/components/Stripe*.tsx, ProductCard.tsx, ProductForm.tsx, SubscriptionsList.tsx

import Link from "next/link";

interface CancelPageProps {
  params: Promise<{ clientSlug: string }>;
}

export const dynamic = "force-dynamic";

export default async function CheckoutCancelPage({ params }: CancelPageProps) {
  const { clientSlug } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white px-6 py-10">
      <div className="max-w-xl mx-auto bg-white border rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-amber-700">Pagamento cancelado</h1>
        <p className="text-sm text-slate-700">
          O checkout foi cancelado. Nenhuma cobranca foi finalizada.
        </p>
        <div className="flex gap-2">
          <Link href={`/store/${clientSlug}`} className="underline text-sm">
            Voltar para o catalogo
          </Link>
          <Link href="/" className="underline text-sm">
            Ir para a home
          </Link>
        </div>
      </div>
    </main>
  );
}

