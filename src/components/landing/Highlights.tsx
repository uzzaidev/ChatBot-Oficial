import { KeyRound, Users, BarChart3, ShieldCheck } from 'lucide-react'
import { designTokens } from '@/lib/design-tokens'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const highlights = [
  {
    title: 'Acompanhamento em tempo real',
    description: 'Monitore conversas, filas e indicadores operacionais em tempo real. Transparência total do fluxo de atendimento.',
    icon: BarChart3,
  },
  {
    title: 'Agentes customizáveis por conta',
    description: 'Configure inteligência artificial personalizada para cada cliente com contexto e comportamento específicos.',
    icon: Users,
  },
  {
    title: 'Segurança e transparência',
    description: 'Supabase Auth, RLS e auditoria completa. Cada ação rastreada para máxima confiabilidade.',
    icon: ShieldCheck,
  },
  {
    title: 'Controle granular de acesso',
    description: 'Convide colaboradores e defina permissões específicas. Isolamento multi-tenant garantido.',
    icon: KeyRound,
  },
]

export function Highlights() {
  return (
    <section className="py-20 bg-white">
      <div className={cn(designTokens.container.lg, designTokens.spacing.stack, 'px-6')}>
        <div className="space-y-4 text-center">
          <h2 className={cn(designTokens.typography.h2, "text-erie-black-900")}>Tudo o que você precisa em um único lugar</h2>
          <p className={cn(designTokens.typography.body, "text-erie-black-700")}>
            O portal foi desenhado para administradores e operadores terem controle total do canal.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="flex h-full flex-col gap-3 border border-mint-300/30 bg-white hover:border-mint-400/50 transition-all p-6 shadow-lg hover:shadow-glow"
            >
              <Icon className="h-6 w-6 text-mint-600" aria-hidden />
              <h3 className="text-lg font-semibold text-erie-black-900">{title}</h3>
              <p className="text-sm text-erie-black-600">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

