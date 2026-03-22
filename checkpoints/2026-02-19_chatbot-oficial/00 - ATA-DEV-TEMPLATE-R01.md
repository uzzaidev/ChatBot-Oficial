---
type: reuniao_dev
meeting_type:
  - architecture | incident | planning | hybrid
subtipo:
  - architecture_alignment | bug_triage | incident_postmortem | sprint_planning | technical_spike | code_review | performance | security | database_migration | observability | release_planning
status:
  - rascunho | aprovada | arquivada
projeto:
  - CODIGO-PROJETO
system_area:
  - backend | frontend | mobile | infra | database | ci_cd | observability | security
sprint: Sprint-AAAA-WXX
okr_relacionado: ""
data: AAAA-MM-DD
timezone: America/Sao_Paulo
inicio: AAAA-MM-DDTHH:MM-03:00
fim: AAAA-MM-DDTHH:MM-03:00
duracao: 00h00m
duracao_util: 00h00m
proxima_reuniao: AAAA-MM-DDTHH:MM-03:00
participantes: 0
tech_lead: ""
adrs: 0
decisions: 0
actions: 0
spikes: 0
unknowns: 0
incidents: 0
blockers: 0
risks: 0
kaizens: 0
efetividade: 0
created: AAAA-MM-DDTHH:MM
updated: 2026-02-25T16:51
cor_projeto: "#3b82f6"
versao: 1
versao_template: R01-DEV
dg-publish: true
---


# 🛠️ ATA DEV - [TITULO DA REUNIÃO TÉCNICA]

> **Projeto:** [[20-Projetos/[PROJETO]]] | **Sprint:** `Sprint-AAAA-WXX` | **Data:** DD/MM/AAAA
> **Tipo:** `Architecture | Incident | Planning | Hybrid` | **Área:** `Backend | Frontend | Mobile | Infra`

---

## 📊 **DASHBOARD TÉCNICO**

```dataviewjs
const p = dv.current();

// Cálculo de efetividade técnica
const efetividade = Math.round(
  (p.adrs * 15 + p.decisions * 10 + p.actions * 5 + p.spikes * 8 - p.blockers * 5 - p.unknowns * 2) /
  (parseFloat(p.duracao_util) || 1)
);

// Status geral
const statusEmoji =
  p.blockers > 2 ? "🔴" :
  p.incidents > 0 ? "🟠" :
  p.unknowns > 3 ? "🟡" : "🟢";

dv.paragraph(`
### ${statusEmoji} **Status Geral da Reunião**

| Métrica | Valor | Target |
|---------|-------|--------|
| **ADRs Gerados** | ${p.adrs} | ≥ 1 |
| **Decisões Técnicas** | ${p.decisions} | ≥ 2 |
| **Ações Definidas** | ${p.actions} | ≥ 3 |
| **Spikes (Pesquisas)** | ${p.spikes} | ≥ 0 |
| **Unknowns (Pendências)** | ${p.unknowns} | < 3 |
| **Incidentes Discutidos** | ${p.incidents} | 0 |
| **Bloqueios Técnicos** | ${p.blockers} | 0 |
| **Riscos Identificados** | ${p.risks} | < 2 |
| **Kaizens Técnicos** | ${p.kaizens} | ≥ 1 |
| **Efetividade** | ${efetividade}/10 | ≥ 7 |
`);

// Alertas críticos
if (p.blockers > 0) {
  dv.paragraph(`> [!danger] **${p.blockers} BLOQUEIO(S) TÉCNICO(S) ATIVO(S)** — Ação imediata necessária`);
}
if (p.incidents > 0) {
  dv.paragraph(`> [!warning] **${p.incidents} INCIDENTE(S) EM DISCUSSÃO** — Requer análise de causa raiz`);
}
if (p.unknowns > 3) {
  dv.paragraph(`> [!caution] **${p.unknowns} PERGUNTAS EM ABERTO** — Alta incerteza técnica`);
}
```

---

## 📋 **CABEÇALHO & CONTEXTO TÉCNICO**

| Campo | Valor |
|-------|-------|
| **Projeto/Sistema** | [NOME_PROJETO] |
| **Tipo de Reunião** | [Architecture / Incident / Planning / Hybrid] |
| **Área Técnica** | [Backend / Frontend / Mobile / Infra / Database / CI-CD] |
| **Tech Lead** | [[Nome Tech Lead]] |
| **Data** | DD/MM/AAAA (dia da semana) |
| **Janela** | HH:MM → HH:MM |
| **Duração Total** | Xh XXm |
| **Duração Útil** | Xh XXm |
| **Local/Plataforma** | [Google Meet, Presencial, Slack Huddle] |
| **Facilitador(a)** | [[Nome Facilitador]] |
| **Timezone** | America/Sao_Paulo |
| **Gravação** | ✅/❌ [Link se disponível] |

### 🔗 **Links Técnicos Rápidos**
- 📊 [Dashboard do Projeto](../20-Projetos/[PROJETO]/[PROJETO]-DASHBOARD.md)
- 🏗️ [Arquitetura Atual](link-para-diagramas)
- 📝 [ADRs Anteriores](link-para-adrs)
- 🐛 [Issues/Bugs](link-para-issues)
- 🔀 [Pull Requests](link-para-prs)
- 📚 [Documentação Técnica](link-para-docs)

---

## 👥 **PARTICIPANTES**

