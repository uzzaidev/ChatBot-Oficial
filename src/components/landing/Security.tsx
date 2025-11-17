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
    <section className="bg-ink-900/95 py-20">
      <div className={cn(designTokens.container.lg, 'grid gap-12 px-6 lg:grid-cols-[1.1fr,0.9fr]')}>
        <div className="space-y-6">
          <h2 className={designTokens.typography.h2}>Segurança e governança integradas</h2>
          <p className={designTokens.typography.body}>
            O UzzApp foi desenhado para ser um SaaS multi-tenant seguro desde o primeiro acesso. Cada
            camada reforça compliance, rastreabilidade e confiabilidade operacional.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {securityItems.map(({ title, description, icon: Icon }, idx) => {
              const headingId = `security-title-${idx}`;
              return (
                <Card
                  key={title}
                  className="flex h-full flex-col gap-2 border border-azure-500/20 bg-surface/80 p-4 shadow-glow"
                  aria-labelledby={headingId}
                >
                  <Icon className="h-5 w-5 text-mint-200" aria-hidden />
                  <h3 id={headingId} className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-foreground/70">{description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="flex flex-col gap-4 border border-mint-500/20 bg-surface/80 p-6 shadow-glow">
          <h3 className="text-lg font-semibold text-foreground">Checklist de implementação</h3>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li>• Configurar variáveis de ambiente com as chaves do Supabase.</li>
            <li>• Executar as migrations em <code>supabase/migrations</code>.</li>
            <li>• Revisar convites de usuários e roles no painel de admin.</li>
            <li>• Ativar monitoramento via dashboard para métricas de uso.</li>
          </ul>
        </Card>
      </div>
    </section>
  )
}
