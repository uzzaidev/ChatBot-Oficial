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
      <div className={cn(designTokens.container.lg, 'grid gap-12 px-6 lg:grid-cols-[1.1fr,0.9fr]')}>
        <div className="space-y-6">
          <h2 className={cn(designTokens.typography.h2, "text-erie-black-900")}>Segurança e governança integradas</h2>
          <p className={cn(designTokens.typography.body, "text-erie-black-700")}>
            O UzzApp foi desenhado para ser um SaaS multi-tenant seguro desde o primeiro acesso. Cada
            camada reforça compliance, rastreabilidade e confiabilidade operacional.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {securityItems.map(({ title, description, icon: Icon }, idx) => {
              const headingId = `security-title-${idx}`;
              return (
                <Card
                  key={title}
                  className="flex h-full flex-col gap-2 border border-brand-blue-300/30 bg-white hover:border-brand-blue-400/50 transition-all p-4 shadow-md hover:shadow-glow-blue"
                  aria-labelledby={headingId}
                >
                  <Icon className="h-5 w-5 text-brand-blue-600" aria-hidden />
                  <h3 id={headingId} className="text-sm font-semibold text-erie-black-900">{title}</h3>
                  <p className="text-sm text-erie-black-600">{description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="flex flex-col gap-4 border border-mint-300/30 bg-mint-50/50 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-erie-black-900">Checklist de implementação</h3>
          <ul className="space-y-3 text-sm text-erie-black-700">
            <li className="flex items-start gap-2">
              <span className="text-mint-600 font-bold">•</span>
              <span>Configurar variáveis de ambiente com as chaves do Supabase.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-mint-600 font-bold">•</span>
              <span>Executar as migrations em <code className="bg-erie-black-100 px-1 rounded text-xs">supabase/migrations</code>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-mint-600 font-bold">•</span>
              <span>Revisar convites de usuários e roles no painel de admin.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-mint-600 font-bold">•</span>
              <span>Ativar monitoramento via dashboard para métricas de uso.</span>
            </li>
          </ul>
        </Card>
      </div>
    </section>
  )
}