| Nome | Papel | Expertise | Presente | Contribuição Principal |
|------|-------|-----------|----------|------------------------|
| [[Nome Completo]] | Tech Lead | Backend/Infra | ✅ | Decisões de arquitetura |
| [[Nome Completo]] | Senior Dev | Frontend/Mobile | ✅ | Análise de impacto UX |
| [[Nome Completo]] | DevOps | CI/CD/Observability | ✅ | Infraestrutura e deploy |
| [[Nome Completo]] | QA Lead | Testing/Quality | ❌ | Ausente - [Motivo] |

**Convidados Externos:**
- [[Nome]] - Empresa/Função/Especialidade

---

## 🎯 **CONTEXTO DA REUNIÃO**

### **Objetivo Principal**
[Descrever em 2-3 linhas o objetivo técnico da reunião]

### **Gatilho / Motivação**
- [ ] Nova feature / requisito
- [ ] Bug crítico / incidente
- [ ] Refatoração / débito técnico
- [ ] Performance / escala
- [ ] Segurança / compliance
- [ ] Migração / upgrade
- [ ] Outro: [especificar]

### **Escopo Afetado**
- **Componentes:** [lista de serviços/módulos]
- **Impacto Esperado:** [usuários, sistemas, dados]
- **Criticidade:** 🔴 Crítico | 🟡 Importante | 🟢 Baixo

---

## 💬 **DISCUSSÃO TÉCNICA** (por Tópico)

> [!info] **Estrutura por tópico técnico, não cronologia**
> Cada tópico importante tem: Contexto → Discussão → Conclusão

### **TÓPICO 1: [Nome do Tópico Técnico]**

#### **Contexto**
[Situação técnica que motivou a discussão]

#### **Discussão**

**Alternativas Consideradas:**

**Alternativa A:** [Descrição]
- ✅ Prós: [lista]
- ❌ Contras: [lista]
- 💰 Custo: [tempo/recursos]
- ⚠️ Riscos: [lista]

**Alternativa B:** [Descrição]
- ✅ Prós: [lista]
- ❌ Contras: [lista]
- 💰 Custo: [tempo/recursos]
- ⚠️ Riscos: [lista]

**Critérios de Escolha:**
1. [Critério 1 com métrica/limiar]
2. [Critério 2 com métrica/limiar]
3. [Critério 3 com métrica/limiar]

**Pontos Levantados:**
- [[Dev 1]] mencionou: "[citação relevante]"
- [[Dev 2]] questionou: "[dúvida técnica]"
- [[Dev 3]] propôs: "[solução alternativa]"

#### **Conclusão**
[Decisão tomada ou próximo passo definido]

---

### **TÓPICO 2: [Próximo Tópico]**

[Repetir estrutura acima]

---

## 🏗️ **ADRs (ARCHITECTURE DECISION RECORDS)**

> [!info] **ADR = Decisão de Arquitetura Rastreável**
> Toda decisão importante de arquitetura vira um ADR-lite para memória técnica.

### **ADR-001 — [Título da Decisão Arquitetural] (DD/MM/AAAA)**

**Status:** 🟢 Aceito | 🟡 Proposto | 🔴 Rejeitado | 🔵 Depreciado

**Contexto Técnico:**
[Por que essa decisão arquitetural foi necessária? Qual problema técnico resolve?]

**Decisão:**
[O QUE foi decidido — claro, específico e técnico]

**Alternativas Consideradas:**

| Alternativa | Prós | Contras | Custo | Descartada? |
|-------------|------|---------|-------|-------------|
| **A:** [Nome] | [lista] | [lista] | [estimativa] | ❌ Não |
| **B:** [Nome] | [lista] | [lista] | [estimativa] | ✅ Sim - [motivo] |
| **C:** [Nome] | [lista] | [lista] | [estimativa] | ✅ Sim - [motivo] |

**Justificativa da Escolha:**
[Por que a alternativa escolhida venceu]

**Consequências:**

✅ **Benefícios:**
- [Benefício técnico 1 com métrica esperada]
- [Benefício técnico 2 com métrica esperada]

⚠️ **Trade-offs:**
- [Trade-off 1 e como mitigar]
- [Trade-off 2 e como mitigar]

📉 **Débitos Técnicos Introduzidos:**
- [Débito 1 e quando/como resolver]

🔄 **Reversibilidade:**
- **Nível:** Fácil | Moderada | Difícil | Irreversível
- **Como Reverter:** [Passos técnicos para desfazer a decisão se necessário]
- **Feature Flag:** ✅ Sim | ❌ Não - [nome da flag se existir]

**Impacto Técnico:**

| Dimensão | Antes | Depois | Variação |
|----------|-------|--------|----------|
| **Performance** | [métrica] | [métrica] | [+/-X%] |
| **Latência** | [métrica] | [métrica] | [+/-X ms] |
| **Custo Mensal** | R$ X | R$ Y | [+/-R$ Z] |
| **Complexidade** | [baixa/média/alta] | [baixa/média/alta] | [aumentou/diminuiu] |
| **Manutenibilidade** | [escala 1-10] | [escala 1-10] | [+/-X] |
| **Segurança** | [nível] | [nível] | [melhorou/piorou] |

**NFRs (Non-Functional Requirements):**
- **Disponibilidade:** [SLA esperado]
- **Escalabilidade:** [até quantos usuários/req/s]
- **Observabilidade:** [métricas, logs, traces]
- **Segurança:** [autenticação, autorização, criptografia]

**Diagramas/Contratos:**
```
[Diagrama textual de arquitetura, fluxo, ou contrato de API/eventos]
```

**Links Relacionados:**
- 📝 RFC: [link]
- 🔀 PR: [link]
- 🐛 Issue: [link]
- 📄 Doc: [link]

