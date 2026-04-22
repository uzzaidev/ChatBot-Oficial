# Mapa RAG - Umana Rio Branco

Este documento organiza as fontes de conhecimento da Umana Rio Branco para reduzir tamanho do system prompt e melhorar consistencia.

## Objetivo

- Manter fatos operacionais fora do prompt principal.
- Usar RAG para horarios, planos, equipe, localizacao e FAQ.
- Evitar duplicacao de verdade (prompt vs documentos).

## Documentos da base

1. `01_UMANA_IDENTIDADE_E_FILOSOFIA.md`
2. `02_UMANA_HORARIOS_E_AULAS_RIO_BRANCO.md`
3. `03_UMANA_PLANOS_E_VALORES.md`
4. `04_UMANA_PROFESSORES_EQUIPE.md`
5. `05_UMANA_LOCALIZACAO_E_CONTATO.md`
6. `06_UMANA_FAQ_ATENDIMENTO.md`

## Regras de uso

- Para pergunta factual, priorizar RAG antes de responder.
- Se o usuario pedir grade completa de horarios ou tabela de planos, usar ferramenta de documento.
- Se houver conflito entre memoria do agente e RAG, priorizar RAG.
- Se RAG nao trouxer confianca suficiente, responder com transparencia e oferecer equipe humana.

## Palavras-chave recomendadas para busca semantica

- Horarios: "horarios", "grade", "aulas", "professor", "turno", "manha", "tarde", "noite"
- Valores: "valores", "planos", "mensalidade", "preco", "quanto custa", "online"
- Equipe: "professores", "instrutores", "quem da aula", "Carlos", "Naiana", "Julia"
- Contato: "endereco", "telefone", "email", "site", "localizacao", "Rio Branco"
- Filosofia: "o que e", "estilo de vida", "beneficios", "autoconhecimento"

