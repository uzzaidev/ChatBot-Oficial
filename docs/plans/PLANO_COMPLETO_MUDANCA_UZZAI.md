# Plano Completo de Mudanca - UzzAI

## Objetivo geral

Consolidar o ecossistema UzzAI (`prompt.2uzzai` + `RAG 00..13` + tools + runtime + historico + suporte) para:

- reduzir inconsistencias entre documentacao e comportamento real do bot
- melhorar recuperacao de apresentacoes/imagens/documentos
- aumentar cobertura de deteccao de suporte implicito
- reduzir duplicidades operacionais e tickets redundantes
- manter governanca comercial clara (oficial x em validacao)

## Escopo e principio de execucao

- Escopo funcional: atendimento WhatsApp, RAG, tools, suporte e triagem.
- Escopo tecnico: ajustes em `src/`, `tests/` e `docs/prompt UZZAI/`.
- Principio: rollout incremental por fase, com validacao antes de avancar.
- Sem big bang: cada fase deve ser reversivel por feature flag/config.

## Baseline (estado atual resumido)

- Prompt e RAG estao mais organizados e modulares.
- Ainda existe gap entre instrucoes do prompt e comportamento de runtime em algumas areas.
- Busca de documento funciona, mas ranking multimodal pode melhorar para apresentacoes.
- Deteccao de suporte existe, porem historicamente mais forte em gatilhos explicitos.
- Observabilidade por traces esta ativa e suficiente para medir evolucao.

## Fases de implementacao

### Fase A - Correcao critica de runtime (P0)

#### A1. Eliminar duplicidade em `support_cases`

- Problema: uma mesma ocorrencia pode gerar mais de um registro.
- Mudanca: garantir persistencia unica por mensagem processada e anexar `trace_id` no mesmo registro.
- Arquivos-alvo:
  - `src/flows/chatbotFlow.ts`
  - `src/lib/support-cases.ts`
- Critério de aceite:
  - mesmo evento nao deve criar dois casos
  - caso final deve conter `trace_id` quando disponivel

#### A2. Fortalecer detector de suporte implicito

- Problema: relatos sem palavra-chave ("bug", "erro") podem nao ser capturados.
- Mudanca: ampliar sinais implicitos e operacionais:
  - "cliente falou X e respondeu Y"
  - "mandou duas vezes", "imagem repetida"
  - "fora de ordem", "respondeu atrasado", "misturou conversa"
- Arquivo-alvo:
  - `src/lib/support-cases.ts`
- Critério de aceite:
  - aumento de recall para casos implicitos em testes
  - reducao de falso negativo em cenarios operacionais

#### A3. Classificacao de causa mais aderente

- Problema: classificacao pode subestimar casos de duplicidade/reprocessamento.
- Mudanca: reforcar heuristica para classificar duplicidade/ordenacao como `system`.
- Arquivo-alvo:
  - `src/lib/support-cases.ts`
- Critério de aceite:
  - casos de duplicidade entram como `system/high` quando aplicavel

---

### Fase B - Alinhamento Prompt <-> Tools (P1)

#### B1. Prompt refletindo tools reais

- Garantir que o prompt principal cubra:
  - `transferir_atendimento`
  - `buscar_documento`
  - `registrar_dado_cadastral`
  - `enviar_resposta_em_audio`
  - `verificar_agenda`, `criar_evento_agenda`, `alterar_evento_agenda`, `cancelar_evento_agenda`
- Arquivo-alvo:
  - `docs/prompt UZZAI/prompt.2uzzai.md`
- Critério de aceite:
  - sem ambiguidade sobre quando chamar tool
  - regra explicita para nao chamar tool com argumento incompleto

#### B2. Politica anti-ambiguidade de tool call

- Definir:
  - quando responder direto com RAG
  - quando perguntar 1 dado antes de tool call
  - fallback em caso de falha de tool
- Arquivo-alvo:
  - `docs/prompt UZZAI/prompt.2uzzai.md`

---

### Fase C - Limpeza comercial e governanca de verdade (P1)

#### C1. Harmonizar `03`, `09`, `12`

- Resolver conflitos de leitura entre preco/prazo/SLA.
- Padronizar status:
  - oficial
  - referencia operacional
  - em validacao
- Arquivos-alvo:
  - `docs/prompt UZZAI/rag/03_UZZAI_PLANOS_PRECOS_E_IMPLEMENTACAO.md`
  - `docs/prompt UZZAI/rag/09_UZZAI_COMERCIAL_POLITICAS_E_LIMITES.md`
  - `docs/prompt UZZAI/rag/12_UZZAI_METRICAS_QUALIDADE_E_GOVERNANCA.md`