**Responsáveis:** [[Dev 1]], [[Dev 2]]
**Revisores:** [[Tech Lead]], [[Arquiteto]]
**Data Decisão:** DD/MM/AAAA
**Data Implementação Esperada:** DD/MM/AAAA

---

### **ADR-002 — [Próxima Decisão]**

[Repetir estrutura acima]

---

## 📝 **DECISÕES TÉCNICAS** (não-arquiteturais)

> [!info] **Decisões menores que ADRs**
> Decisões técnicas relevantes, mas que não impactam arquitetura fundamental.

### **D-001 — [Título da Decisão] (DD/MM/AAAA)**

**Contexto:**
[Por que essa decisão foi necessária?]

**Decisão:**
[O que foi decidido]

**Alternativas:**
- **A:** [opção] → ❌ Descartada: [motivo]
- **B:** [opção] → ✅ Escolhida

**Reversibilidade:** Fácil | Moderada | Difícil

**Responsáveis:** [[Nome 1]], [[Nome 2]]
**Status:** ✅ Aprovado | 🟡 Pendente validação | ⏳ Aguardando dados

---

## 🔬 **SPIKES (PESQUISAS TIME-BOXED)**

> [!tip] **Spike = Pesquisa técnica com tempo limitado e resultado esperado**
> Usado quando há incerteza técnica que precisa ser resolvida antes de decidir.

### **S-001 — [Título do Spike]**

**Pergunta Técnica:**
[Qual a dúvida técnica que precisa ser respondida?]

**Motivação:**
[Por que essa pesquisa é necessária agora? Qual decisão está bloqueada?]

**Escopo:**
- ✅ **Fazer:** [lista de experimentos/benchmarks/POCs]
- ❌ **Não fazer:** [limites do spike]

**Time-box:** [2h | 1d | 2d] — **Deadline:** DD/MM/AAAA

**Resultado Esperado:**
[Como saber que o spike respondeu a pergunta? Formato da entrega]

**Critérios de Sucesso:**
- [ ] [Critério 1 — objetivo e mensurável]
- [ ] [Critério 2 — objetivo e mensurável]

**Métricas a Coletar:**
- [Métrica 1 com threshold]
- [Métrica 2 com threshold]

**Experimento Mínimo:**
[Descrição do menor experimento que responde a pergunta]

**Hipóteses a Validar:**
1. **H1:** [Hipótese técnica] — Esperado: [resultado]
2. **H2:** [Hipótese técnica] — Esperado: [resultado]

**Bloqueadores do Spike:**
[O que pode impedir a execução do spike?]

**Responsável:** [[Nome]]
**Revisão com:** [[Tech Lead]]
**Status:** 📝 Planejado | 🔬 Em andamento | ✅ Concluído | 🚫 Cancelado

**Resultados (preencher ao concluir):**
```
[Colar resultados do spike: benchmarks, conclusões, links]
```

---

## ❓ **UNKNOWNS (PERGUNTAS EM ABERTO)**

> [!caution] **Perguntas técnicas que ainda não têm resposta**
> Registrar incertezas técnicas e o que precisa ser feito para resolvê-las.

### **Q-001 — [Pergunta Técnica]**

**Pergunta:**
[Formulação clara da dúvida técnica]

**Impacto se não responder:**
- [Consequência 1]
- [Consequência 2]

**Bloqueando:**
- [ ] Decisão: [[Link-Decisão]]
- [ ] Ação: [[Link-Ação]]
- [ ] ADR: [[Link-ADR]]

**Como Responder:**
- [ ] Spike técnico → [[S-00X]]
- [ ] Consultar doc/código existente
- [ ] Perguntar a [[Pessoa/Time]]
- [ ] Experimento/POC
- [ ] Outro: [especificar]

**Responsável por Resolver:** [[Nome]]
**Prazo:** DD/MM/AAAA
**Status:** 🟡 Em investigação | ✅ Respondida | 🚫 Cancelada

**Resposta (preencher ao resolver):**
```
[Resposta técnica com evidências/links]
```

---

## 🚨 **MÓDULO: INCIDENTE / BUG CRÍTICO**

> [!danger] **Ativar este módulo apenas se a reunião discutiu incidente**
> Deletar este bloco se não houve incidente.

### **INC-001 — [Título do Incidente]**

**Severidade:** 🔴 SEV-1 | 🟠 SEV-2 | 🟡 SEV-3 | 🟢 SEV-4

**Status:** 🔥 Ativo | 🛠️ Mitigado | ✅ Resolvido | 📋 Postmortem

**Impacto:**
- **Usuários afetados:** [número ou %]
- **Endpoints afetados:** [lista]
- **Regiões afetadas:** [lista]
- **Perda de dados:** ✅ Sim | ❌ Não
- **SLA violado:** ✅ Sim | ❌ Não

**Timeline:**

| Timestamp | Evento | Responsável |
|-----------|--------|-------------|
| DD/MM HH:MM | Início do incidente | — |
| DD/MM HH:MM | Detecção (alerta/usuário) | [[Nome]] |
| DD/MM HH:MM | Triagem iniciada | [[Nome]] |
| DD/MM HH:MM | Causa raiz identificada | [[Nome]] |
| DD/MM HH:MM | Mitigação aplicada | [[Nome]] |
| DD/MM HH:MM | Validação | [[Nome]] |
| DD/MM HH:MM | Incidente resolvido | [[Nome]] |

**Duração Total:** [X horas Y minutos]

**Sintomas Observados:**
- [Sintoma 1 com evidência: logs, métricas, alerts]
- [Sintoma 2 com evidência]

**Hipóteses Testadas:**

