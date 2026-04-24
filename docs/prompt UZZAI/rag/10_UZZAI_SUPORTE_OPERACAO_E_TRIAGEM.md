# UzzAI - Suporte, Operacao e Triagem

## Gatilhos obrigatorios para transferencia humana

- Caso sensivel juridico/comercial critico
- Falha repetida
- Baixa confianca da resposta automatica
- Pedido explicito do cliente para humano
- Risco reputacional ou contratual

## Dados minimos antes de escalar ticket

- Cliente/empresa
- Numero e canal
- Data e hora
- Fluxo acionado
- Mensagem de erro
- Print ou video
- Resultado esperado versus obtido
- Prioridade e impacto

## Formato padrao de triagem tecnica

Sintoma -> impacto -> reproducao -> escopo afetado -> classificacao (severidade + causa raiz) -> decisao (corrigir/configurar/escalar).

## Classificacao de causa raiz

- Prompt: instrucao/base semantica
- Fluxo: regras, automacao e orquestracao
- Sistema: infraestrutura, integracao, API e persistencia

## Classificacao de severidade (exemplos)

- Critical: operacao parada para cliente pagante
- High: funcionalidade-chave degradada sem workaround robusto
- Medium: falha parcial com workaround
- Low: erro cosmetico ou melhoria

## Criterio bug versus configuracao esperada

- Bug: comportamento fora da regra documentada
- Configuracao esperada: comportamento previsto por politica ou limitacao conhecida de integracao

## FAQ tecnica recorrente de clientes ativos

- Por que nao respondeu?
- Por que respondeu errado?
- Como subir novo fluxo?
- Como rastrear lead?
- Como ajustar gatilho?

## Diretriz de resposta curta no suporte

Responder com:
- confirmacao do problema
- proximo passo objetivo
- prazo estimado quando houver base
- responsavel humano quando necessario

## Referencia de resposta operacional

Para padronizar linguagem em casos recorrentes (respondeu errado, duplicidade, atraso, fora de contexto), usar:

- `13_UZZAI_PLAYBOOK_RESPOSTAS_PADRAO_SUPORTE.md`
