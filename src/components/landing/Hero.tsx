import { Button, buttonVariants } from '@/components/ui/button'
import { designTokens } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 bg-gradient-to-br from-background via-card to-background">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px]" />
      </div>

      <div
        className={cn(
          designTokens.container.lg,
          'relative z-10 flex flex-col items-center gap-8 md:gap-12 px-6 text-center'
        )}
      >
        {/* Badge */}
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-sm">
          Portal UzzApp
        </span>

        {/* Main heading */}
        <div className="max-w-4xl space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Entre no painel UzzApp e acompanhe seus atendimentos em{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              tempo real
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Acesse o dashboard seguro do seu time, configure fluxos e mantenha o canal WhatsApp sob
            controle com a nossa inteligência multiagente.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button
              variant="default"
              size="lg"
              className="rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold px-8 py-6 shadow-lg shadow-primary/30 transition-all hover:scale-105"
            >
              Fazer login
            </Button>
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'rounded-lg border-2 border-border bg-muted/50 backdrop-blur-sm text-foreground hover:bg-muted hover:border-border/80 font-semibold px-8 py-6 transition-all'
            )}
          >
            Criar conta para meu time
          </Link>
        </div>

        {/* Helper text */}
        <p className="text-sm text-muted-foreground/70 max-w-xl">
          Não recebeu o convite? Peça ao administrador para adicioná-lo em{' '}
          <strong className="text-primary">Configurações &gt; Usuários</strong>.
        </p>
      </div>
    </section>
  )
}

