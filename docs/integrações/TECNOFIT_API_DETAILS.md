# 🔑 Detalhes da API Tecnofit - Informações Técnicas

**Data:** 2026-02-01  
**Fonte:** Documentação oficial da Tecnofit

---

## 🔐 Autenticação

### Login (Obrigatório)

**Endpoint:** `POST https://integracao.tecnofit.com.br/v1/auth/login`

**Body:**
```json
{
  "api_key": "string (21 caracteres)",
  "api_secret": "string (26 caracteres)"
}
```

**Resposta (200):**
```json
{
  "token": "JWT_TOKEN_AQUI",
  "expires_in": 3600  // Opcional, segundos até expiração
}
```

**Códigos de Status:**
- `200` - Login realizado com sucesso
- `400` - Erro de decodificação do JSON
- `401` - Erro de autenticação (credenciais inválidas)
- `405` - Método não permitido
- `422` - Erro de validação
- `429` - Limite de requisições excedido
- `500` - Erro interno do servidor

**⚠️ IMPORTANTE:**
- Token JWT é necessário para TODAS as requisições subsequentes
- Token expira (assumir 1 hora se `expires_in` não for fornecido)
- Usar header `Authorization: Bearer {token}` em todas as requisições

---

## 📋 Endpoints Disponíveis

### 1. Listar Empresas

**Endpoint:** `GET /v1/companies`

**Headers:**
- `Authorization: Bearer {token}` (obrigatório)
- `Accept: application/json`

**Query Params:**
- `page` (integer) - Página (default: 1)
- `limit` (integer) - Limite por página (1-50, default: 50)

**Resposta (200):**
```json
{
  "data": [
    {
      "id": 123,
      "name": "Nome da Empresa",
      // ... outros campos
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "total_pages": 2
  }
}
```

**Nota:** Empresas podem ser "Avulsas" (único ID) ou "Multiempresa" (matriz retorna todas as unidades).

---

### 2. Listar Clientes

**Endpoint:** `GET /v1/customers`

**Headers:**
- `Authorization: Bearer {token}` (obrigatório)
- `Accept: application/json`

**Query Params:**
- `page` (integer, ≥ 1) - Página
- `limit` (integer, 1-100) - Limite por página
- `sort` (enum: `asc`, `desc`) - Ordenação
- `order` (enum: `id`, `name`, `createdAt`) - Campo de ordenação
- `status` (string) - Filtrar por status
- `type` (enum: `customer`, `prospect`) - Tipo de cliente
- `email` (string) - Filtrar por email (busca exata, case-insensitive)
- `cpf` (string) - Filtrar por CPF (aceita com ou sem formatação)
- `gender` (enum: `F`, `M`) - Filtrar por sexo
- `createStartDate` (string) - Data inicial de criação
- `createEndDate` (string) - Data final de criação

