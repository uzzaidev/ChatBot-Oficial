import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-br from-background via-card to-background">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px]" />
      </div>
      <div className={cn(designTokens.container.lg, 'relative z-10 space-y-8 px-6 text-center')}>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Pronto para entrar no UzzApp?
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Faça login para continuar acompanhando as operações ou crie um acesso para a sua equipe.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button
              variant="default"
              size="lg"
              className="rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold px-8 py-6 shadow-lg shadow-primary/30 transition-all hover:scale-105"
            >
              Acessar minha conta
            </Button>
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'lg' }),
              'rounded-lg border-2 border-border bg-muted/50 backdrop-blur-sm text-foreground hover:bg-muted hover:border-border/80 font-semibold px-8 py-6 transition-all'
            )}
          >
            Registrar um novo tenant
          </Link>
        </div>
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground/70 pt-4">
          <span>Precisa de ajuda com convites, billing ou migração?</span>
          <a
            href="mailto:suporte@uzzai.dev"
            className="text-primary transition-colors hover:text-primary/80 font-medium"
          >
            suporte@uzzai.dev
          </a>
        </div>
      </div>
    </section>
  )
}


