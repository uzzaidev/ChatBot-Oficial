# Itens Pendentes — 2026-04-15

> Lista de tudo que foi identificado, planejado ou iniciado mas NÃO está completo em produção.
> Atualizar este arquivo ao concluir cada item.

---

## Urgente — Precisa rodar antes de testar

### Aplicar migrations de metadata ao banco de produção

```bash
supabase db push
```

Migrations pendentes:
- `20260415110000_add_metadata_to_clientes_whatsapp.sql`
- `20260415113000_create_merge_contact_metadata_rpc.sql`

Sem isso, o fluxo de `registrar_dado_cadastral` vai falhar silenciosamente (a tool dispara mas a coluna não existe).

---

## Correções Aplicadas Neste Ciclo (pós-checkpoint inicial)

### Criação prematura de evento — CORRIGIDO

**Problema observado em produção:** Bot criou evento sem confirmação do usuário quando este estava apenas verificando opções ("ele me passou uma opção às 16h30").

**Causa:** Descrição da tool `criar_evento_agenda` era vaga sobre o que constitui uma solicitação.

**Correção aplicada:**
- `src/nodes/generateAIResponse.ts` — descrição da tool reescrita com fluxo obrigatório de 6 passos e lista explícita de situações onde NÃO criar
- `CONTATOS UMANA/prommpt Umana/prompt.md` — seção de horários expandida com o mesmo fluxo obrigatório e regras de linguagem de incerteza

**Fluxo correto agora documentado:**
1. Verificar disponibilidade de TODOS os horários mencionados
2. Apresentar opções disponíveis de uma vez
3. Aguardar o usuário escolher
4. Perguntar "Posso criar o evento para [dia/hora]?"
5. Aguardar confirmação explícita
6. Criar o evento

---

## Testes E2E Pendentes

### Calendário — Criação com confirmação (novo teste prioritário)
- [ ] Usuário menciona 2 opções de horário → bot verifica os 2 e apresenta ambos disponíveis
- [ ] Usuário escolhe um → bot pergunta "Posso criar?"
- [ ] Usuário confirma → evento criado
- [ ] Usuário diz "ainda não, quero ver mais opções" → bot NÃO cria

### Calendário — Cancelamento

- [ ] Testar via WhatsApp: "cancela aquela reunião de amanhã"
- [ ] Verificar se o evento foi removido no Google Calendar
- [ ] Testar com `event_id` explícito e sem `event_id` (fallback por título+data)
- [ ] Verificar resposta de confirmação do bot

### Calendário — Anti-duplicata

- [ ] Criar evento em uma conversa
- [ ] Encerrar conversa, retornar e pedir para criar o mesmo evento
- [ ] Bot deve reconhecer o `[SISTEMA] Evento agendado` e não duplicar

### CRM Metadata

- [ ] Primeira conversa: bot coleta CPF, email, como_conheceu, objetivo → verificar no Supabase
- [ ] Segunda conversa: bot NÃO pede dados já coletados → verificar injeção do "DADOS JÁ COLETADOS"
- [ ] Coleta parcial (só email) → bot pede apenas os campos ausentes
- [ ] Cliente diferente da Umåna → metadata fica `{}`, sem erro

### Umåna — Prompt

- [ ] Verificar se bot usa "às Xh" (com crase) nos horários
- [ ] Verificar se bot usa "técnicas corporais" e não "posturas básicas"
- [ ] Verificar se bot diferencia visita gratuita vs aula experimental paga
- [ ] Verificar se bot não confirma agendamentos fora da grade (seg-qui 10h-13h, 15h-20h / sex 15h-18h)
- [ ] Verificar se bot não usa `**` ou `###` nas respostas

---

## Bugs Conhecidos

### Bug accordion nos templates

**Status:** Não reproduzido — aguarda descrição exata do comportamento com o cliente.

**Para investigar:**
- Identificar o componente accordion no dashboard de templates
- Reproduzir: abrir múltiplos templates, expandir/colapsar
- Verificar estado local vs compartilhado

### Bug PDF header na UI

**Status:** Backend suporta, UI ainda não.

**O que falta:**
- Componente de upload de PDF no formulário de criação de template
- Seletor de tipo de header (Imagem / Documento)
- Preview do documento antes de enviar

---

## Backlog — Próximas Implementações

### CRM Opção B — crm_field_definitions + crm_field_values

**Por que:** Escalabilidade — cada cliente configura seus próprios campos via dashboard, com validação de tipos.

**Esforço estimado:** Alto (2 migrations + API + UI)

**Detalhes:** `twin-plans/PLANO_CRM_METADATA_OPCAO_A.md` (seção Opção B)

---

### View de Agendamentos no Dashboard (Opção D CRM)

**Por que:** Substituir planilha Google Sheets da Umåna por view nativa na plataforma.

**Colunas baseadas na planilha:**
`Mês | Dia | Responsável | Prospect | Tipo | Horário | Instrutor | Tecnofit | Slack | Mensagem agendada`

**Dados:** Populados automaticamente pelo bot ao confirmar agendamento.

**Referência visual:** Google Sheets "Gestão Casa Rio Branco 2026" → aba "Agendamento de Aulas/Visitas 26"

**Esforço estimado:** Alto (nova página + componentes + API)

---

### Confirmar termo "Krazy" com cliente Umåna

**Status:** Mencionado na transcrição de reunião ("sempre utilizar o Krazy corretamente") mas não identificado.

**Ação:** Perguntar ao cliente o que é esse sistema/ferramenta antes de implementar.

---

### Stripe Connect — Completar implementação

**Status:** 85% completo (desde checkpoint 2026-03-15).

**Pendente:**
- Env vars de produção
- Webhooks de produção
- Testes de ponta a ponta

---

## Referências

- Plano completo: `twin-plans/PLANO_UMANA_MELHORIAS_2026-04.md`
- Plano CRM Opção A: `twin-plans/PLANO_CRM_METADATA_OPCAO_A.md`
- Prompt Umåna: `CONTATOS UMANA/prommpt Umana/prompt.md`