| Hipótese | Teste Realizado | Resultado | Descartada? |
|----------|-----------------|-----------|-------------|
| [H1] | [teste] | [resultado] | ✅ Sim - [motivo] |
| [H2] | [teste] | [resultado] | ✅ Sim - [motivo] |
| [H3] | [teste] | [resultado] | ❌ Não - **Causa raiz** |

**Causa Raiz (RCA):**
[Descrição técnica da causa raiz — 5 Porquês, Ishikawa, ou análise técnica]

**Evidências:**
- Logs: [link ou snippet]
- Métricas: [link para dashboard]
- Traces: [link para trace]
- Screenshot/Vídeo: [link]

**Ações Imediatas (já aplicadas):**
- [x] [Ação 1 — responsável — timestamp]
- [x] [Ação 2 — responsável — timestamp]

**Ações Definitivas (para prevenir recorrência):**
- [ ] **[Ação 1]** [[Responsável]] ⏫ 📅 AAAA-MM-DD #incidente #P0
- [ ] **[Ação 2]** [[Responsável]] ⏫ 📅 AAAA-MM-DD #incidente #P1

**Prevenção:**
- **Monitoramento:** [Novos alertas a criar]
- **Testes:** [Testes automatizados a adicionar]
- **Runbook:** [Documentação a criar/atualizar]
- **Post-mortem:** [Link para doc completo]

**Responsável Incidente:** [[Nome]]
**Postmortem Owner:** [[Nome]]
**Prazo Postmortem:** DD/MM/AAAA

---

## 📝 **ENCAMINHAMENTOS TÉCNICOS** (Action Items)

> [!important] **Tasks com #dev-action aparecem automaticamente no [[90-Views/Dashboard-Encaminhamentos]]**

### 🔥 **PRIORIDADE P0** (Crítico — bloqueador)

- [ ] **A-001: [Descrição específica e testável da ação técnica]** [[Responsável]] ⏫ 📅 AAAA-MM-DD 🏷️ project:[CODIGO] area:[backend/frontend/etc] #dev-action #P0 sprint:Sprint-AAAA-WXX
  - **Contexto:** [Por que é crítico]
  - **Critério de Aceite:** [Como saber que está pronto]
  - **Como Testar:** [Passos específicos de teste/validação]
  - **Dependências:** [Bloqueadores ou pré-requisitos]
  - **Branch/PR:** [link quando existir]
  - **Estimativa:** [Xh ou Yd]

### 🔴 **PRIORIDADE P1** (Alto — importante)

- [ ] **A-002: [Descrição da ação]** [[Responsável]] ⏫ 📅 AAAA-MM-DD 🏷️ project:[CODIGO] area:[área] #dev-action #P1 sprint:Sprint-AAAA-WXX
  - **Critério de Aceite:** [específico e testável]
  - **Como Testar:** [como validar]
  - **Dependências:** [lista ou "nenhuma"]

### ⚡ **PRIORIDADE P2** (Médio — planejado)

- [ ] **A-003: [Descrição da ação]** [[Responsável]] 🔼 📅 AAAA-MM-DD 🏷️ project:[CODIGO] #dev-action #P2 sprint:Sprint-AAAA-WXX

### 🔵 **PRIORIDADE P3** (Baixo — nice-to-have)

- [ ] **A-004: [Ação técnica nice-to-have]** [[Responsável]] 🔽 📅 AAAA-MM-DD 🏷️ project:[CODIGO] #dev-action #P3 backlog:true

---

## ⚠️ **RISCOS TÉCNICOS & MITIGAÇÕES**

### 🎲 **Riscos com Severidade Calculada**

```dataviewjs
const riscos = [
  {
    id: "R-001",
    prob: 4,
    impact: 5,
    descricao: "[Descrição do risco técnico: performance, segurança, débito técnico, etc.]",
    area: "Backend",
    owner: "[[Nome]]",
    status: "Ativo",
    mitigacao: "[Ação preventiva para reduzir probabilidade/impacto]",
    contingencia: "[Plano B se o risco se materializar]",
    gatilho: "[Métrica/evento que indica que o risco está se materializando]"
  },
  {
    id: "R-002",
    prob: 3,
    impact: 4,
    descricao: "[Descrição do risco]",
    area: "Infra",
    owner: "[[Nome]]",
    status: "Monitorando",
    mitigacao: "[Ação de mitigação]",
    contingencia: "[Plano B]",
    gatilho: "[Gatilho de alerta]"
  }
];

// Calcular severidade
riscos.forEach(r => {
  r.severidade = r.prob * r.impact;
  r.categoria = r.severidade >= 16 ? "🔴 CRÍTICO" :
                r.severidade >= 12 ? "🟡 ALTO" :
                r.severidade >= 6 ? "🟠 MÉDIO" : "🟢 BAIXO";
});

// Ordenar por severidade
riscos.sort((a, b) => b.severidade - a.severidade);

dv.table(
  ["Risco", "Categoria", "Sev", "Prob", "Impact", "Área", "Descrição", "Mitigação"],
  riscos.map(r => [
    r.id,
    r.categoria,
    r.severidade,
    r.prob,
    r.impact,
    r.area,
    r.descricao,
    r.mitigacao
  ])
);

// Alertas críticos
const criticos = riscos.filter(r => r.severidade >= 16);
const altos = riscos.filter(r => r.severidade >= 12 && r.severidade < 16);

if (criticos.length > 0) {
  dv.paragraph(`\n> [!danger] **${criticos.length} RISCO(S) TÉCNICO(S) CRÍTICO(S)**`);
  criticos.forEach(r => {
    dv.paragraph(`> **${r.id}**: ${r.descricao} (Severidade: ${r.severidade})`);
    dv.paragraph(`> **Gatilho**: ${r.gatilho}`);
    dv.paragraph(`> **Contingência**: ${r.contingencia}`);
  });
}

if (altos.length > 0) {
  dv.paragraph(`\n> [!warning] **${altos.length} RISCO(S) TÉCNICO(S) ALTO(S)**`);
  altos.forEach(r => {
    dv.paragraph(`> **${r.id}**: ${r.descricao} (Severidade: ${r.severidade})`);
  });
}
```

