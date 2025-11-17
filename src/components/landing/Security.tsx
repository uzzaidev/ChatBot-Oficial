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
    <section className="bg-white py-20 border-t border-silver-200">
      <div className={cn(designTokens.container.lg, 'px-6')}>
        <div className="space-y-6 text-center max-w-3xl mx-auto mb-12">
          <h2 className={cn(designTokens.typography.h2, "text-erie-black-900")}>Segurança e governança integradas</h2>
          <p className={cn(designTokens.typography.body, "text-erie-black-700")}>
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
                className="flex h-full flex-col gap-3 border border-brand-blue-300/30 bg-white hover:border-brand-blue-400/50 transition-all p-6 shadow-md hover:shadow-glow-blue"
                aria-labelledby={headingId}
              >
                <Icon className="h-6 w-6 text-brand-blue-600" aria-hidden />
                <h3 id={headingId} className="text-base font-semibold text-erie-black-900">{title}</h3>
                <p className="text-sm text-erie-black-600">{description}</p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  )
}
