"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { isNativeCompanionApp } from "@/lib/nativeAppCompliance";
import { Smartphone } from "lucide-react";
import Link from "next/link";

export type NativeCompanionGateVariant =
  | "registration"
  | "subscription"
  | "pricing";

const GATE_COPY: Record<
  NativeCompanionGateVariant,
  { title: string; description: string; footnote?: string }
> = {
  registration: {
    title: "Acesso para contas existentes",
    description:
      "O app UzzApp é um cliente de gestão para equipes que já possuem conta na plataforma. A criação de novas contas e organizações não está disponível neste aplicativo.",
    footnote:
      "Se você foi convidado por um administrador, use o link de convite recebido por e-mail.",
  },
  subscription: {
    title: "Assinatura não ativa",
    description:
      "Esta conta não possui uma assinatura ativa no momento. Entre em contato com o administrador da sua organização ou com o suporte Uzz.Ai para regularizar o acesso.",
    footnote:
      "O gerenciamento de planos e pagamentos é realizado fora deste aplicativo.",
  },
  pricing: {
    title: "Planos e preços",
    description:
      "Informações comerciais e contratação de planos não estão disponíveis no app mobile. Use o app apenas para gerenciar uma conta já existente.",
  },
};

type NativeCompanionGateProps = {
  variant: NativeCompanionGateVariant;
};

/**
 * Full-screen notice shown on native instead of registration, checkout, or pricing flows.
 */
export const NativeCompanionGate = ({ variant }: NativeCompanionGateProps) => {
  const copy = GATE_COPY[variant];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-card to-background px-4 py-10">
      <div className="bg-card/80 backdrop-blur-sm p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-md border border-border text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-7 w-7 text-primary" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          {copy.title}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4">
          {copy.description}
        </p>
        {copy.footnote && (
          <p className="text-xs text-muted-foreground/80 mb-6">
            {copy.footnote}
          </p>
        )}
        <Button asChild className="w-full">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    </div>
  );
};

/**
 * Returns gate UI on native, otherwise null so the page renders normally.
 */
export const nativeCompanionGateOrNull = (
  variant: NativeCompanionGateVariant,
): ReactNode | null => {
  if (!isNativeCompanionApp()) return null;
  return <NativeCompanionGate variant={variant} />;
};
