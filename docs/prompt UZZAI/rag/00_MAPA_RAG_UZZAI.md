# Mapa RAG - UzzAI

Este documento organiza as fontes de conhecimento da UzzAI para reduzir tamanho do system prompt e melhorar consistencia.

## Objetivo

- Manter fatos operacionais fora do prompt principal.
- Usar RAG para produtos, precos, prazos, equipe, contatos e FAQ.
- Melhorar qualidade semantica e reduzir consumo de tokens.

## Documentos da base

1. `01_UZZAI_IDENTIDADE_E_POSICIONAMENTO.md`
2. `02_UZZAPP_PRODUTO_E_FUNCIONALIDADES.md`
3. `03_UZZAI_PLANOS_PRECOS_E_IMPLEMENTACAO.md`
4. `04_UZZAI_OUTRAS_SOLUCOES.md`
5. `05_UZZAI_EQUIPE_E_CONTATOS.md`
6. `06_UZZAI_FAQ_COMERCIAL_E_TECNICO.md`
7. `07_UZZAI_SUPORTE_E_TRIGGERS_BUG.md`
8. `08_UZZAI_ICP_DORES_E_OBJECOES.md`
9. `09_UZZAI_COMERCIAL_POLITICAS_E_LIMITES.md`
10. `10_UZZAI_SUPORTE_OPERACAO_E_TRIAGEM.md`
11. `11_UZZAI_INTEGRACOES_E_INCIDENTES.md`
12. `12_UZZAI_METRICAS_QUALIDADE_E_GOVERNANCA.md`
13. `13_UZZAI_PLAYBOOK_RESPOSTAS_PADRAO_SUPORTE.md`

## Regras de uso

- Para pergunta factual, priorizar RAG antes de responder.
- Se usuario pedir tabela/material completo, usar ferramenta de documento.
- Se houver conflito entre memoria do agente e RAG, priorizar RAG.
- Se RAG nao trouxer confianca suficiente, responder com transparencia e oferecer equipe humana.
- Para incidentes de suporte operacional, usar `07`, `10`, `11` e aplicar linguagem de resposta de `13`.
- Para preco/prazo/SLA, responder com status de oficializacao (`03`, `09`, `12`) e evitar promessa rigida.

## Palavras-chave recomendadas para busca semantica

- UzzApp: "whatsapp", "chatbot", "rag", "groq", "multi-tenant", "transferencia humano"
- Precos: "setup", "mensalidade", "quanto custa", "plano", "sem cobranca por mensagem"
- Implementacao: "go-live", "dias", "treinamento base", "validacao"
- Consultoria: "estrutura operacional", "blueprint", "obsidian", "sprints"
- UzzBuilder: "site", "nextjs", "seo", "landing page"
- Convoca: "pelada", "sorteio times", "split pix", "ranking"
- Suporte: "erro", "falha", "travou", "nao funciona", "print", "instabilidade"
