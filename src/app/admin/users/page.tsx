'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { UserPlus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { UserProfile } from '@/lib/types'

// Extended type to include client_name from API
interface UserProfileWithClient extends UserProfile {
  client_name?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfileWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('is_active', statusFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar usuários')
      }

      setUsers(data.users || [])

      // Detectar role do usuário atual (super admin vê coluna de client)
      if (data.users && data.users.length > 0) {
        // Se algum usuário tem client_name, significa que é super admin
        const hasClientNames = data.users.some((u: any) => u.client_name)
        setCurrentUserRole(hasClientNames ? 'admin' : 'client_admin')
      }
    } catch (err: any) {
      setError(err.message)
      console.error('[AdminUsersPage] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [roleFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      admin: 'destructive',
      client_admin: 'default',
      user: 'secondary',
    }
    const labels: Record<string, string> = {
      admin: 'Super Admin',
      client_admin: 'Admin',
      user: 'Usuário',
    }
    return (
      <Badge variant={variants[role] || 'outline'}>
        {labels[role] || role}
      </Badge>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-500 mt-1">Gerencie os membros da equipe</p>
          </div>
          <Link href="/admin/users/new">
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email ou nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Role Filter */}
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os roles</SelectItem>
                  <SelectItem value="admin">Super Admin</SelectItem>
                  <SelectItem value="client_admin">Admin</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="true">Ativos</SelectItem>
                  <SelectItem value="false">Desativados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Carregando usuários...</p>
            </CardContent>
          </Card>
        )}

        {/* Users List */}
        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>
                {users.length} usuário{users.length !== 1 ? 's' : ''} encontrado{users.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhum usuário encontrado
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Nome</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                        {currentUserRole === 'admin' && (
                          <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente/Tenant</th>
                        )}
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Telefone</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">
                              {user.full_name || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          {currentUserRole === 'admin' && (
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {user.client_name || 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                  {user.client_id.substring(0, 8)}...
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                          <td className="py-3 px-4">
                            {user.is_active ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                Desativado
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{user.phone || '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <Link href={`/admin/users/${user.id}`}>
                              <Button variant="ghost" size="sm">
                                Editar
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
