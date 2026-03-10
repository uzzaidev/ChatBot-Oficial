import { Card } from '@/components/ui/card'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const features = [
  'Chatbot com IA (Llama 3.3 70B / GPT-4o)',
  'WhatsApp Business API integrado',
  'Painel de atendimento em tempo real',
  'Base de conhecimento (RAG) com PDF/TXT',
  'Handoff humano automático',
  'Histórico completo de conversas',
  'Multi-usuários com controle de acesso (RBAC)',
  'Suporte técnico por e-mail e WhatsApp',
  '99% de uptime (SLA)',
  'Sem limite de mensagens processadas',
]

export function Plans() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className={cn(designTokens.container.lg, 'px-6')}>
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tudo incluído. Sem surpresas.
          </h2>
          <p className="text-lg text-muted-foreground">
            Um único plano com acesso completo a todas as funcionalidades da plataforma.
          </p>
        </div>

        <div className="flex justify-center">
          <Card className="relative flex flex-col border-2 border-primary/60 bg-card/50 backdrop-blur-sm p-10 shadow-xl shadow-primary/20 max-w-lg w-full transition-all hover:scale-[1.01]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/70 bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
              Plano único
            </span>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-foreground mb-6">UzzApp</h3>
              <div className="flex items-end justify-center gap-1 mb-1">
                <span className="text-lg text-muted-foreground font-medium">R$</span>
                <span className="text-6xl font-extrabold text-foreground leading-none">249</span>
                <span className="text-3xl font-extrabold text-foreground leading-none">,90</span>
                <span className="text-muted-foreground mb-1">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                + Setup único de <strong className="text-foreground">R$ 1.000,00</strong> na ativação
              </p>
            </div>

            <ul className="space-y-3 text-sm text-muted-foreground mb-8">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="mt-0.5 text-primary font-bold flex-shrink-0">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="pt-6 border-t border-border">
              <Link
                href="/register"
                className="w-full rounded-lg font-semibold py-3 px-6 text-center transition-all block bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105"
              >
                Contratar agora
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-3">
                O setup é cobrado uma única vez na ativação da conta.
              </p>
            </div>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Link href="/precos" className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">
            Ver detalhes do plano e FAQ →
          </Link>
        </div>
      </div>
    </section>
  )
}
