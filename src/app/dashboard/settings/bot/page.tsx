"use client";

/**
 * Bot Configurations Page
 *
 * Página dedicada para configurações de comportamento do bot:
 * - Prompts de continuidade
 * - Regras de comportamento
 * - Limites e thresholds
 * - Personalidade
 */

import BotConfigurationManager from "@/components/BotConfigurationManager";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";
import Link from "next/link";

export default function BotConfigurationsPage() {
  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header com navegação */}
      <div className="mb-6">
        <Link href="/dashboard/settings">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Configurações
          </Button>
        </Link>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Bot className="w-9 h-9 text-purple-500" />
            <h1 className="text-4xl font-poppins font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Configurações do Bot
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Personalize prompts, regras, limites e personalidade do seu
            assistente
          </p>
        </div>
      </div>

      {/* Bot Configuration Manager Component */}
      <BotConfigurationManager />
    </div>
  );
}
