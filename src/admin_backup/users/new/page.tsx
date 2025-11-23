'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { CreateUserRequest } from '@/lib/types'

interface Client {
  id: string
  name: string
  slug: string
  status: string
}

export default function NewUserPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentClientId, setCurrentClientId] = useState<string | null>(null)
  const [currentClientName, setCurrentClientName] = useState<string>('')
  const [clients, setClients] = useState<Client[]>([])
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    phone: '',
    client_id: undefined,
    permissions: {},
  })

  // Buscar role do usuário atual e lista de clients
  useEffect(() => {
    const fetchUserAndClients = async () => {
      try {
        setLoadingClients(true)

        // Buscar clients
        const clientsResponse = await fetch('/api/admin/clients?status=active')
        const clientsData = await clientsResponse.json()

        if (clientsResponse.ok && clientsData.clients) {
          setClients(clientsData.clients)

          // Se há apenas 1 client, é client_admin (vê apenas o próprio)
          // Se há múltiplos clients, é super admin
          const isSuperAdmin = clientsData.clients.length > 1

          if (isSuperAdmin) {
            setCurrentUserRole('admin')
          } else if (clientsData.clients.length === 1) {
            setCurrentUserRole('client_admin')
            setCurrentClientId(clientsData.clients[0].id)
            setCurrentClientName(clientsData.clients[0].name)
            // Pré-selecionar o client_id do client_admin
            setFormData(prev => ({ ...prev, client_id: clientsData.clients[0].id }))
          }
        }
      } catch (err) {
        console.error('Error fetching clients:', err)
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar a lista de clientes.',
          variant: 'destructive',
        })
      } finally {
        setLoadingClients(false)
      }
    }

    fetchUserAndClients()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação de senha
    if (formData.password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 6 caracteres.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      toast({
        title: 'Usuário criado com sucesso!',
        description: `${formData.email} foi adicionado à equipe. Senha inicial definida.`,
      })

      router.push('/admin/users')
    } catch (err: any) {
      toast({
        title: 'Erro ao criar usuário',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Link href="/admin/users">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Novo Usuário</h1>
          <p className="text-gray-500 mt-1">Adicione um novo membro à equipe</p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Usuário</CardTitle>
            <CardDescription>
              Preencha os dados do novo usuário. Uma senha inicial será definida.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client/Tenant - Conditional rendering */}
              {!loadingClients && (
                <div className="space-y-2">
                  <Label htmlFor="client_id">
                    Cliente/Tenant *
                    {currentUserRole === 'admin' && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (Super admin pode escolher)
                      </span>
                    )}
                  </Label>
                  
                  {currentUserRole === 'admin' ? (
                    // Super admin: select dropdown
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente/tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    // Client admin: read-only display
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={currentClientName}
                        disabled
                        className="bg-gray-50"
                      />
                      <span className="text-sm text-gray-500">(seu tenant)</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500">
                    {currentUserRole === 'admin'
                      ? 'Escolha para qual cliente/tenant este usuário pertencerá'
                      : 'Novos usuários serão criados no seu tenant'}
                  </p>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha Inicial *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  O usuário poderá alterar esta senha após o primeiro login
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="João Silva"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+55 11 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Função *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="client_admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {formData.role === 'client_admin'
                    ? 'Pode gerenciar usuários e configurações do tenant'
                    : 'Acesso padrão ao sistema'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={loading || loadingClients}>
                  {loading ? 'Criando...' : 'Criar Usuário'}
                </Button>
                <Link href="/admin/users">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
