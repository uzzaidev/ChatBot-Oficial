import { ShieldCheck, LockKeyhole, Server, Activity } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const securityItems = [
  {
    title: 'Autenticação Supabase',
    description: 'Tokens curtos, refresh automático e suporte a OAuth (Google/Microsoft).',
    icon: LockKeyhole,
  },
  {
    title: 'Isolamento por tenant',
    description: 'Row Level Security garante que cada cliente veja apenas o próprio ambiente.',
    icon: ShieldCheck,
  },
  {
    title: 'Persistência auditável',
    description: 'Logs completos de ações críticas e histórico de conversas sempre disponível.',
    icon: Activity,
  },
  {
    title: 'Infraestrutura gerenciada',
    description: 'Supabase PostgreSQL com backups automáticos e criptografia em repouso.',
    icon: Server,
  },
]

export function Security() {
  return (
    <section className="bg-card py-20 md:py-28 border-t border-border">
      <div className={cn(designTokens.container.lg, 'px-6')}>
        <div className="space-y-6 text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Segurança e governança integradas
          </h2>
          <p className="text-lg text-muted-foreground">
            O UzzApp foi desenhado para ser um SaaS multi-tenant seguro desde o primeiro acesso. Cada
            camada reforça compliance, rastreabilidade e confiabilidade operacional.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {securityItems.map(({ title, description, icon: Icon }, idx) => {
            const headingId = `security-title-${idx}`;
            return (
              <Card
                key={title}
                className="flex h-full flex-col gap-4 border border-border bg-background/50 backdrop-blur-sm hover:border-secondary/50 transition-all p-6 shadow-lg"
                aria-labelledby={headingId}
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-secondary" aria-hidden />
                </div>
                <h3 id={headingId} className="text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  )
}
