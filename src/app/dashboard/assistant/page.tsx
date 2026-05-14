"use client";

import { AssistantInterface } from "@/components/assistant/AssistantInterface";
import { Sparkles } from "lucide-react";

export default function AssistantPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Minimal header */}
      <header className="flex h-12 flex-shrink-0 items-center gap-2.5 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-uzz-mint/10 text-uzz-mint">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground">
            Assistente IA
          </h1>
          <p className="text-[10px] text-muted-foreground leading-none">
            Analise dados dos seus clientes em linguagem natural
          </p>
        </div>
      </header>

      {/* Full-height chat area */}
      <main className="min-h-0 flex-1 overflow-hidden">
        <AssistantInterface />
      </main>
    </div>
  );
}