---

## 🚫 **BLOQUEIOS TÉCNICOS ATIVOS**

> [!failure] **B-001 — [Título do Bloqueio Técnico]**
>
> **Descrição:**
> [O que está impedindo progresso técnico]
>
> **Afeta:**
> - Task: [[A-00X]]
> - Componente: [nome do componente/serviço]
> - Prazo: [Impacto em dias/horas]
>
> **Causa Raiz Técnica:**
> [Análise técnica do bloqueio]
>
> **Dependência Externa:**
> - [ ] Time: [nome do time]
> - [ ] Pessoa: [[nome]]
> - [ ] Sistema: [nome do sistema/API]
> - [ ] Fornecedor: [nome do fornecedor]
>
> **Ação para Desbloqueio:**
> - [ ] **[Ação específica]** [[Responsável]] ⏫ 📅 AAAA-MM-DD #bloqueio #P0
>
> **Impacto Técnico:**
> - Prazo: [+X horas/dias de atraso]
> - Qualidade: [Risco de Y]
> - Performance: [Impacto em Z]
>
> **Escalation Path:** [[Tech Lead]] → [[Diretor Técnico]] (se > 24h)
> **Status:** 🔴 Bloqueado | 🟡 Em resolução | 🟢 Desbloqueado

---

## 💡 **KAIZENS TÉCNICOS**

> [!info] **Kaizen Técnico = Melhoria Contínua de Processos DEV**
> Aprendizados técnicos e oportunidades de melhoria de processo identificados.

### **KAIZENS DE ARQUITETURA**

> [!tip] **K-001 — [Título do Kaizen Arquitetural]**
>
> **Contexto:**
> [Situação arquitetural que gerou o aprendizado]
>
> **Aprendizado:**
> - ✅ **Fazer:** [Padrão arquitetural que funcionou bem]
> - ❌ **Evitar:** [Anti-pattern identificado]
> - 🔄 **Ajustar:** [O que pode melhorar]
>
> **Aplicação Futura:**
> [Como aplicar esse aprendizado em próximos sistemas/features]
>
> **Impacto Esperado:** [Melhoria de X%, redução de Y, etc.]
>
> **Documentar em:** [ADR | Wiki | README]

---

### **KAIZENS DE PROCESSO DEV**

> [!tip] **K-002 — [Título do Kaizen de Processo]**
>
> **Problema Identificado:**
> [Ineficiência de processo observada: CI/CD, code review, deploy, etc.]
>
> **Proposta de Melhoria:**
> [Solução sugerida]
>
> **Plano de Teste:**
> - Período: [X sprints]
> - Métrica de Sucesso: [Como medir: tempo de CI, lead time, MTTR, etc.]
>
> **Owner:** [[Responsável]]
> **Status:** Proposto | Em Teste | Implementado

---

### **KAIZENS DE TOOLING**

> [!tip] **K-003 — [Título do Kaizen de Ferramentas]**
>
> **Ferramenta/Tech:** [nome]
>
> **Insight:**
> [Descoberta sobre uso efetivo de ferramenta/tech]
>
> **Recomendação:**
> [Como usar melhor / quando não usar]
>
> **ROI Estimado:**
> [Benefício vs esforço]

---

## 📅 **PRÓXIMA REUNIÃO TÉCNICA**

| Campo | Valor |
|-------|----------|
| **Data** | DD/MM/AAAA (dia da semana) |
| **Horário** | HH:MM |
| **Duração** | [X] horas |
| **Tipo** | [Architecture / Bug Triage / Sprint Planning / Retrospectiva Técnica] |

### 📋 **Agenda Técnica Preliminar**

1. **[Tópico 1]:** [Descrição breve]
2. **[Tópico 2]:** [Descrição breve]
3. **Review de ADRs/Decisões:** Status de implementação
4. **Review de Spikes:** Resultados e próximos passos
5. **Review de Ações:** Progresso de tasks P0/P1
6. **Kaizen:** Melhorias de processo identificadas

### 🎯 **Preparação Necessária**

- [ ] **[Dev 1]:** [Tarefa de preparação — ex: rodar benchmark] 📅 AAAA-MM-DD
- [ ] **[Dev 2]:** [Tarefa de preparação — ex: revisar RFC] 📅 AAAA-MM-DD
- [ ] **[Tech Lead]:** [Tarefa de preparação — ex: atualizar diagrama] 📅 AAAA-MM-DD

---

## ✅ **ENCERRAMENTO & RETROSPECTIVA TÉCNICA**

### 🎯 **Resultado da Reunião**

> [!success] **[Resumo executivo técnico em 1-2 linhas]**

### 🏆 **Principais Conquistas Técnicas**

- ✅ **[Conquista 1]:** [Detalhes + impacto técnico]
- ✅ **[Conquista 2]:** [Detalhes + impacto técnico]
- ✅ **[Conquista 3]:** [Detalhes + impacto técnico]

### 📈 **Métricas de Sucesso Técnico**

