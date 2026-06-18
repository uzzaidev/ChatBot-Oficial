"use client";

import { resetPasswordForEmail } from "@/lib/supabase-browser";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Informe seu email.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await resetPasswordForEmail(email.trim());
      // Não revelamos se o email existe ou não (boa prática de segurança):
      // mostramos sucesso genérico mesmo em alguns erros não-críticos.
      if (
        resetError &&
        !resetError.message.toLowerCase().includes("user not found")
      ) {
        setError(
          "Não foi possível enviar o email agora. Tente novamente em instantes.",
        );
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
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
        {sent ? (
          <div className="text-center">
            <div className="text-5xl mb-4">&#128231;</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Verifique seu email
            </h1>
            <p className="text-muted-foreground">
              Se existir uma conta com{" "}
              <span className="text-foreground font-medium">{email}</span>,
              enviamos um link para redefinir a senha. O link expira em pouco
              tempo.
            </p>
            <p className="mt-4 text-xs text-muted-foreground/60">
              N&#227;o encontrou? Verifique a pasta de spam.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
            >
              Voltar para o login
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
                Esqueceu a senha?
              </h1>
              <p className="text-muted-foreground">
                Informe seu email e enviaremos um link para criar uma nova
                senha.
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
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground/80 mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:scale-[1.02]"
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                href="/login"
                className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
              >
                Voltar para o login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
