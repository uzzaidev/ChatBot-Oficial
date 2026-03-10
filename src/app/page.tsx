import { FinalCTA } from "@/components/landing/FinalCTA";
import { Hero } from "@/components/landing/Hero";
import { Highlights } from "@/components/landing/Highlights";
import { Plans } from "@/components/landing/Plans";
import { Security } from "@/components/landing/Security";
import Link from "next/link";

/**
 * Landing Page - Shows UzzApp portal introduction before login
 *
 * This is a simple static page that introduces the platform.
 * Users can navigate to /login or /register from here.
 */
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Highlights />
      <Plans />
      <Security />
      <FinalCTA />
      <footer className="border-t border-border bg-muted/30 py-6">
        <div className="mx-auto max-w-5xl px-6 flex flex-col items-center gap-3 text-sm text-muted-foreground sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} UzzApp — Todos os direitos reservados.
          </span>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Política de Privacidade
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Termos de Uso
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