- **ADRs Gerados:** X (planejado: Y)
- **Decisões Tomadas:** X (planejado: Y)
- **Ações Definidas:** X (planejado: Y)
- **Spikes Criados:** X
- **Unknowns Resolvidos:** X (restantes: Y)
- **Bloqueios Desbloqueados:** X
- **Efetividade Geral:** X/10

### 🎓 **O Que Funcionou Bem (Técnico)**

- 💡 **[Ponto positivo 1]:** [Por que funcionou bem tecnicamente]
- 💡 **[Ponto positivo 2]:** [Por que funcionou bem]
- 💡 **[Ponto positivo 3]:** [Por que funcionou bem]

### ⚠️ **O Que Precisa Melhorar (Técnico)**

- ⚠️ **[Ponto de melhoria 1]:** [Como melhorar tecnicamente na próxima]
- ⚠️ **[Ponto de melhoria 2]:** [Como melhorar]

### 🚀 **Próximos Passos Técnicos Críticos**

1. **[Ação técnica 1]** — [[Responsável]] — DD/MM/AAAA
2. **[Ação técnica 2]** — [[Responsável]] — DD/MM/AAAA
3. **[Ação técnica 3]** — [[Responsável]] — DD/MM/AAAA

---

## 📊 **ANALYTICS & QUALIDADE DA ATA**

```dataviewjs
const p = dv.current();

// Calcular efetividade
const adrsScore = Math.min(p.adrs * 25, 100);
const decisionsScore = Math.min(p.decisions * 20, 100);
const actionsScore = Math.min(p.actions * 10, 100);
const spikesScore = Math.min(p.spikes * 15, 100);
const unknownsScore = Math.max(100 - p.unknowns * 10, 0);
const blockersScore = Math.max(100 - p.blockers * 20, 0);
const kaizensScore = Math.min(p.kaizens * 15, 100);

const efetividadeGeral = Math.round((adrsScore + decisionsScore + actionsScore + spikesScore + unknownsScore + blockersScore + kaizensScore) / 7);

dv.paragraph(`### 📊 Score da Reunião Técnica\n`);
dv.paragraph(`| Métrica | Score | Status |`);
dv.paragraph(`|---------|-------|--------|`);
dv.paragraph(`| **ADRs Gerados** | ${adrsScore}/100 | ${adrsScore >= 70 ? "🟢" : adrsScore >= 40 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **Decisões Técnicas** | ${decisionsScore}/100 | ${decisionsScore >= 70 ? "🟢" : decisionsScore >= 40 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **Ações Definidas** | ${actionsScore}/100 | ${actionsScore >= 70 ? "🟢" : actionsScore >= 40 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **Spikes Criados** | ${spikesScore}/100 | ${spikesScore >= 50 ? "🟢" : spikesScore >= 25 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **Gestão de Unknowns** | ${unknownsScore}/100 | ${unknownsScore >= 70 ? "🟢" : unknownsScore >= 40 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **Gestão de Bloqueios** | ${blockersScore}/100 | ${blockersScore >= 70 ? "🟢" : blockersScore >= 40 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **Kaizens Técnicos** | ${kaizensScore}/100 | ${kaizensScore >= 70 ? "🟢" : kaizensScore >= 40 ? "🟡" : "🔴"} |`);
dv.paragraph(`| **EFETIVIDADE TÉCNICA GERAL** | **${efetividadeGeral}/100** | ${efetividadeGeral >= 80 ? "🟢 EXCELENTE" : efetividadeGeral >= 60 ? "🟡 BOM" : "🔴 PRECISA MELHORAR"} |`);
```

---

## 🔗 **INTEGRAÇÕES AUTOMÁTICAS**

### → Dashboard de Encaminhamentos DEV
✅ Todas as tasks com `#dev-action` aparecem em [[90-Views/Dashboard-Encaminhamentos]]

### → Kanban Portfolio Técnico
- Tasks com `project:[CODIGO]` e `area:[backend/frontend/etc]` aparecem no [[90-Views/Kanban-Portfolio-Final]]

### → Dashboard ADRs
Decisões arquiteturais vão para [[20-Projetos/[PROJETO]/ADRs/]]

### → Dashboard Kaizens Técnicos
Melhorias técnicas identificadas vão para [[90-Views/Dashboard-Kaizen]]

---

## 📎 **ANEXOS TÉCNICOS**

### 📄 **Documentos Técnicos Relacionados**
- [[Link-RFC]]
- [[Link-Design-Doc]]
- [[Link-API-Spec]]

### 🎤 **Transcrição Completa**
[Cole aqui link para transcrição Tactiq ou arquivo .txt]

### 📸 **Diagramas/Screenshots**
[Links para diagramas, dashboards, traces, logs relevantes]

### 🔀 **Pull Requests / Issues**
- PR: [link]
- Issue: [link]

---

## 📦 **BLOCO ESTRUTURADO (YAML) — AUTOMAÇÃO**

