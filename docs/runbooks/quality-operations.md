# Runbook - Quality Operations (S4/S5)

Este runbook consolida a operacao diaria de qualidade para o tenant piloto.

## 1) Checklist Diario

1. Validar saude dos crons no dashboard de qualidade (card "Saude dos crons").
2. Verificar tendencia de `success_rate` e `pending_ratio` (card "Tendencia diaria").
3. Revisar fila S4 (`/dashboard/quality/evaluations`) no painel "Fila S4".
4. Promover correcoes importantes para Ground Truth.
5. Gerar snapshot diario manual se necessario.

## 2) Endpoints Operacionais

- `GET /api/quality/cron-health`
  - Estado dos crons de reconciliacao e relatorio diario.
- `GET /api/quality/daily-report?days=7`
  - Historico de snapshots por tenant.
- `POST /api/quality/daily-report`
  - Forca geracao de snapshot para o tenant atual.
- `GET /api/evaluations/review-queue?lookbackDays=14&limit=100`
  - Fila de FAIL/REVIEW sem feedback humano.
- `GET /api/ground-truth/bootstrap-candidates?limit=30&lookbackDays=30`
  - Candidatos para bootstrap de GT.
- `POST /api/ground-truth/from-trace/bulk`
  - Promove varios traces para GT em lote.

## 3) Comandos de Cron Manual (PowerShell)

```powershell
# Reconciliar traces manualmente
curl.exe -X POST "https://SEU_DOMINIO/api/cron/traces-reconcile?lookbackHours=24&limit=400" `
  -H "authorization: Bearer $env:CRON_SECRET"

# Gerar KPI diario para tenant especifico
curl.exe -X POST "https://SEU_DOMINIO/api/cron/quality-daily-report?clientId=SEU_CLIENT_ID" `
  -H "authorization: Bearer $env:CRON_SECRET"
```

## 4) SQL de Checkpoint D+1

Use o script:

- `scripts/quality-checkpoint-readiness.sql`

Saidas esperadas:

- `READY_FOR_S5`: pode iniciar Sprint 5.
- `NOT_READY`: iterar prompt/captura e repetir em +24h.
- `AWAITING_DATA`: sem snapshot suficiente.

## 5) Playbook de Incidente

### Caso A - Pending sobe rapido

1. Rodar `POST /api/cron/traces-reconcile`.
2. Abrir `/dashboard/quality/traces` e verificar bucket principal.
3. Revisar logs Vercel de `/api/cron/traces-reconcile`.
4. Executar `scripts/quality-trace-validation.sql` para o tenant.

### Caso B - Cron diario nao atualiza

1. Confirmar `CRON_SECRET` no projeto Vercel.
2. Chamar manualmente `/api/cron/quality-daily-report`.
3. Verificar se `quality_daily_reports` recebeu linha nova.
4. Se falhar, inspecionar erro no log e credenciais DB.

### Caso C - Fila S4 sem reduzir

1. Revisar pelo menos 5 itens na fila (`review-queue`).
2. Promover correcoes recorrentes para GT.
3. Reavaliar no dia seguinte com tendencia e checkpoint.
