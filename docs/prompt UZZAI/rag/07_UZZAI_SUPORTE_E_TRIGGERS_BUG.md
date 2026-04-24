# UzzAI - Suporte, Bugs e Triggers de Deteccao

## Objetivo

Padronizar identificacao de casos de suporte/bug mesmo quando o cliente nao usa palavras explicitas.

## Triggers explicitos

- "bug", "erro", "falha", "travou", "instabilidade", "quebrou", "nao funciona"
- "deu erro", "parou", "nao abre", "nao carrega"

## Triggers implicitos (alta relevancia)

- "sumiu botao", "nao aparece opcao", "ficou em branco"
- "nao envia", "nao salva", "nao chegou mensagem"
- "fiz o mesmo processo e mudou resultado"
- "ontem funcionava, hoje nao"
- "respondeu nada a ver"
- "pulou etapa", "foi para lugar errado", "nao seguiu o fluxo"
- "cliente falou X e o bot respondeu Y"
- "respondeu outra coisa", "nao respondeu o que foi perguntado"

## Triggers operacionais de qualidade (observabilidade de atendimento)

Tambem considerar suporte quando houver relato de comportamento anomalo do atendimento, mesmo sem erro tecnico explicito:

- duplicidade de resposta: "mandou duas vezes", "respondeu duplicado"
- duplicidade de midia: "mandou duas imagens iguais", "anexou imagem repetida"
- duplicidade de envio do cliente sem necessidade: "precisei mandar duas vezes para funcionar"
- falta de sincronismo: "respondeu atrasado", "respondeu fora de ordem"
- inconsistencias de contexto: "misturou conversa", "trouxe assunto de outro tema"
- variacao inesperada de comportamento: "cada hora responde de um jeito para a mesma pergunta"

## Evidencia visual (print/imagem)

Quando houver print ou imagem:
- tratar como forte sinal de suporte, mesmo sem palavra "erro"
- cruzar texto + imagem para entender cenario
- se imagem ambigua, fazer 1 pergunta objetiva de confirmacao

## Protocolo minimo de triagem

1. Confirmar entendimento do problema em 1 frase.
2. Coletar 5 pontos:
   - acao executada pelo cliente
   - resultado observado
   - resultado esperado
   - momento da ocorrencia
   - impacto no negocio/atendimento
3. Definir severidade sugerida.
4. Definir causa provavel (heuristica).
5. Encaminhar para time tecnico quando houver bloqueio, recorrencia ou risco operacional.

Para casos de duplicidade/inconsistencia de resposta, coletar tambem:
- quantidade de repeticoes observadas
- tipo de conteudo repetido (texto, imagem, audio, documento)
- intervalo aproximado entre envios
- se ocorreu em um contato ou em varios
- se houve impacto direto no cliente final

## Heuristica de causa provavel

- `prompt`: comportamento de linguagem/interpretacao sem erro de infraestrutura
- `fluxo`: etapa indevida, logica de jornada, tool/handoff fora do timing
- `sistema`: timeout, erro API/webhook, persistencia, indisponibilidade de integracao, duplicidade por reprocessamento ou retry incorreto
- `unknown`: dados insuficientes

## Severidade sugerida

- `critical`: operacao parada, falha generalizada, perda de atendimento
- `high`: fluxo principal comprometido sem automacao confiavel
- `medium`: falha recorrente com alternativa manual
- `low`: inconsistencia visual/textual sem bloqueio

## Respostas seguras obrigatorias

- Nunca prometer prazo tecnico exato sem validacao humana.
- Nunca afirmar causa raiz definitiva sem evidencia.
- Sempre indicar que o caso sera analisado tecnicamente quando aplicavel.
