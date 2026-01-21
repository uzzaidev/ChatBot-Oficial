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
    <section className="py-20 md:py-28 bg-[#0f1419]">
      <div className={cn(designTokens.container.lg, designTokens.spacing.stack, 'px-6')}>
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo o que você precisa em um único lugar
          </h2>
          <p className="text-lg text-white/70">
            O portal foi desenhado para administradores e operadores terem controle total do canal.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card
              key={title}
              className="flex h-full flex-col gap-4 border border-white/10 bg-[#1a1f26]/50 backdrop-blur-sm hover:border-[#1ABC9C]/50 transition-all p-6 shadow-lg hover:shadow-[#1ABC9C]/20"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#1ABC9C]/20 to-[#2E86AB]/20 flex items-center justify-center">
                <Icon className="h-6 w-6 text-[#1ABC9C]" aria-hidden />
              </div>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

