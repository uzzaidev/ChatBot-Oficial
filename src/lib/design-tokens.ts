/**
 * Design tokens centralizam espaçamentos, tipografia e estilos recorrentes
 * para a identidade UzzApp. Essa camada garante consistência entre landing,
 * login e futuras páginas públicas.
 */
export const designTokens = {
  container: {
    /**
     * Layouts principais usam largura máxima de 6xl com padding responsivo.
     */
    lg: "mx-auto w-full max-w-6xl px-6",
    md: "mx-auto w-full max-w-4xl px-6",
  },
  spacing: {
    /**
     * Blocos verticais da landing seguem ritmo de 20 / 24 para destacar seções.
     */
    section: "py-20 md:py-24",
    element: "space-y-6",
    stack: "space-y-12 md:space-y-16",
  },
  typography: {
    hero:
      "text-4xl font-bold leading-tight tracking-tight md:text-6xl text-foreground",
    lead:
      "text-lg text-mint-300/80 md:text-xl max-w-2xl mx-auto font-medium leading-relaxed",
    h2: "text-3xl font-semibold tracking-tight md:text-4xl text-foreground",
    h3: "text-xl font-semibold text-foreground",
    body: "text-base text-foreground/80 leading-relaxed",
    badge:
      "inline-flex items-center gap-3 rounded-full border border-mint-500/40 bg-mint-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-mint-300",
  },
  card: {
    base:
      "rounded-3xl border border-border/40 bg-surface/80 p-6 shadow-glow backdrop-blur",
    gradientMint:
      "rounded-3xl border border-mint-500/30 bg-gradient-mint p-6 shadow-glow",
    gradientBlue:
      "rounded-3xl border border-azure-500/30 bg-gradient-blue p-6 shadow-glow-blue",
  },
  button: {
    primary:
      "inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-all hover:-translate-y-[2px] hover:shadow-glow",
    outline:
      "inline-flex items-center justify-center rounded-full border border-mint-500/60 px-6 py-3 text-base font-semibold text-mint-300 transition-all hover:-translate-y-[2px] hover:border-mint-200 hover:text-mint-100",
    glow: "shadow-glow hover:shadow-glow-blue transition-shadow duration-300",
  },
  badge: {
    premium:
      "inline-flex items-center gap-2 rounded-full border border-gold-400/70 bg-gold-400/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-gold-300",
  },
} as const;

export type DesignTokens = typeof designTokens;

