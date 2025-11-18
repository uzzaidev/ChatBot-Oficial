'use client'

import { ConversationUsageTable } from '@/components/ConversationUsageTable'
import type { ConversationUsage } from '@/lib/types'

// Mock data for demonstration
const mockData: ConversationUsage[] = [
  {
    phone: '+55 11 98765-4321',
    conversation_name: 'Cliente Premium - João Silva',
    total_tokens: 125430,
    openai_tokens: 85230,
    groq_tokens: 40200,
    total_cost: 2.4567,
    request_count: 342,
  },
  {
    phone: '+55 21 97654-3210',
    conversation_name: 'Suporte Técnico - Maria Santos',
    total_tokens: 98765,
    openai_tokens: 45000,
    groq_tokens: 53765,
    total_cost: 1.8234,
    request_count: 256,
  },
  {
    phone: '+55 31 96543-2109',
    conversation_name: 'Vendas - Pedro Costa',
    total_tokens: 87654,
    openai_tokens: 60000,
    groq_tokens: 27654,
    total_cost: 1.5432,
    request_count: 198,
  },
  {
    phone: '+55 41 95432-1098',
    conversation_name: 'Atendimento - Ana Paula',
    total_tokens: 76543,
    openai_tokens: 40000,
    groq_tokens: 36543,
    total_cost: 1.3210,
    request_count: 167,
  },
  {
    phone: '+55 51 94321-0987',
    conversation_name: 'Financeiro - Carlos Eduardo com um nome muito longo para testar truncamento',
    total_tokens: 65432,
    openai_tokens: 30000,
    groq_tokens: 35432,
    total_cost: 1.1098,
    request_count: 145,
  },
  {
    phone: '+55 61 93210-9876',
    conversation_name: 'RH - Juliana Almeida',
    total_tokens: 54321,
    openai_tokens: 25000,
    groq_tokens: 29321,
    total_cost: 0.9876,
    request_count: 123,
  },
  {
    phone: '+55 71 92109-8765',
    conversation_name: 'TI - Roberto Ferreira',
    total_tokens: 43210,
    openai_tokens: 20000,
    groq_tokens: 23210,
    total_cost: 0.8654,
    request_count: 101,
  },
  {
    phone: '+55 81 91098-7654',
    conversation_name: 'Marketing - Fernanda Lima',
    total_tokens: 32109,
    openai_tokens: 15000,
    groq_tokens: 17109,
    total_cost: 0.7432,
    request_count: 89,
  },
]

export default function TestTablePage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Test: Conversation Usage Table</h1>
          <p className="text-muted-foreground mt-2">
            Demo da nova tabela customizável com sorting, column visibility, e reordering
          </p>
        </div>
        
        <ConversationUsageTable data={mockData} />
      </div>
    </div>
  )
}
