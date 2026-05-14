"use client";

import { cn } from "@/lib/utils";
import { Send, Square } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

interface AssistantInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function AssistantInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}: AssistantInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      const textarea = e.target;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 144)}px`;
    },
    [],
  );

  return (
    <div className="border-t border-border/50 bg-background p-3">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-uzz-mint/50">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre os dados dos seus clientes..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          style={{ maxHeight: "144px" }}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-colors hover:bg-red-500/20"
            title="Parar"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors",
              value.trim() && !disabled
                ? "bg-uzz-mint text-white hover:bg-uzz-mint/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
            title="Enviar (Enter)"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="mt-1.5 text-center text-[10px] text-muted-foreground/50">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  );
}
