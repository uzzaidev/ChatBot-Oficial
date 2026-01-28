import { Card } from '@/components/ui/card'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const plans = [
  {
    id: 'free',
    name: 'Free',
    description: 'Ideal para validar o fluxo em times pequenos.',
    features: ['1 sessão ativa por mês', 'Histórico de conversas', 'Configuração guiada'],
    cta: 'Começar grátis',
  },
  {
    id: 'pro',
    name: 'Pro',
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
    <section className="bg-background py-20 md:py-28">
      <div className={cn(designTokens.container.lg, designTokens.spacing.stack, 'px-6')}>
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Planos preparados para cada estágio
          </h2>
          <p className="text-lg text-muted-foreground">
            Escolha o plano ideal para o seu time e evolua sem migrar de plataforma.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'relative flex h-full flex-col border bg-card/50 backdrop-blur-sm p-8 transition-all hover:scale-[1.02]',
                plan.highlighted
                  ? 'border-primary/60 shadow-lg shadow-primary/20'
                  : 'border-border hover:border-border/80 shadow-lg'
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/70 bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
                  Mais procurado
                </span>
              )}

              <div className="space-y-4 text-left">
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-border">
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={cn(
                    'w-full rounded-lg font-semibold py-3 px-6 text-center transition-all block',
                    plan.highlighted
                      ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105'
                      : 'bg-muted/50 border border-border text-foreground hover:bg-muted hover:border-border/80'
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


