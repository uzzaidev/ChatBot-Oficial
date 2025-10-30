'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Mail, UserPlus, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminHomePage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvites: 0,
    totalClients: 0, // Novo: número de clientes/tenants únicos
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Buscar usuários
      const usersResponse = await fetch('/api/admin/users')
      const usersData = await usersResponse.json()
      
      // Buscar convites
      const invitesResponse = await fetch('/api/admin/invites?status=pending')
      const invitesData = await invitesResponse.json()

      const users = usersData.users || []
      const activeCount = users.filter((u: any) => u.is_active).length
      
      // Contar clientes únicos (apenas para super admin)
      const uniqueClients = new Set(users.map((u: any) => u.client_id)).size

      setStats({
        totalUsers: users.length,
        activeUsers: activeCount,
        pendingInvites: invitesData.total || 0,
        totalClients: uniqueClients,
      })
    } catch (err) {
      console.error('[AdminHomePage] Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Novo Usuário',
      description: 'Adicionar novo membro à equipe',
      icon: UserPlus,
      href: '/admin/users/new',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      title: 'Enviar Convite',
      description: 'Convidar por email',
      icon: Mail,
      href: '/admin/invites',
      color: 'text-purple-600 bg-purple-50',
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Ver e editar usuários',
      icon: Users,
      href: '/admin/users',
      color: 'text-green-600 bg-green-50',
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-500 mt-1">Bem-vindo ao painel de administração</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-2xl font-bold text-gray-400">...</p>
              ) : (
                <div>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.activeUsers} ativos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes/Tenants</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-2xl font-bold text-gray-400">...</p>
              ) : (
                <div>
                  <div className="text-2xl font-bold">{stats.totalClients}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Clientes pagos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-2xl font-bold text-gray-400">...</p>
              ) : (
                <div>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Podem fazer login
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
              <Mail className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-2xl font-bold text-gray-400">...</p>
              ) : (
                <div>
                  <div className="text-2xl font-bold">{stats.pendingInvites}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    Aguardando aceitação
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="ghost" className="w-full justify-between">
                        Acessar
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sobre o Painel Administrativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-600">
            <p>
              <strong>Gerenciar Usuários:</strong> Crie, edite e desative usuários da equipe.
            </p>
            <p>
              <strong>Convites:</strong> Envie convites por email para novos membros. Os convites expiram em 7 dias.
            </p>
            <p>
              <strong>Roles:</strong> Usuários podem ter as funções de Admin (gerencia equipe) ou Usuário (acesso padrão).
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
