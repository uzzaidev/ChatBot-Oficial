import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { Card } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 'Gratuito',
    description: 'Ideal para validar o fluxo em times pequenos.',
    features: ['1 sessão ativa por mês', 'Histórico de conversas', 'Configuração guiada'],
    cta: 'Começar grátis',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 29/mês',
    description: 'Recomendado para operações comerciais recorrentes.',
    features: [
      'Até 10 sessões mensais',
      'Métricas e relatórios operacionais',
      'Convites ilimitados por tenant',
    ],
    cta: 'Assinar Pro',
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'Sob consulta',
    description: 'Para squads com volume elevado ou múltiplas marcas.',
    features: [
      'Sessões ilimitadas',
      'SLA monitorado e alertas',
      'Suporte dedicado e onboarding assistido',
    ],
    cta: 'Falar com vendas',
  },
]

export function Plans() {
  return (
    <section className="bg-ink-900/90 py-20">
      <div className={cn(designTokens.container.lg, designTokens.spacing.stack, 'px-6')}>
        <div className="space-y-4 text-center">
          <h2 className={designTokens.typography.h2}>Planos preparados para cada estágio</h2>
          <p className={designTokens.typography.body}>
            Escolha o plano ideal para o seu time e evolua sem migrar de plataforma.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'relative flex h-full flex-col border border-mint-500/20 bg-surface/85 p-6 shadow-glow',
                plan.highlighted && 'border-mint-500/40 shadow-glow'
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-gold-400/70 bg-gold-400/20 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-gold-300">
                  Mais procurado
                </span>
              )}

              <div className="space-y-3 text-left">
                <h3 className="text-xl font-semibold text-foreground">{plan.name}</h3>
                <p className="text-3xl font-bold text-mint-200">{plan.price}</p>
                <p className="text-sm text-foreground/70">{plan.description}</p>
              </div>

              <ul className="mt-6 space-y-3 text-sm text-foreground/70">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-mint-300" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={cn(
                    buttonVariants({
                      variant: plan.highlighted ? 'default' : 'outline',
                      size: 'lg',
                    }),
                    'w-full rounded-full'
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}