```yaml
# ESTE BLOCO É PARA AUTOMAÇÃO (tickets, Obsidian queries, CI/CD)
# NÃO EDITAR MANUALMENTE — será gerado por script ou prompt

meeting_metadata:
  id: "MEET-AAAA-MM-DD-001"
  type: "architecture" # architecture | incident | planning | hybrid
  project: "CODIGO-PROJETO"
  system_area: ["backend", "frontend"] # lista de áreas afetadas
  date: "AAAA-MM-DD"
  participants: ["[[Dev 1]]", "[[Dev 2]]"]
  tech_lead: "[[Nome Tech Lead]]"
  duration_min: 60

adrs:
  - id: "ADR-001"
    title: "[Título da Decisão Arquitetural]"
    status: "accepted" # proposed | accepted | rejected | deprecated
    date: "AAAA-MM-DD"
    owner: "[[Nome]]"
    reviewers: ["[[Tech Lead]]"]
    reversibility: "moderate" # easy | moderate | hard | irreversible
    feature_flag: null # nome da flag ou null
    impact:
      performance: "+10%" # ou "-5%" ou "neutral"
      latency: "-20ms"
      cost_monthly: "+R$ 100"
      complexity: "increased" # increased | decreased | neutral
    links:
      rfc: null
      pr: null
      issue: null
      doc: null

decisions:
  - id: "D-001"
    title: "[Título da Decisão]"
    date: "AAAA-MM-DD"
    owner: "[[Nome]]"
    status: "approved" # proposed | approved | pending
    reversibility: "easy"
    alternatives_considered: ["A", "B", "C"]
    chosen: "A"

actions:
  - id: "A-001"
    title: "[Descrição da Ação Técnica]"
    owner: "[[Nome]]"
    priority: "P0" # P0 | P1 | P2 | P3
    due_date: "AAAA-MM-DD"
    status: "pending" # pending | in_progress | blocked | done
    area: "backend" # backend | frontend | mobile | infra | etc
    sprint: "Sprint-AAAA-WXX"
    acceptance_criteria: "[Critério específico e testável]"
    how_to_test: "[Como validar]"
    dependencies: []
    estimated_effort: "2d" # 2h | 1d | 2d | 1w
    links:
      branch: null
      pr: null
      issue: null
    needs_clarification: false

spikes:
  - id: "S-001"
    title: "[Título do Spike]"
    question: "[Pergunta técnica a responder]"
    owner: "[[Nome]]"
    timebox: "2d" # 2h | 1d | 2d
    due_date: "AAAA-MM-DD"
    status: "planned" # planned | in_progress | completed | cancelled
    expected_output: "[Formato da entrega]"
    success_criteria: ["critério 1", "critério 2"]
    blocks: ["D-001", "A-005"] # IDs de decisões/ações que estão bloqueadas
    needs_clarification: false

unknowns:
  - id: "Q-001"
    question: "[Pergunta técnica]"
    impact: "high" # high | medium | low
    blocks: ["D-001"] # IDs bloqueados
    how_to_resolve: "spike" # spike | research | ask_person | experiment
    owner: "[[Nome]]"
    due_date: "AAAA-MM-DD"
    status: "investigating" # investigating | answered | cancelled
    answer: null # preencher ao resolver
    needs_clarification: false

incidents:
  - id: "INC-001"
    title: "[Título do Incidente]"
    severity: "SEV-2" # SEV-1 | SEV-2 | SEV-3 | SEV-4
    status: "mitigated" # active | mitigated | resolved | postmortem
    impact:
      users_affected: "~1000"
      endpoints: ["/api/endpoint1"]
      regions: ["us-east-1"]
      data_loss: false
      sla_violated: true
    timeline:
      started_at: "AAAA-MM-DD HH:MM"
      detected_at: "AAAA-MM-DD HH:MM"
      mitigated_at: "AAAA-MM-DD HH:MM"
      resolved_at: "AAAA-MM-DD HH:MM"
    root_cause: "[Causa raiz técnica]"
    immediate_actions: ["ação 1", "ação 2"]
    follow_up_actions: ["A-001", "A-002"]
    postmortem_owner: "[[Nome]]"
    postmortem_due: "AAAA-MM-DD"
    links:
      postmortem: null
      incident_report: null

risks:
  - id: "R-001"
    description: "[Risco técnico]"
    area: "backend"
    probability: 4 # 1-5
    impact: 5 # 1-5
    severity: 20 # prob * impact
    status: "active" # active | monitoring | mitigated | closed
    mitigation: "[Ação preventiva]"
    contingency: "[Plano B]"
    trigger: "[Gatilho de alerta]"
    owner: "[[Nome]]"

blockers:
  - id: "B-001"
    description: "[Bloqueio técnico]"
    affects: ["A-001", "A-005"]
    cause: "[Causa raiz técnica]"
    dependency_type: "team" # team | person | system | vendor
    dependency_on: "[Nome/Sistema]"
    actions: ["ação para desbloquear"]
    owner: "[[Nome]]"
    escalation_path: ["[[Tech Lead]]", "[[Diretor]]"]
    escalation_threshold: "24h"
    status: "blocked" # blocked | resolving | unblocked

kaizens:
  - id: "K-001"
    title: "[Título do Kaizen]"
    type: "architecture" # architecture | process | tooling
    learning: "[Aprendizado]"
    recommendation: "[Recomendação]"
    expected_impact: "[Impacto esperado]"
    owner: "[[Nome]]"
    status: "proposed" # proposed | testing | implemented

next_meeting:
  date: "AAAA-MM-DD"
  time: "HH:MM"
  type: "architecture" # architecture | incident | planning
  agenda: ["tópico 1", "tópico 2"]
  preparation:
    - task: "[tarefa]"
      owner: "[[Nome]]"
      due: "AAAA-MM-DD"
```

---

**📊 Última Atualização**: DD/MM/AAAA HH:MM
**👤 Documentado por**: [[Nome do Facilitador]]
**🎯 Status**: Rascunho | Aprovada | Arquivada
**⚡ Versão**: 1.0
**📝 Template Version**: R01-DEV

---

## 🔖 **TAGS DE BUSCA**

#reuniao-dev #ata-tecnica #gestao-tecnica #[projeto] #[sprint] #dev-action #adr #spike #unknown #incidente #bloqueio #risco #kaizen-tecnico #arquitetura #performance #seguranca

---

