"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
    buildSystemPromptSegments,
    compileFormatterPrompt,
    compileSystemPrompt,
    type PromptSegment,
    type PromptSegmentSource,
} from "@/lib/prompt-builder";
import type { Agent } from "@/lib/types";
import { Copy, Lock, Pencil } from "lucide-react";
import { useMemo } from "react";

export type AgentEditorTab =
  | "identity"
  | "behavior"
  | "model"
  | "advanced"
  | "test";

interface RawPromptPreviewProps {
  /** Current (possibly unsaved) agent form data. */
  agent: Partial<Agent>;
  /**
   * Called when the user clicks an editable section.
   * Switches the editor to the right tab and focuses the field, when provided.
   */
  onNavigate: (tab: AgentEditorTab, fieldId?: string) => void;
}

/** Rough token estimate (~4 chars/token) for quick budgeting feedback. */
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const xmlWrap = (segment: PromptSegment): string =>
  `<${segment.tag}>\n${segment.content}\n</${segment.tag}>`;

/**
 * Read-only preview of the exact (compiled) system prompt the model receives,
 * including the `<xml>` section markers. Each section is hoverable: editable
 * sections highlight and link back to the field that controls them; fixed
 * system blocks are marked as read-only.
 */
export const RawPromptPreview = ({
  agent,
  onNavigate,
}: RawPromptPreviewProps) => {
  const fullAgent = agent as Agent;

  const segments = useMemo(
    () => buildSystemPromptSegments(fullAgent),
    [fullAgent],
  );
  const systemPrompt = useMemo(
    () => compileSystemPrompt(fullAgent),
    [fullAgent],
  );
  const formatterPrompt = useMemo(
    () => compileFormatterPrompt(fullAgent),
    [fullAgent],
  );

  const totalChars = systemPrompt.length + formatterPrompt.length;
  const totalTokens =
    estimateTokens(systemPrompt) + estimateTokens(formatterPrompt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${systemPrompt}\n\n---\n\n${formatterPrompt}`,
      );
      toast({
        title: "Copiado",
        description: "Prompt final copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Copie manualmente selecionando o texto.",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Header / meta */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Prompt Final (cru)</h3>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Exatamente como o modelo recebe, com os marcadores{" "}
              <code className="font-mono">&lt;sections&gt;</code>. Somente
              leitura — passe o mouse sobre um bloco e clique para editar o
              campo de origem.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {totalChars.toLocaleString("pt-BR")} chars
            </Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              ~{totalTokens.toLocaleString("pt-BR")} tokens
            </Badge>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar
            </Button>
          </div>
        </div>

        {/* System prompt — segmented */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            System Prompt
          </p>
          <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed overflow-auto max-h-[52vh]">
            {segments.map((segment, index) => {
              const block = xmlWrap(segment);
              const source = segment.source;
              const isEditable = source.editable;
              const editableSource = isEditable
                ? (source as Extract<PromptSegmentSource, { editable: true }>)
                : null;
              const fixedSource = isEditable
                ? null
                : (source as Extract<PromptSegmentSource, { editable: false }>);
              const handleNavigate = editableSource
                ? () => onNavigate(editableSource.tab, editableSource.fieldId)
                : undefined;
              const tooltip = editableSource ? (
                <span className="text-xs">
                  Editar em: <strong>{editableSource.label}</strong>
                </span>
              ) : (
                <span className="text-xs">
                  <strong>{fixedSource!.label}.</strong> {fixedSource!.reason}
                </span>
              );

              const content = (
                <div
                  className={`group relative whitespace-pre-wrap rounded-md px-2 py-1 transition-colors ${
                    isEditable
                      ? "cursor-pointer hover:bg-primary/10 hover:ring-1 hover:ring-primary/40"
                      : "cursor-default bg-amber-500/5 hover:bg-amber-500/10"
                  }`}
                  onClick={handleNavigate}
                  role={isEditable ? "button" : undefined}
                  tabIndex={isEditable ? 0 : undefined}
                  onKeyDown={
                    handleNavigate
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleNavigate();
                          }
                        }
                      : undefined
                  }
                >
                  <span
                    className={`pointer-events-none absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                      isEditable ? "text-primary" : "text-amber-600"
                    }`}
                  >
                    {isEditable ? (
                      <Pencil className="w-3.5 h-3.5" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </span>
                  {block}
                </div>
              );

              return (
                <Tooltip key={`${segment.tag}-${index}`}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Formatter prompt */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Formatter Prompt
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="group relative cursor-pointer whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed transition-colors hover:bg-primary/10 hover:ring-1 hover:ring-primary/40"
                role="button"
                tabIndex={0}
                onClick={() =>
                  onNavigate("identity", "agent-field-communication_style")
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigate("identity", "agent-field-communication_style");
                  }
                }}
              >
                <span className="pointer-events-none absolute right-1 top-1 text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  <Pencil className="w-3.5 h-3.5" />
                </span>
                {formatterPrompt}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <span className="text-xs">
                Editar em:{" "}
                <strong>Identidade → Tom, Estilo, Tamanho e Emojis</strong>
              </span>
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Observação: blocos dinâmicos de runtime (histórico da conversa,
          contexto RAG recuperado, data/hora e regras de formatação do WhatsApp)
          são adicionados no momento do envio e não aparecem neste preview
          estático.
        </p>
      </div>
    </TooltipProvider>
  );
};
