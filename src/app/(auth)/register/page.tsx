"use client";

import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleResend = async () => {
    if (!unconfirmedEmail) return;
    setResendLoading(true);
    setResendSuccess(false);
    try {
      const res = await apiFetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unconfirmedEmail }),
      });
      if (res.ok) {
        setResendSuccess(true);
      } else {
        setError("Erro ao reenviar email. Tente novamente.");
      }
    } catch {
      setError("Erro ao reenviar email. Tente novamente.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validação básica
      if (!formData.fullName || !formData.email || !formData.password) {
        setError("Por favor, preencha todos os campos obrigatórios");
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError("A senha deve ter pelo menos 8 caracteres");
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("As senhas não coincidem");
        setLoading(false);
        return;
      }

      // Chamar API de registro
      const response = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          companyName: formData.companyName || formData.fullName,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.unconfirmedExists) {
          setUnconfirmedEmail(data.email ?? formData.email);
          setError(null);
        } else {
          setError(data.error || "Erro ao criar conta");
        }
        setLoading(false);
        return;
      }

      // Handle email confirmation required
      if (data.requiresConfirmation) {
        router.push(
          `/check-email?email=${encodeURIComponent(
            data.email ?? formData.email,
          )}`,
        );
        return;
      }

      // Legacy: If received session (should not happen with new flow, but keep for safety)
      if (data.session) {
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("Erro inesperado ao criar conta. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background relative overflow-hidden py-8">
      {/* Background effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="text-2xl font-bold">
              <span className="text-primary">Uzz</span>
              <span className="text-secondary">.Ai</span>
            </span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Criar Conta
          </h1>
          <p className="text-muted-foreground">
            Registre-se para começar a usar o portal
          </p>
        </div>

        {/* Unconfirmed email — resend prompt */}
        {unconfirmedEmail && !resendSuccess && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-3">
            <p className="text-sm text-yellow-400">
              Você já tentou criar uma conta com{" "}
              <strong>{unconfirmedEmail}</strong> mas não confirmou o email.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-300 font-medium py-2 px-4 rounded-lg text-sm transition-all disabled:opacity-50"
            >
              {resendLoading ? "Enviando..." : "Reenviar email de confirmação"}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Ou{" "}
              <button
                type="button"
                onClick={() => {
                  setUnconfirmedEmail(null);
                  setFormData((f) => ({ ...f, email: "" }));
                }}
                className="text-primary hover:underline"
              >
                use outro email
              </button>
            </p>
          </div>
        )}

        {/* Resend success */}
        {resendSuccess && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400">
              Email reenviado! Verifique sua caixa de entrada (e a pasta de
              spam).
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Nome Completo *
            </label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="Seu nome completo"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Email *
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Telefone (opcional)
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>

          {/* Company Name */}
          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Nome da Empresa (opcional)
            </label>
            <input
              id="companyName"
              type="text"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="Minha Empresa"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Senha *
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground/60 mt-1">
              Mínimo 8 caracteres
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Confirmar Senha *
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              disabled={loading}
              className="w-full px-4 py-3 bg-background/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-muted/30 disabled:cursor-not-allowed transition-all"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30 hover:scale-[1.02] mt-6"
          >
            {loading ? "Criando conta..." : "Criar Conta"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
            >
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