**Resposta (200):**
```json
{
  "data": [
    {
      "id": 456,
      "name": "Nome do Cliente",
      "email": "cliente@email.com",
      "cpf": "12345678900",
      "type": "customer",  // ou "prospect"
      "gender": "M",  // ou "F"
      "status": "ativo",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 3. Listar Contratos

**Endpoint:** `GET /v1/contracts`

**Headers:**
- `Authorization: Bearer {token}` (obrigatório)
- `Accept: application/json`

**Query Params:**
- `page` (integer, ≥ 1) - Página
- `limit` (integer, 1-100) - Limite por página
- `sort` (enum: `asc`, `desc`) - Ordenação
- `order` (enum: `id`, `name`) - Campo de ordenação
- `dueDateType` (enum: `session`, `period`, `monthly`) - Tipo de vencimento
- `allowAutomaticRenew` (enum: `0`, `1`) - Renovação automática
- `modalityId` (integer, ≥ 1) - Filtrar por modalidade

**Resposta (200):**
```json
{
  "data": [
    {
      "id": 789,
      "name": "Plano Mensal",
      // ... outros campos
    }
  ]
}
```

---

### 4. Listar Modalidades

**Endpoint:** `GET /v1/modalities`

**Headers:**
- `Authorization: Bearer {token}` (obrigatório)
- `Accept: application/json`

**Query Params:**
- `page` (integer, ≥ 1) - Página
- `limit` (integer, 1-100) - Limite por página
- `sort` (enum: `asc`, `desc`) - Ordenação
- `order` (enum: `id`, `name`) - Campo de ordenação

**Resposta (200):**
```json
{
  "data": [
    {
      "id": 10,
      "name": "Bem-Estar",
      // ... outros campos
    }
  ]
}
```

**Nota:** Modalidades podem ser usadas como filtro na listagem de contratos.

---

### 5. Frequências de Cliente Específico

**Endpoint:** `GET /v1/customers/{id}/attendances`

**Headers:**
- `Authorization: Bearer {token}` (obrigatório)
- `Accept: application/json`

**Path Params:**
- `id` (integer, ≥ 1) - ID do cliente (obrigatório)

**Query Params:**
- `startDate` (date, formato: YYYY-MM-DD) - Data inicial (obrigatório)
- `endDate` (date, formato: YYYY-MM-DD) - Data final (obrigatório)
- `type` (enum: `turnstile`, `class`, `crossfit`) - Tipo de frequência
- `page` (integer, ≥ 1) - Página
- `limit` (integer, 1-50) - Limite por página

**Resposta (200):**
```json
{
  "data": [
    {
      "id": 111,
      "customerId": 456,
      "type": "turnstile",  // ou "class", "crossfit"
      "date": "2024-01-15",
      "time": "08:30:00"
    }
  ]
}
```

**Nota:** Retorna presenças do aluno (catraca, check-ins em turmas ou programas).

---

### 6. Frequências da Empresa

**Endpoint:** `GET /v1/attendances`

**Headers:**
- `Authorization: Bearer {token}` (obrigatório)
- `Accept: application/json`

**Query Params:**
- `startDate` (date, formato: YYYY-MM-DD) - Data inicial (obrigatório)
- `endDate` (date, formato: YYYY-MM-DD) - Data final (obrigatório)
- `type` (enum: `turnstile`, `class`, `crossfit`) - Tipo de frequência (obrigatório)
- `page` (integer, ≥ 1) - Página
- `limit` (integer, 1-50) - Limite por página

**Resposta (200):**
```json
{
  "data": [
    {
      "id": 222,
      "customerId": 456,
      "type": "turnstile",
      "date": "2024-01-15",
      "time": "08:30:00"
    }
  ]
}
```

**Nota:** Retorna presenças de TODOS os alunos da empresa.

**Códigos de Status Adicionais:**
- `403` - Permissão negada (apenas para este endpoint)

---

## ⚠️ Rate Limits

- **100 requisições por minuto** por endpoint individual
- **200 requisições por minuto** global (todos os endpoints combinados)

**Estratégia de Implementação:**
- Delay de 600ms entre requisições (≈100 req/min)
- Retry com backoff exponencial em caso de 429
- Cache de tokens JWT para evitar logins repetidos

---

## 🔄 Fluxo de Autenticação Recomendado

```typescript
// 1. Fazer login uma vez
const loginResponse = await loginTecnofit({ apiKey, apiSecret });
const token = loginResponse.token;

// 2. Cachear token (assumir expiração de 1 hora)
const expiresAt = Date.now() + (loginResponse.expires_in || 3600) * 1000;

// 3. Usar token em todas as requisições
const response = await axios.get('/v1/customers', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 4. Se receber 401, fazer novo login e retry
if (response.status === 401) {
  const newToken = await loginTecnofit({ apiKey, apiSecret });
  // Retry com novo token
}
```

---

## 📝 Notas Importantes

1. **Base URL**: `https://integracao.tecnofit.com.br/v1` (não `api.tecnofit.com.br`)
2. **Formato de Data**: Sempre `YYYY-MM-DD` para datas
3. **Paginação**: Sempre implementar loop até `hasMore = false`
4. **Filtros**: Email e CPF são busca exata (não parcial)
5. **Multi-empresa**: Token JWT já contém informações da empresa (não precisa header `X-Company-Id`)

---

**Última atualização:** 2026-02-01


