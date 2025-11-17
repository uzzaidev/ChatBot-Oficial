import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="absolute inset-0 -z-10 bg-gradient-mint opacity-40 blur-[160px]" />
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-1/3 bg-gradient-to-bl from-brand-blue-500/20 to-transparent blur-[200px] lg:block" />

      <div
        className={cn(
          designTokens.container.lg,
          'relative z-10 flex flex-col items-center gap-10 px-6 text-center'
        )}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-mint-400/50 bg-mint-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-mint-200 shadow-glow">
          Portal UzzApp
        </span>

        <div className="max-w-3xl space-y-6">
          <h1 className={cn(designTokens.typography.hero, "text-white")}>
            Entre no painel UzzApp e acompanhe seus atendimentos em tempo real.
          </h1>
          <p className={cn(designTokens.typography.lead, "text-silver-300")}>
            Acesse o dashboard seguro do seu time, configure fluxos e mantenha o canal WhatsApp sob
            controle com a nossa inteligência multiagente.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button variant="default" size="lg" className="rounded-full bg-mint-500 hover:bg-mint-600 shadow-glow">
              Fazer login
            </Button>
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-full border-silver-300 text-silver-200 hover:bg-silver-200/10')}
          >
            Criar conta para meu time
          </Link>
        </div>

        <p className="text-sm text-silver-400">
          Não recebeu o convite? Peça ao administrador para adicioná-lo em <strong className="text-mint-400">Configurações &gt;
          Usuários</strong>.
        </p>
      </div>
    </section>
  )
}

