"use client";

import { createBrowserClient, updatePassword } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Establish the recovery session from the email link.
  useEffect(() => {
    const supabase = createBrowserClient();

    // Hash/implicit recovery links fire PASSWORD_RECOVERY / SIGNED_IN.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setChecking(false);
      }
    });

    (async () => {
      try {
        // PKCE/direct-redirect links arrive with ?code=... — exchange it.
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch {
            // ignore — handled by getSession below
          }
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setHasSession(!!session);
      } finally {
        setChecking(false);
      }
    })();

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await updatePassword(password);
      if (updateError) {
        setError(
          updateError.message.includes("session")
            ? "Sessão de redefinição expirada. Solicite um novo link."
            : updateError.message,
        );
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1800);
    } catch {
      setError("Erro ao atualizar a senha. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border">
        {checking ? (
          <div className="text-center text-muted-foreground py-8">
            Validando o link de redefini&#231;&#227;o...
          </div>
        ) : done ? (
          <div className="text-center">
            <div className="text-5xl mb-4">&#9989;</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Senha atualizada!
            </h1>
            <p className="text-muted-foreground">
              Redirecionando para o painel...
            </p>
          </div>
        ) : !hasSession ? (
          <div className="text-center">
            <div className="text-5xl mb-4">&#9888;&#65039;</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Link inv&#225;lido ou expirado
            </h1>
            <p className="text-muted-foreground">
              Este link de redefini&#231;&#227;o n&#227;o &#233; mais
              v&#225;lido. Solicite um novo.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-lg transition-all"
            >
              Solicitar novo link
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-2xl font-bold">
                  <span className="text-primary">Uzz</span>
                  <span className="text-secondary">.Ai</span>
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Criar nova senha
              </h1>
              <p className="text-muted-foreground">
                Defina uma nova senha para sua conta.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground/80 mb-2"
                >
                  Nova senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
                  placeholder="M&#237;nimo 8 caracteres"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-foreground/80 mb-2"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:scale-[1.02]"
              >
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
