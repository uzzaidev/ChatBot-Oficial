# PLANO: Add to CRM Toggle no Dialog de Importação de Contatos

## Problema Atual

O dialog de importação de contatos em `ContactsClient.tsx` insere contatos na tabela `clientes_whatsapp` mas não cria cards no CRM. Não há como vincular uma importação em massa ao pipeline do CRM.

## Solução Proposta

Adicionar um toggle "Adicionar ao CRM" no dialog de importação. Quando ativado, o usuário seleciona uma coluna do CRM (defaultando para a primeira por posição) e, após a importação dos contatos, cada contato importado com sucesso recebe um card criado na coluna escolhida. Contatos já existentes (`skipped`) não geram card. O comportamento atual é preservado quando o toggle está desativado.

A lógica de criação dos cards será centralizada no backend (`/api/contacts/import`) para evitar N requisições do frontend (uma por contato). O endpoint receberá `addToCrm` e `columnId` opcionais no body.

---

## Componentes UI a Reutilizar

- `@/components/ui/switch` — já importado em `ContactsClient.tsx`, usado para o toggle
- `@/components/ui/select` — já importado em `ContactsClient.tsx`, usado para o dropdown de colunas
- `@/components/ui/label` — já importado em `ContactsClient.tsx`, usado para label do toggle

---

## Arquivos a Modificar

### 1. `/src/lib/types.ts`

Estender `ContactImportResult` com dois campos opcionais:
- `cardsCreated?: number` — total de cards criados com sucesso no CRM
- `cardErrors?: number` — total de falhas ao criar cards (contato importado mas card falhou)

Esses campos são opcionais para manter retrocompatibilidade com quem usa o tipo sem CRM.

---

### 2. `/src/app/api/contacts/import/route.ts`

Este é o arquivo central da mudança no backend.

**Mudanças no body parsing:**
- Além de `contacts`, aceitar `addToCrm?: boolean` e `columnId?: string`

**Nova lógica após inserção dos contatos (executa apenas se `addToCrm === true` e `columnId` é fornecido):**

1. Coletar os telefones dos contatos que foram efetivamente importados (não skipped, não com erro)
2. Para cada telefone importado:
   a. Buscar o próximo `position`: `SELECT COALESCE(MAX(position), 0) + 1 FROM crm_cards WHERE column_id=$1`
      - Usar `MAX` em vez de `ORDER BY ... LIMIT 1` para evitar race condition com posições gaps
   b. Inserir o card: `INSERT INTO crm_cards (client_id, column_id, phone, position) VALUES ($1,$2,$3,$4)`
   c. Inserir o log de atividade: `INSERT INTO crm_activity_log (client_id, card_id, activity_type, is_automated) VALUES ($1,$2,'created',true)`
      - `is_automated = true` porque é uma operação em massa, não manual
   d. Em caso de erro `23505` (unique constraint — card já existe para esse telefone nessa coluna): contar como `cardError`, não como falha crítica
   e. Qualquer outro erro também conta como `cardError`, não aborta os demais

3. Retornar `cardsCreated` e `cardErrors` no objeto `result`

**Validações a incluir:**
- Se `addToCrm === true` mas `columnId` não fornecido: retornar 400 com mensagem "columnId é obrigatório quando addToCrm está ativo"
- Se `columnId` fornecido mas a coluna não pertence ao `client_id` da requisição: ignorar silenciosamente (a FK constraint do banco vai rejeitar o insert e cair no `cardErrors`)

**Importante:** A criação dos cards deve ser feita em loop sequencial ou em Promise.all com controle de erro individual. Não deixar uma falha abortar as demais. Usar `try/catch` por card.

---

### 3. `/src/hooks/useContacts.ts`

Na função `importContacts`:
- Aceitar novos parâmetros opcionais: `addToCrm?: boolean` e `columnId?: string`
- Incluir esses campos no body do POST quando presentes
- O tipo de retorno `ContactImportResult` já vai refletir os novos campos após a mudança em `types.ts`

---

### 4. `/src/components/ContactsClient.tsx`

**Novos estados a adicionar:**
- `addToCrm: boolean` — estado do toggle (default: `false`)
- `selectedColumnId: string` — ID da coluna selecionada (default: `''`)
- `crmColumns: CRMColumn[]` — lista de colunas carregadas da API

**Carregar colunas do CRM:**
- Ao montar o componente (ou ao abrir o dialog pela primeira vez), fazer GET em `/api/crm/columns`
- Armazenar em `crmColumns`
- Se `crmColumns.length > 0`, definir `selectedColumnId` com o `id` da primeira coluna (index 0, que já vem ordenado por `position ASC`)
- Se não houver colunas, o toggle deve ser desabilitado com tooltip explicativo

**UI a adicionar no dialog (abaixo da área de upload/preview, acima do botão de confirmar):**

```
[ Switch ] Adicionar ao CRM após importação

(quando toggle ativo, mostrar:)
Coluna:
[ Select com lista de colunas ]
```

- O `<Switch>` controla `addToCrm`
- O `<Select>` fica visível apenas quando `addToCrm === true`
- O `<Select>` lista as colunas pelo `name`, com `value = id`
- Se `crmColumns` estiver vazio, o `<Switch>` fica `disabled`

