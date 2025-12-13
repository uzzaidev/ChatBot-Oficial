'use client'

/**
 * AI GATEWAY OVERVIEW PAGE
 * 
 * Main landing page for AI Gateway with quick access to all sections
 */

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Database, Boxes, BarChart3, DollarSign, ArrowRight } from 'lucide-react'
import { AIGatewayNav } from '@/components/AIGatewayNav'

export default function AIGatewayPage() {
  const sections = [
    {
      href: '/dashboard/ai-gateway/setup',
      icon: Settings,
      title: 'Setup',
      description: 'Configure API keys e configurações do AI Gateway',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      href: '/dashboard/ai-gateway/cache',
      icon: Database,
      title: 'Cache',
      description: 'Visualize e gerencie o cache de respostas',
      color: 'text-green-600 bg-green-50',
    },
    {
      href: '/dashboard/ai-gateway/models',
      icon: Boxes,
      title: 'Models',
      description: 'Gerencie os modelos de IA disponíveis',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      href: '/dashboard/ai-gateway/analytics',
      icon: BarChart3,
      title: 'Analytics',
      description: 'Métricas agregadas de uso do Gateway',
      color: 'text-orange-600 bg-orange-50',
    },
    {
      href: '/dashboard/ai-gateway/budget',
      icon: DollarSign,
      title: 'Budget',
      description: 'Controle de limites e custos por cliente',
      color: 'text-emerald-600 bg-emerald-50',
    },
  ]

  return (
    <>
      <AIGatewayNav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Gateway</h1>
          <p className="text-muted-foreground">
            Gerenciamento centralizado do Vercel AI Gateway para todos os clientes
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {sections.map((section) => {
            const Icon = section.icon

            return (
              <Link key={section.href} href={section.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${section.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {section.description}
                        </CardDescription>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Status do Gateway
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-semibold">Operacional</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Providers Configurados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">4</p>
              <p className="text-xs text-muted-foreground mt-1">
                OpenAI, Groq, Anthropic, Google
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Economia com Cache
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">~30%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Economia estimada em custos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recursos do AI Gateway</CardTitle>
            <CardDescription>
              Vantagens do uso do Vercel AI Gateway centralizado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Multi-tenant:</strong> API keys compartilhadas entre todos os clientes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Cache inteligente:</strong> Economia de custos com respostas cacheadas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Fallback automático:</strong> Troca de modelo em caso de falha</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Tracking completo:</strong> Logs de uso, custos e performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Sem markup:</strong> Gateway gratuito da Vercel, sem custos adicionais</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Controle por cliente:</strong> Budgets e limites de uso individuais</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Budget Note */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Controle de Budget</p>
                <p className="text-sm text-blue-800 mt-1">
                  O controle de budget por cliente está configurado na tabela <code className="bg-blue-100 px-1 rounded">client_budgets</code>.
                  Cada cliente pode ter limites diários/mensais de tokens e BRL. O sistema bloqueia requisições quando o limite é atingido.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
