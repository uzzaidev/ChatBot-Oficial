/**
 * Document references inside agent prompt fields.
 *
 * Free-text prompt fields (Regras de Resposta, Política de Escalação, etc.)
 * often need to name an exact file for `buscar_documento` to find — and a
 * hand-typed filename that drifts from what's actually in the knowledge base
 * silently breaks the tool call (this bit a real tenant: "Horarios Umana.jpeg"
 * typed in the prompt vs "Horario Umana.jpeg" actually stored).
 *
 * The fix: editors reference files via `@[filename]` — inserted through an
 * autocomplete (see MentionTextarea.tsx) so the filename can't be mistyped.
 *
 * Resolution is intentionally a pure text transform with NO database lookup:
 * `compileSystemPrompt` runs on every chatbot message and must stay
 * synchronous and fast. Existence validation (is this filename still in the
 * knowledge base?) happens only in the editor, where the document list is
 * already being fetched for the autocomplete dropdown — see
 * `findBrokenDocumentReferences` below, used client-side only.
 */

export const DOCUMENT_REFERENCE_PATTERN = /@\[([^\]]+)\]/g;

/**
 * Unique filenames referenced via `@[filename]` in a piece of prompt text.
 */
export const extractDocumentReferences = (text: string): string[] => {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(DOCUMENT_REFERENCE_PATTERN)) {
    found.add(match[1]);
  }
  return Array.from(found);
};

/**
 * Compiles `@[filename]` markers down to a plain quoted filename — the same
 * shape a human would have typed by hand (`arquivo "Horario Umana.jpeg"`).
 * Pure and synchronous: safe to call on every prompt compilation.
 */
export const resolveDocumentReferences = (text: string): string => {
  if (!text) return text;
  return text.replace(DOCUMENT_REFERENCE_PATTERN, (_match, filename: string) => `"${filename}"`);
};

/**
 * References that don't match any filename currently in the knowledge base.
 * Client-side only (needs the live document list) — used to warn an editor
 * before a stale reference ever reaches production.
 */
export const findBrokenDocumentReferences = (
  text: string,
  knownFilenames: Iterable<string>,
): string[] => {
  const known = new Set(knownFilenames);
  return extractDocumentReferences(text).filter((filename) => !known.has(filename));
};
