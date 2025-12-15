"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageTemplate } from "@/lib/types";
import { TemplateStatusBadge } from "./TemplateStatusBadge";
import { TemplateViewDialog } from "./TemplateViewDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, MoreVertical, Eye, Edit, Trash2, Send, Upload } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface TemplateListProps {
  templates: MessageTemplate[];
  loading?: boolean;
  onSubmit?: (templateId: string) => void;
  onSend?: (templateId: string) => void;
  onDelete?: (templateId: string) => void;
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    UTILITY: "Utilidade",
    AUTHENTICATION: "Autenticação",
    MARKETING: "Marketing",
  };
  return labels[category] || category;
};

const getLanguageLabel = (language: string) => {
  const labels: Record<string, string> = {
    pt_BR: "Português (BR)",
    en_US: "Inglês (US)",
    es_ES: "Espanhol (ES)",
  };
  return labels[language] || language;
};

export const TemplateList = ({
  templates,
  loading = false,
  onSubmit,
  onSend,
  onDelete,
}: TemplateListProps) => {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  const handleView = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setViewDialogOpen(true);
  };

  const handleEdit = (templateId: string) => {
    router.push(`/dashboard/templates/${templateId}?edit=true`);
  };

  const handleSubmit = async (templateId: string) => {
    if (!onSubmit) return;
    setActionLoading(templateId);
    try {
      await onSubmit(templateId);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSend = async (templateId: string) => {
    if (!onSend) return;
    router.push(`/dashboard/templates/${templateId}/send`);
  };

  const handleDelete = async (templateId: string) => {
    if (!onDelete) return;
    
    const confirmed = confirm("Tem certeza que deseja excluir este template?");
    if (!confirmed) return;

    setActionLoading(templateId);
    try {
      await onDelete(templateId);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue-500 mx-auto mb-4"></div>
          <span className="text-erie-black-600">Carregando templates...</span>
        </div>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <FileText className="h-16 w-16 text-silver-300 mb-4" />
        <h3 className="text-lg font-semibold text-erie-black-900 mb-2">
          Nenhum template encontrado
        </h3>
        <p className="text-sm text-erie-black-600 mb-6 max-w-md">
          Crie seu primeiro template de mensagem para iniciar conversas fora da janela de 24 horas.
        </p>
        <Button onClick={() => router.push("/dashboard/templates/new")}>
          Criar Primeiro Template
        </Button>
      </div>
    );
  }

  return (
    <>
      <TemplateViewDialog
        template={selectedTemplate}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
      <div className="bg-white rounded-lg shadow border border-silver-200">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Nome</TableHead>
            <TableHead className="w-[120px]">Categoria</TableHead>
            <TableHead className="w-[100px]">Idioma</TableHead>
            <TableHead className="w-[150px]">Status</TableHead>
            <TableHead className="w-[150px]">Criado em</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span className="text-sm text-erie-black-900">{template.name}</span>
                  {template.rejection_reason && (
                    <span className="text-xs text-red-600 mt-1">
                      {template.rejection_reason}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-erie-black-700">
                  {getCategoryLabel(template.category)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-erie-black-700">
                  {getLanguageLabel(template.language)}
                </span>
              </TableCell>
              <TableCell>
                <TemplateStatusBadge status={template.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-erie-black-600">
                  {formatDateTime(template.created_at)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={actionLoading === template.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(template)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </DropdownMenuItem>

                    {template.status === "DRAFT" && (
                      <>
                        <DropdownMenuItem onClick={() => handleEdit(template.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSubmit(template.id)}>
                          <Upload className="mr-2 h-4 w-4" />
                          Submeter para Aprovação
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    )}

                    {template.status === "APPROVED" && (
                      <DropdownMenuItem onClick={() => handleSend(template.id)}>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar Mensagem
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
};
