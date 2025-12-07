# Checklist de Testes Manuais - Transfer to Bot/Human

Guia completo para testar a funcionalidade de transferência.

## Cenário 1: AI Handoff com Auto-Resposta

### Setup
1. Criar flow: Start → Message → Interactive Buttons → AI Handoff
2. Configurar AI Handoff:
   - Mensagem: 'Conectando ao assistente...'
   - Auto-resposta: ATIVADO
   - Incluir contexto: ATIVADO
   - Formato: Resumo

### Validações
- Cliente recebe mensagem de transição
- Bot responde automaticamente
- Resposta menciona dados coletados
- Status = 'bot'
- Flow status = 'transferred_ai'

## Cenário 2: Human Handoff

### Setup
1. Criar flow: Start → Message → Human Handoff
2. Configurar Human Handoff:
   - Mensagem: 'Transferindo para atendente...'
   - Notificar agente: ATIVADO

### Validações
- Cliente recebe mensagem
- Status = 'humano'
- Flow status = 'transferred_human'
- Agente recebe notificação

## Critérios de Aceitação
- Todos os cenários funcionam sem erros
- Mensagens chegam corretamente
- Banco atualiza corretamente
- Performance < 2s

