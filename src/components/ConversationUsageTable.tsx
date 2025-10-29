'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ConversationUsage } from '@/lib/types'

interface ConversationUsageTableProps {
  data: ConversationUsage[]
}

export function ConversationUsageTable({ data }: ConversationUsageTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso por Conversa</CardTitle>
        <CardDescription>
          Top 20 conversas que mais consumiram tokens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-muted rounded-lg font-medium text-sm">
              <div>Telefone</div>
              <div>Nome</div>
              <div className="text-right">Total Tokens</div>
              <div className="text-right">Custo</div>
              <div className="text-right">Requisições</div>
            </div>

            {data.map((conversation, index) => (
              <div
                key={index}
                className="grid grid-cols-5 gap-4 px-4 py-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="text-sm font-mono">{conversation.phone}</div>
                <div className="text-sm truncate" title={conversation.conversation_name}>
                  {conversation.conversation_name}
                </div>
                <div className="text-sm text-right">
                  <div className="font-semibold">
                    {Number(conversation.total_tokens || 0).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-muted-foreground space-x-2">
                    <span title="OpenAI">
                      🟢 {Number(conversation.openai_tokens || 0).toLocaleString('pt-BR')}
                    </span>
                    <span title="Groq">
                      🟣 {Number(conversation.groq_tokens || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-right font-medium">
                  ${Number(conversation.total_cost || 0).toFixed(4)}
                </div>
                <div className="text-sm text-right text-muted-foreground">
                  {Number(conversation.request_count || 0)}
                </div>
              </div>
            ))}

            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de uso disponível
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
