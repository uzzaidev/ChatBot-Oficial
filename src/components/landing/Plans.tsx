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
    <section className="bg-[#0f1419] py-20 md:py-28">
      <div className={cn(designTokens.container.lg, designTokens.spacing.stack, 'px-6')}>
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planos preparados para cada estágio
          </h2>
          <p className="text-lg text-white/70">
            Escolha o plano ideal para o seu time e evolua sem migrar de plataforma.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'relative flex h-full flex-col border bg-[#1a1f26]/50 backdrop-blur-sm p-8 transition-all hover:scale-[1.02]',
                plan.highlighted 
                  ? 'border-[#1ABC9C]/60 shadow-lg shadow-[#1ABC9C]/20' 
                  : 'border-white/10 hover:border-white/20 shadow-lg'
              )}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[#1ABC9C]/70 bg-gradient-to-r from-[#1ABC9C]/20 to-[#2E86AB]/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-[#1ABC9C] backdrop-blur-sm">
                  Mais procurado
                </span>
              )}

              <div className="space-y-4 text-left">
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{plan.description}</p>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-white/70">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-[#1ABC9C] flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-white/10">
                <Link
                  href={`/register?plan=${plan.id}`}
                  className={cn(
                    'w-full rounded-lg font-semibold py-3 px-6 text-center transition-all block',
                    plan.highlighted 
                      ? 'bg-gradient-to-r from-[#1ABC9C] to-[#16a085] hover:from-[#16a085] hover:to-[#1ABC9C] text-white shadow-lg shadow-[#1ABC9C]/30 hover:scale-105' 
                      : 'bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30'
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