## 📖 **GUIA DE USO DO TEMPLATE DEV**

### 🎯 **Como Usar Este Template**

**1. ANTES DA REUNIÃO:**
- [ ] Copiar template e renomear: `AAAA-MM-DD-DEV-[Titulo-Reuniao].md`
- [ ] Preencher frontmatter básico (projeto, tipo, área técnica, participantes)
- [ ] Definir agenda técnica preliminar
- [ ] Compartilhar docs técnicos relevantes (RFCs, diagramas, issues)
- [ ] Enviar agenda com 24-48h de antecedência

**2. DURANTE A REUNIÃO:**
- [ ] Identificar tipo de reunião (arquitetura/incidente/planejamento/híbrido)
- [ ] Registrar ADRs para decisões arquiteturais
- [ ] Documentar alternativas A/B com critérios de escolha
- [ ] Capturar spikes (pesquisas time-boxed) com resultado esperado
- [ ] Marcar unknowns (perguntas em aberto) que bloqueiam decisões
- [ ] Criar encaminhamentos com critério de aceite + como testar
- [ ] Se incidente: preencher timeline, causa raiz, ações imediatas

**3. APÓS A REUNIÃO:**
- [ ] Completar seção de encerramento
- [ ] Atualizar contadores no frontmatter (adrs, decisions, actions, spikes, unknowns)
- [ ] Verificar analytics de efetividade técnica
- [ ] Gerar bloco YAML estruturado (se usar automação)
- [ ] Compartilhar ATA com participantes (24h)
- [ ] Criar tickets/issues a partir das ações P0/P1
- [ ] Adicionar ADRs ao repositório de decisões arquiteturais

---

### 🧩 **Módulos Opcionais (ativar conforme necessário)**

**MÓDULO: ARQUITETURA**
- Usar quando: discussão de design, mudança de stack, refatoração, contratos
- Blocos: ADRs obrigatórios, diagramas, NFRs, contratos

**MÓDULO: INCIDENTE**
- Usar quando: bug crítico, incidente de produção, postmortem
- Blocos: Timeline, causa raiz, hipóteses testadas, evidências, prevenção

**MÓDULO: PLANEJAMENTO**
- Usar quando: sprint planning, refinamento, estimativas
- Blocos: Backlog priorizado, dependências, critérios de pronto, riscos de cronograma

**MÓDULO: PERFORMANCE**
- Usar quando: otimização, latência, throughput, custo
- Blocos: Benchmarks, métricas antes/depois, SLOs/SLAs

**MÓDULO: SEGURANÇA**
- Usar quando: vulnerabilidade, compliance, autenticação, autorização
- Blocos: Threat model, surface de ataque, mitigações

**MÓDULO: DATABASE/MIGRAÇÃO**
- Usar quando: schema change, migração de dados, novo DB
- Blocos: DDL, rollback plan, data validation

---

### 🔧 **Customizações Recomendadas**

- **Reuniões Curtas (<30min):** Simplificar módulos, focar em decisões + ações
- **Reuniões de Arquitetura:** Expandir ADRs, adicionar diagramas detalhados
- **Incidentes:** Focar timeline + causa raiz + prevenção
- **Planning:** Focar backlog + dependências + riscos de cronograma
- **Code Review:** Adicionar seção de padrões/convenções discutidos

---

### 💡 **Dicas de Produtividade**

1. **Use Tactiq:** Transcrição automática de reuniões Google Meet/Zoom
2. **ADRs = Memória Técnica:** Toda decisão arquitetural importante vira ADR rastreável
3. **Spikes = Pesquisa Time-boxed:** Sempre com pergunta clara + resultado esperado + deadline
4. **Unknowns = Bloqueadores:** Capturar incertezas que impedem decisões
5. **Critérios de Aceite:** Sempre específicos e testáveis para ações P0/P1
6. **Bloco YAML:** Útil para automação de tickets, dashboards, CI/CD
7. **Analytics:** Se efetividade < 7, revisar formato/preparação da reunião

---

### ⚠️ **Regras Anti-Alucinação (para prompts/IA)**

- ❌ **NUNCA inventar:** owner, prazo, link, métrica se não estiver na transcrição
- ✅ **SEMPRE marcar:** `needs_clarification: true` se faltar informação crítica
- ✅ **SEMPRE forçar:** alternativas A/B para decisões técnicas
- ✅ **SEMPRE exigir:** critério de aceite + como testar para ações P0/P1
- ✅ **SEMPRE separar:** spike (pesquisa) de task (execução)
- ✅ **SEMPRE capturar:** unknowns que bloqueiam decisões

---

*Template criado em: 2026-02-25*
*Versão: R01-DEV (Template para Reuniões de Desenvolvedores)*
*Autor: UzzAI Team*
*Baseado em: ATA-REUNIÃO-TEMPLATE-R02 + ADR Pattern + Incident Response Best Practices*

*Diferenças vs R02 (gestão geral):*
- ✅ ADRs (Architecture Decision Records) com alternativas e reversibilidade
- ✅ Spikes time-boxed (pesquisas técnicas)
- ✅ Unknowns (perguntas em aberto que bloqueiam decisões)
- ✅ Módulos específicos (arquitetura, incidente, planejamento)
- ✅ Critérios de aceite técnicos + como testar
- ✅ Bloco YAML estruturado para automação
- ✅ Detecção de tipo de reunião (architecture/incident/planning/hybrid)
- ✅ NFRs (Non-Functional Requirements) para decisões arquiteturais
- ✅ Timeline de incidentes com causa raiz e evidências
- ✅ Analytics técnicos (ADRs, spikes, unknowns, bloqueios)
