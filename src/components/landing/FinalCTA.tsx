import Link from 'next/link'
import { designTokens } from '@/lib/design-tokens'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 -z-10 bg-gradient-blue opacity-70 blur-[200px]" />
      <div className={cn(designTokens.container.lg, 'relative z-10 space-y-8 px-6 text-center')}>
        <h2 className={designTokens.typography.h2}>Pronto para entrar no UzzApp?</h2>
        <p className={designTokens.typography.body}>
          Faça login para continuar acompanhando as operações ou crie um acesso para a sua equipe.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button variant="default" size="lg" className="rounded-full">
              Acessar minha conta
            </Button>
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'rounded-full')}
          >
            Registrar um novo tenant
          </Link>
        </div>
        <div className="flex flex-col items-center gap-2 text-sm text-foreground/70">
          <span>Precisa de ajuda com convites, billing ou migração?</span>
          <a
            href="mailto:suporte@uzzai.dev"
            className="text-mint-300 transition-colors hover:text-mint-200"
          >
            suporte@uzzai.dev
          </a>
        </div>
      </div>
    </section>
  )
}