- Critério de aceite:
  - respostas comerciais sem contradicao entre docs

#### C2. Regras de prioridade no mapa RAG

- Ajustar `00_MAPA_RAG_UZZAI.md` para:
  - suporte operacional: `07`, `10`, `11`, `13`
  - comercial: `03`, `09`, `12`
- Arquivo-alvo:
  - `docs/prompt UZZAI/rag/00_MAPA_RAG_UZZAI.md`

---

### Fase D - Ativacao operacional do playbook de suporte (P1)

#### D1. Tornar o `13` referencia explicita

- Integrar `13_UZZAI_PLAYBOOK_RESPOSTAS_PADRAO_SUPORTE.md` no protocolo de triagem.
- Arquivos-alvo:
  - `docs/prompt UZZAI/prompt.2uzzai.md`
  - `docs/prompt UZZAI/rag/10_UZZAI_SUPORTE_OPERACAO_E_TRIAGEM.md`
- Critério de aceite:
  - cenarios operacionais seguem respostas padrao previsiveis

---

### Fase E - Testes focados UzzAI (P0)

#### E1. Testes de regressao de suporte

- Cobrir:
  - deteccao implicita
  - duplicidade de mensagem/imagem
  - mismatch de contexto
  - classificacao de causa/severidade
- Arquivos-alvo:
  - `tests/unit/*support*`
  - `tests/integration/*support*`
- Critério de aceite:
  - testes verdes + cobertura minima dos cenarios criticos

#### E2. Testes de busca de apresentacoes/imagens (proxima etapa runtime)

- Cobrir ranking hibrido semantic + filename + metadata para `buscar_documento`.
- Arquivos-alvo:
  - `src/nodes/searchDocumentInKnowledge.ts`
  - `src/nodes/handleDocumentSearchToolCall.ts`
  - `tests/unit/*document-search*`
- Critério de aceite:
  - maior acerto em consultas de apresentacoes

## Indicadores de sucesso (KPIs)

- Captura de suporte implicito: aumento mensuravel.
- Falso negativo de bug report: queda.
- Casos duplicados em `support_cases`: queda relevante.
- Consistencia de resposta comercial: sem conflito entre docs.
- Qualidade operacional percebida: resposta mais padronizada nos incidentes.

## Riscos e mitigacoes

- Risco: heuristica ampla gerar falso positivo de suporte.
  - Mitigacao: ajustar threshold por intent e validar com casos reais.
- Risco: mudanca de prompt aumentar tool call desnecessaria.
  - Mitigacao: regra anti-ambiguidade + testes de tool policy.
- Risco: dados comerciais mudarem rapido.
  - Mitigacao: status de oficializacao e governanca por documento.

## Ordem recomendada de execucao

1. Fase A (runtime critico)  
2. Fase E (testes de regressao para travar comportamento)  
3. Fase B (prompt-tools)  
4. Fase C (governanca comercial)  
5. Fase D (playbook operacional)  
6. Evolucao de busca multimodal (E2)  

## Log de execucao (sessao atual)

- [x] Fase B/C/D (docs-only) aplicada anteriormente
- [x] Fase A iniciada (deduplicacao `support_cases` + detector implicito)
- [x] Fase E iniciada (testes unitarios de suporte)
- [x] E2 iniciado: ranking hibrido semantic + filename + tipo + boost de apresentacao em `searchDocumentInKnowledge`
- [x] E2 iniciado: melhoria de termos explicitos e priorizacao de arquivo de apresentacao em `handleDocumentSearchToolCall`
- [x] Testes unitarios atualizados e validados (`support-cases-detection` e `handle-document-search-tool-call`)
- [x] Cobertura adicional executada:
  - `tests/unit/search-document-in-knowledge.test.ts` para ranking hibrido e fallback por filename
  - `tests/integration/support-cases-api.test.ts` com cenarios implicitos e mensagem neutra
- [x] Roteiro de homologacao E2E criado:
  - `docs/runbooks/UZZAI_E2E_HOMOLOGACAO_RAG_SUPORTE.md`
- [ ] Pendencia externa: executar o roteiro em ambiente de homologacao com base real e preencher resultados

## Status final do plano

- Execucao tecnica no repositorio: **concluida**
  - runtime critico (Fase A): concluido
  - alinhamento prompt/rag (Fase B/C/D): concluido
  - testes focados UzzAI (Fase E1/E2): concluido
- Execucao operacional fora do repositorio: **pendente externa**
  - homologacao E2E com base real (runbook) e registro de resultados

## Encerramento desta etapa

Este plano esta encerrado no escopo de implementacao de codigo/documentacao/testes.
A unica atividade restante depende de execucao em ambiente de homologacao real com dados carregados.