**Atualizar chamada ao `handleImport`:**
- Passar `addToCrm` e `selectedColumnId` para `importContacts`
- Exibir no resultado da importação os campos `cardsCreated` e `cardErrors` quando presentes

**Exibição do resultado:**
- Se `cardsCreated > 0`: mostrar linha "X cards criados no CRM"
- Se `cardErrors > 0`: mostrar linha "X cards não puderam ser criados (contatos duplicados no CRM ou erro)"

---

## Ordem de Implementação

1. `src/lib/types.ts` — estender `ContactImportResult` com `cardsCreated` e `cardErrors`
   - Sem dependências. Deve ser feito primeiro para que TypeScript não reclame nos arquivos seguintes.

2. `src/app/api/contacts/import/route.ts` — implementar lógica de criação de cards no backend
   - Depende dos tipos atualizados em `types.ts`.
   - Centraliza a lógica e evita múltiplos round-trips do frontend.

3. `src/hooks/useContacts.ts` — adicionar parâmetros ao `importContacts`
   - Depende do endpoint atualizado.
   - Simples, apenas pass-through dos novos params.

4. `src/components/ContactsClient.tsx` — adicionar UI e estados
   - Depende do hook atualizado.
   - Fazer por último pois é a camada que integra tudo.

---

## Edge Cases a Tratar

| Caso | Comportamento Esperado |
|------|----------------------|
| Toggle ativo mas sem colunas no CRM | Switch desabilitado, importação normal |
| Contato importado mas já tem card nessa coluna (23505) | Conta como `cardError`, não falha a importação |
| `addToCrm=true` mas `columnId` não enviado | Backend retorna 400 |
| Coluna deletada entre carregar a lista e importar | FK falha no insert, conta como `cardError` |
| Todos os contatos foram `skipped` | `cardsCreated=0`, sem tentativas de criação |
| Importação parcial (alguns erros, alguns importados) | Cards criados apenas para os importados com sucesso |
| Toggle desativado | `addToCrm` não enviado no body, comportamento atual preservado |
| Coluna arquivada na lista | Não deve aparecer (o GET de colunas já filtra `is_archived=false`) |

---

## Riscos Técnicos

- **Performance em importações grandes:** Criar um card por contato em loop pode ser lento para centenas de contatos. Mitigação: usar `Promise.all` com tratamento de erro individual por card em vez de loop sequencial. Limitar o paralelismo se necessário (ex: chunks de 10).

- **Race condition na posição do card:** Se dois imports ocorrerem simultaneamente na mesma coluna, `MAX(position) + 1` pode gerar colisões. Mitigação: usar `ON CONFLICT DO NOTHING` na inserção de cards ou aceitar que a posição pode ter gaps (a UI do CRM geralmente reordena por drag-and-drop de qualquer forma).

- **Autorização da coluna:** O endpoint de import não valida se `columnId` pertence ao `client_id`. A FK no banco garantirá rejeição, mas o erro será silencioso (cai em `cardErrors`). Isso é aceitável mas pode ser melhorado com uma query de validação prévia se segurança for uma preocupação.

---

## Plano de Validação QA

### Setup
- Ter ao menos 2 colunas no CRM criadas
- Ter um arquivo CSV/lista de contatos para importar (mistura de novos e existentes)

### Fluxo Principal

1. Navegar para `/dashboard/contacts`
2. Abrir o dialog de importação de contatos
3. Verificar que o toggle "Adicionar ao CRM" aparece desabilitado inicialmente
4. Ativar o toggle — verificar que o Select de colunas aparece
5. Verificar que a primeira coluna está pré-selecionada no Select
6. Selecionar uma coluna diferente
7. Realizar a importação
8. Verificar que o resultado mostra "X cards criados no CRM"
9. Navegar para `/dashboard/crm` e verificar que os cards aparecem na coluna selecionada

### Toggle Desativado (Regressão)

1. Abrir dialog de importação com toggle desativado (estado padrão)
2. Importar contatos normalmente
3. Verificar que o resultado NÃO mostra campos de CRM
4. Verificar que nenhum card foi criado no CRM

### Edge Cases

- Importar o mesmo arquivo duas vezes com toggle ativo na mesma coluna: segunda importação deve reportar `cardErrors` para os contatos já no CRM (não duplicar cards)
- Importar com toggle ativo em conta sem colunas CRM criadas: toggle deve estar desabilitado ou mostrar mensagem "Nenhuma coluna disponível"
- Importar arquivo onde todos os contatos já existem (todos `skipped`): `cardsCreated=0`, sem tentativas de criar cards

### Validação de API (opcional, com curl ou Postman)

```
POST /api/contacts/import
Body: { "contacts": [...], "addToCrm": true, "columnId": "<uuid-coluna>" }
Esperado: 200 { success: true, result: { total, imported, skipped, errors, cardsCreated, cardErrors } }

POST /api/contacts/import
Body: { "contacts": [...], "addToCrm": true }  (sem columnId)
Esperado: 400 { error: "columnId é obrigatório quando addToCrm está ativo" }
```

---

## Benefícios

- Importação em massa com vinculação direta ao pipeline de CRM, eliminando trabalho manual de criar cards um a um após importar
- Implementação no backend evita N requisições HTTP do frontend (uma única requisição por importação)
- Toggle opcional garante zero impacto no fluxo atual de quem não usa CRM
- `is_automated=true` no log de atividade permite diferenciar cards criados por importação de cards criados manualmente
