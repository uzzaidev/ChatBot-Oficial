'use client'

import { useEffect, useState } from 'react'
import { Mail, Copy, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { UserInvite, CreateInviteRequest } from '@/lib/types'

export default function AdminInvitesPage() {
  const { toast } = useToast()
  const [invites, setInvites] = useState<UserInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newInvite, setNewInvite] = useState<CreateInviteRequest>({
    email: '',
    role: 'user',
  })

  useEffect(() => {
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/invites')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar convites')
      }

      setInvites(data.invites || [])
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar convites',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvite = async () => {
    try {
      const response = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvite),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar convite')
      }

      toast({
        title: 'Convite criado!',
        description: `Convite enviado para ${newInvite.email}`,
      })

      setNewInvite({ email: '', role: 'user' })
      setIsDialogOpen(false)
      fetchInvites()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar convite',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Tem certeza que deseja revogar este convite?')) return

    try {
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revoked' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao revogar convite')
      }

      toast({
        title: 'Convite revogado',
        description: 'O convite foi revogado com sucesso.',
      })

      fetchInvites()
    } catch (err: any) {
      toast({
        title: 'Erro ao revogar convite',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm('Tem certeza que deseja deletar este convite?')) return

    try {
      const response = await fetch(`/api/admin/invites/${inviteId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao deletar convite')
      }

      toast({
        title: 'Convite removido',
        description: 'O convite foi removido com sucesso.',
      })

      fetchInvites()
    } catch (err: any) {
      toast({
        title: 'Erro ao deletar convite',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'default', label: 'Pendente' },
      accepted: { variant: 'secondary', label: 'Aceito' },
      expired: { variant: 'outline', label: 'Expirado' },
      revoked: { variant: 'destructive', label: 'Revogado' },
    }
    const config = variants[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Convites</h1>
            <p className="text-gray-500 mt-1">Gerencie convites para novos membros</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                Novo Convite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Convite</DialogTitle>
                <DialogDescription>
                  Convide um novo membro para a equipe por email
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Função</Label>
                  <Select
                    value={newInvite.role}
                    onValueChange={(value: any) => setNewInvite({ ...newInvite, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="client_admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateInvite}>Enviar Convite</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Invites List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {invites.length} convite{invites.length !== 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-gray-500 py-8">Carregando convites...</p>
            ) : invites.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhum convite encontrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Função</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Expira em</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Criado em</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites.map((invite) => (
                      <tr key={invite.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{invite.email}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {invite.role === 'client_admin' ? 'Admin' : 'Usuário'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(invite.status)}</td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invite.expires_at)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {invite.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeInvite(invite.id)}
                            >
                              Revogar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
