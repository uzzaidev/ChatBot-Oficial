'use client'

import { useState } from 'react'
import { useContacts, Contact } from '@/hooks/useContacts'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { StatusBadge } from '@/components/StatusBadge'
import { formatPhone, getInitials, formatDateTime } from '@/lib/utils'
import type { ConversationStatus, ContactImportResult } from '@/lib/types'
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  Bot,
  User,
  ArrowRight,
  List,
  Phone,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  MessageCircle,
  Workflow,
} from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { EmptyState } from '@/components/EmptyState'

interface ContactsClientProps {
  clientId: string
}

export function ContactsClient({ clientId }: ContactsClientProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | ConversationStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const { toast } = useToast()

  // Form states
  const [newPhone, setNewPhone] = useState('')
  const [newName, setNewName] = useState('')
  const [newStatus, setNewStatus] = useState<ConversationStatus>('bot')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ContactImportResult | null>(null)

  const { contacts, loading, addContact, updateContact, deleteContact, importContacts } =
    useContacts({
      clientId,
      status: statusFilter === 'all' ? undefined : statusFilter,
    })

  // Filter contacts by search query
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      contact.phone.includes(query) ||
      contact.name.toLowerCase().includes(query)
    )
  })

  const handleAddContact = async () => {
    if (!newPhone.trim()) {
      toast({
        title: 'Erro',
        description: 'Telefone é obrigatório',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    const result = await addContact(newPhone, newName || undefined, newStatus)
    setIsSubmitting(false)

    if (result) {
      toast({
        title: 'Sucesso',
        description: 'Contato adicionado com sucesso',
      })
      setIsAddDialogOpen(false)
      setNewPhone('')
      setNewName('')
      setNewStatus('bot')
    } else {
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar contato',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateContactStatus = async (phone: string, status: ConversationStatus) => {
    const result = await updateContact(phone, { status })
    if (result) {
      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso',
      })
      if (selectedContact?.phone === phone) {
        setSelectedContact(result)
      }
    } else {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteContact = async () => {
    if (!contactToDelete) return

    const result = await deleteContact(contactToDelete.phone)
    if (result) {
      toast({
        title: 'Sucesso',
        description: 'Contato removido com sucesso',
      })
      if (selectedContact?.phone === contactToDelete.phone) {
        setSelectedContact(null)
      }
    } else {
      toast({
        title: 'Erro',
        description: 'Falha ao remover contato',
        variant: 'destructive',
      })
    }
    setIsDeleteDialogOpen(false)
    setContactToDelete(null)
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await apiFetch('/api/contacts/template')
      if (!response.ok) {
        throw new Error('Falha ao baixar template')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_contatos.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao baixar template',
        variant: 'destructive',
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportResult(null)
    }
  }

  /**
   * Parse CSV content handling quoted fields with commas
   * Implements RFC 4180 basic parsing
   */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  const parseCSV = (content: string): Array<{ phone: string; name?: string; status?: string }> => {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return []

    // Parse header using RFC 4180 parsing
    const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase())
    const phoneIndex = header.findIndex((h) => h === 'telefone' || h === 'phone')
    const nameIndex = header.findIndex((h) => h === 'nome' || h === 'name')
    const statusIndex = header.findIndex((h) => h === 'status')

    if (phoneIndex === -1) return []

    // Parse data rows
    return lines.slice(1).map((line) => {
      const values = parseCSVLine(line)
      return {
        phone: values[phoneIndex] || '',
        name: nameIndex !== -1 ? values[nameIndex] : undefined,
        status: statusIndex !== -1 ? values[statusIndex] : undefined,
      }
    }).filter((c) => c.phone)
  }

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: 'Erro',
        description: 'Selecione um arquivo CSV',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const content = await importFile.text()
      const contactsList = parseCSV(content)

      if (contactsList.length === 0) {
        toast({
          title: 'Erro',
          description: 'Arquivo CSV inválido ou vazio',
          variant: 'destructive',
        })
        setIsSubmitting(false)
        return
      }

      const result = await importContacts(contactsList)
      if (result) {
        setImportResult(result)
        toast({
          title: 'Importação concluída',
          description: `${result.imported} contatos importados, ${result.skipped} ignorados, ${result.errors.length} erros`,
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao processar arquivo',
        variant: 'destructive',
      })
    }

    setIsSubmitting(false)
  }

  const closeImportDialog = () => {
    setIsImportDialogOpen(false)
    setImportFile(null)
    setImportResult(null)
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'radial-gradient(circle at top right, #242f36 0%, #1C1C1C 60%)' }}>
      {/* Sidebar com Lista de Contatos */}
      <div className="w-full lg:w-96 border-r border-white/5 flex flex-col" style={{ background: 'rgba(28, 28, 28, 0.95)' }}>
        {/* Header */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6" style={{ color: '#1ABC9C' }} />
              <h2 className="font-poppins font-semibold text-lg" style={{ color: '#1ABC9C' }}>Contatos</h2>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/5">
                <LayoutDashboard className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#B0B0B0' }} />
            <Input
              placeholder="Buscar contato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#151515] border-white/10 text-white placeholder:text-white/40 focus:border-[#1ABC9C]"
            />
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 bg-[#1ABC9C] hover:bg-[#15967f] text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Contato</DialogTitle>
                  <DialogDescription>
                    Adicione um novo contato manualmente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      placeholder="5511999999999"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: código do país + DDD + número (ex: 5511999999999)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Nome do contato"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status de Atendimento</Label>
                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ConversationStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bot">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Bot (Automático)
                          </div>
                        </SelectItem>
                        <SelectItem value="humano">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Humano (Manual)
                          </div>
                        </SelectItem>
                        <SelectItem value="transferido">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            Transferido
                          </div>
                        </SelectItem>
                        <SelectItem value="fluxo_inicial">
                          <div className="flex items-center gap-2">
                            <Workflow className="h-4 w-4" />
                            Em Flow
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddContact} disabled={isSubmitting}>
                    {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
              if (!open) closeImportDialog()
              else setIsImportDialogOpen(true)
            }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 border-white/10 text-white/90 hover:bg-white/5 hover:text-white">
                  <Upload className="h-4 w-4 mr-1" />
                  Importar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Importar Contatos</DialogTitle>
                  <DialogDescription>
                    Importe contatos em massa a partir de um arquivo CSV
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-1" />
                      Baixar Template
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">Arquivo CSV</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      O arquivo deve seguir o formato do template (telefone, nome, status)
                    </p>
                  </div>

                  {importResult && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">Resultado da Importação</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total processado:</span>
                          <Badge variant="outline">{importResult.total}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            Importados:
                          </span>
                          <Badge className="bg-green-500">{importResult.imported}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Ignorados (já existem):</span>
                          <Badge variant="secondary">{importResult.skipped}</Badge>
                        </div>
                        {importResult.errors.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 text-red-500" />
                                Erros:
                              </span>
                              <Badge variant="destructive">{importResult.errors.length}</Badge>
                            </div>
                            <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                              {importResult.errors.map((err, idx) => (
                                <div key={idx} className="text-red-600 bg-red-50 p-2 rounded">
                                  Linha {err.row}: {err.phone || '(vazio)'} - {err.error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={closeImportDialog}>
                    Fechar
                  </Button>
                  <Button onClick={handleImport} disabled={isSubmitting || !importFile}>
                    {isSubmitting ? 'Importando...' : 'Importar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="border-b border-white/5">
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent overflow-x-auto">
              <TabsTrigger
                value="all"
                className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-[#1ABC9C] rounded-none text-xs px-3 text-white/60 data-[state=active]:text-[#1ABC9C]"
              >
                <List className="h-3 w-3" />
                Todos
              </TabsTrigger>
              <TabsTrigger
                value="bot"
                className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-[#2E86AB] rounded-none text-xs px-3 text-white/60 data-[state=active]:text-[#2E86AB]"
              >
                <Bot className="h-3 w-3" />
                Bot
              </TabsTrigger>
              <TabsTrigger
                value="humano"
                className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-[#1ABC9C] rounded-none text-xs px-3 text-white/60 data-[state=active]:text-[#1ABC9C]"
              >
                <User className="h-3 w-3" />
                Humano
              </TabsTrigger>
              <TabsTrigger
                value="transferido"
                className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-orange-400 rounded-none text-xs px-3 text-white/60 data-[state=active]:text-orange-400"
              >
                <ArrowRight className="h-3 w-3" />
                Transferido
              </TabsTrigger>
              <TabsTrigger
                value="fluxo_inicial"
                className="flex items-center gap-1 data-[state=active]:border-b-2 data-[state=active]:border-[#9b59b6] rounded-none text-xs px-3 text-white/60 data-[state=active]:text-[#9b59b6]"
              >
                <Workflow className="h-3 w-3" />
                Em Flow
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1ABC9C]"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            searchQuery ? (
              <EmptyState
                icon={Search}
                title="Nenhum resultado encontrado"
                description={`Não encontramos contatos com "${searchQuery}". Tente ajustar sua busca.`}
                className="mx-4"
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Nenhum contato cadastrado"
                description="Comece adicionando contatos manualmente ou importe em massa via CSV para gerenciar seus clientes."
                actionLabel="Adicionar Primeiro Contato"
                onAction={() => setIsAddDialogOpen(true)}
                secondaryActionLabel="Importar CSV"
                onSecondaryAction={() => setIsImportDialogOpen(true)}
                className="mx-4"
              />
            )
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors duration-200 border-b border-white/5 ${
                  selectedContact?.id === contact.id
                    ? 'bg-gradient-to-r from-[#1ABC9C]/10 to-transparent border-l-2 border-l-[#1ABC9C]'
                    : 'hover:bg-white/5'
                }`}
                onClick={() => setSelectedContact(contact)}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-[#2E86AB] to-[#1ABC9C] text-white text-sm font-poppins font-semibold">
                    {getInitials(contact.name || 'Sem nome')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate text-white">
                      {contact.name || 'Sem nome'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/60 truncate flex-1">
                      {formatPhone(contact.phone)}
                    </p>
                    <div className="ml-2">
                      <StatusBadge status={contact.status} showIcon={false} size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contact Details Panel */}
      <div className="hidden lg:flex flex-1 items-center justify-center" style={{ background: '#1a1a1a' }}>
        {selectedContact ? (
          <Card className="w-full max-w-md mx-4 bg-[#252525] border-white/10 text-white">
            <CardHeader className="text-center">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContact(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Avatar className="h-20 w-20 mx-auto mb-4">
                <AvatarFallback className="bg-gradient-to-br from-uzz-mint to-uzz-blue text-white text-2xl font-poppins font-bold">
                  {getInitials(selectedContact.name || 'Sem nome')}
                </AvatarFallback>
              </Avatar>
              <CardTitle>{selectedContact.name || 'Sem nome'}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2">
                <Phone className="h-4 w-4" />
                {formatPhone(selectedContact.phone)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Control */}
              <div className="space-y-2">
                <Label>Status de Atendimento</Label>
                <Select
                  value={selectedContact.status}
                  onValueChange={(v) =>
                    handleUpdateContactStatus(selectedContact.phone, v as ConversationStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bot">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-blue-500" />
                        Bot (Automático)
                      </div>
                    </SelectItem>
                    <SelectItem value="humano">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-green-500" />
                        Humano (Manual)
                      </div>
                    </SelectItem>
                    <SelectItem value="transferido">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-orange-500" />
                        Transferido
                      </div>
                    </SelectItem>
                    <SelectItem value="fluxo_inicial">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-purple-500" />
                        Em Flow
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {selectedContact.status === 'bot'
                    ? 'Este contato será atendido pelo bot automaticamente'
                    : selectedContact.status === 'humano'
                    ? 'Este contato será atendido por um humano'
                    : selectedContact.status === 'transferido'
                    ? 'Este contato foi transferido para atendimento humano'
                    : 'Este contato está em um fluxo interativo'}
                </p>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em:</span>
                  <span>{formatDateTime(selectedContact.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Atualizado em:</span>
                  <span>{formatDateTime(selectedContact.updated_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Link href={`/dashboard/chat?phone=${selectedContact.phone}&client_id=${clientId}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Ver Conversas
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    setContactToDelete(selectedContact)
                    setIsDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div
                className="h-20 w-20 rounded-full flex items-center justify-center border-2"
                style={{
                  background: 'linear-gradient(135deg, #252525, #1C1C1C)',
                  borderColor: '#1ABC9C',
                  boxShadow: '0 0 20px rgba(26, 188, 156, 0.2)'
                }}
              >
                <Users className="h-10 w-10" style={{ color: '#1ABC9C' }} />
              </div>
            </div>
            <h3 className="text-xl font-poppins font-semibold text-white mb-2">
              Nenhum contato selecionado
            </h3>
            <p className="text-white/60">
              Selecione um contato à esquerda para ver os detalhes
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o contato{' '}
              <strong>{contactToDelete?.name || formatPhone(contactToDelete?.phone || '')}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setContactToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-red-500 hover:bg-red-600"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
