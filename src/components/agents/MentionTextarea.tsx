"use client";

import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { findBrokenDocumentReferences } from "@/lib/prompt-document-refs";
import { AlertTriangle, FileText, Loader2 } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

interface DocumentOption {
  filename: string;
  documentType: string;
}

const MAX_SUGGESTIONS = 8;

// Matches an in-progress "@query" run immediately before the caret — the
// query itself can contain spaces/dots/dashes (real filenames have all of
// these) but not another "@" or a newline, so typing a second "@" or
// pressing enter/space-then-more-text closes the previous mention cleanly.
const TRIGGER_PATTERN = /@([^@\n]*)$/;

export interface MentionTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

/**
 * Drop-in replacement for <Textarea> that adds "@" autocomplete over the
 * client's knowledge-base documents, inserting `@[filename]` tokens that
 * `compileSystemPrompt` resolves to the exact filename at prompt-compile
 * time (see prompt-document-refs.ts). Fixes the class of bug where a
 * hand-typed filename in a prompt field drifts from what's actually stored
 * (e.g. "Horarios Umana.jpeg" typed vs "Horario Umana.jpeg" uploaded) —
 * the tool call to buscar_documento silently finds nothing.
 *
 * Also surfaces already-inserted references that no longer match any
 * document (renamed or deleted after the mention was created) as a warning
 * below the field, so a stale reference gets noticed instead of silently
 * shipping to production.
 */
export const MentionTextarea = forwardRef<
  HTMLTextAreaElement,
  MentionTextareaProps
>(({ id, value, onChange, placeholder, rows = 4, className }, forwardedRef) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => textareaRef.current as HTMLTextAreaElement);

  const [documents, setDocuments] = useState<DocumentOption[] | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [menu, setMenu] = useState<{ start: number; query: string } | null>(
    null,
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const ensureDocumentsLoaded = async () => {
    if (documents !== null || loadingDocuments) return;
    setLoadingDocuments(true);
    try {
      const res = await apiFetch("/api/documents?limit=200");
      if (!res.ok) throw new Error("Failed to load documents");
      const json = (await res.json()) as {
        documents?: Array<{ filename: string; documentType: string }>;
      };
      setDocuments(
        (json.documents ?? []).map((d) => ({
          filename: d.filename,
          documentType: d.documentType,
        })),
      );
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!menu || !documents) return [];
    const q = menu.query.trim().toLowerCase();
    const list = q
      ? documents.filter((d) => d.filename.toLowerCase().includes(q))
      : documents;
    return list.slice(0, MAX_SUGGESTIONS);
  }, [menu, documents]);

  useEffect(() => {
    setActiveIndex(0);
  }, [menu?.query]);

  const closeMenu = () => setMenu(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    onChange(nextValue);

    const caret = e.target.selectionStart ?? nextValue.length;
    const match = TRIGGER_PATTERN.exec(nextValue.slice(0, caret));
    if (match) {
      void ensureDocumentsLoaded();
      setMenu({ start: caret - match[0].length, query: match[1] });
    } else {
      closeMenu();
    }
  };

  const insertMention = (filename: string) => {
    if (!menu) return;
    const before = value.slice(0, menu.start);
    const after = value.slice(menu.start + 1 + menu.query.length);
    const token = `@[${filename}]`;
    const nextValue = `${before}${token} ${after}`;
    onChange(nextValue);
    closeMenu();

    const caretPos = before.length + token.length + 1;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caretPos, caretPos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!menu || filteredOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (i) => (i - 1 + filteredOptions.length) % filteredOptions.length,
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertMention(filteredOptions[activeIndex].filename);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    }
  };

  const brokenReferences = useMemo(() => {
    if (!documents) return [];
    return findBrokenDocumentReferences(
      value,
      documents.map((d) => d.filename),
    );
  }, [value, documents]);

  return (
    <div className="relative">
      <Textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Re-check for an in-progress "@query" right where the cursor
          // landed (e.g. tabbing back into the field).
          const el = textareaRef.current;
          if (!el) return;
          const caret = el.selectionStart ?? value.length;
          const match = TRIGGER_PATTERN.exec(value.slice(0, caret));
          if (match) {
            void ensureDocumentsLoaded();
            setMenu({ start: caret - match[0].length, query: match[1] });
          }
        }}
        onBlur={() => {
          // Delay so a click on a dropdown option registers before we close it.
          window.setTimeout(closeMenu, 150);
        }}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {menu && (
        <div className="absolute z-50 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loadingDocuments ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Carregando documentos...
            </div>
          ) : filteredOptions.length > 0 ? (
            <div className="max-h-48 overflow-y-auto py-1">
              {filteredOptions.map((doc, idx) => (
                <button
                  key={doc.filename}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertMention(doc.filename)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted ${
                    idx === activeIndex ? "bg-muted" : ""
                  }`}
                >
                  <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{doc.filename}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Nenhum documento encontrado.
            </div>
          )}
        </div>
      )}

      {brokenReferences.length > 0 && (
        <p className="mt-1 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          Referência(s) não encontrada(s) na base de conhecimento:{" "}
          {brokenReferences.join(", ")} — o agente não vai conseguir enviar
          {brokenReferences.length > 1 ? " esses arquivos" : " esse arquivo"}.
        </p>
      )}
    </div>
  );
});

MentionTextarea.displayName = "MentionTextarea";
