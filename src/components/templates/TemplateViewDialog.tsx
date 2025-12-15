"use client";

import { MessageTemplate } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TemplatePreview } from "./TemplatePreview";
import { TemplateStatusBadge } from "./TemplateStatusBadge";
import { formatDateTime } from "@/lib/utils";

interface TemplateViewDialogProps {
  template: MessageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const TemplateViewDialog = ({
  template,
  open,
  onOpenChange,
}: TemplateViewDialogProps) => {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Visualizar Template
          </DialogTitle>
          <DialogDescription>
            Detalhes e preview do template de mensagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="bg-silver-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-erie-black-700">
                  Nome:
                </span>
                <p className="text-sm text-erie-black-900 mt-1">
                  {template.name}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-erie-black-700">
                  Status:
                </span>
                <div className="mt-1">
                  <TemplateStatusBadge status={template.status} />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-erie-black-700">
                  Categoria:
                </span>
                <p className="text-sm text-erie-black-900 mt-1">
                  {getCategoryLabel(template.category)}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-erie-black-700">
                  Idioma:
                </span>
                <p className="text-sm text-erie-black-900 mt-1">
                  {getLanguageLabel(template.language)}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-erie-black-700">
                  Criado em:
                </span>
                <p className="text-sm text-erie-black-900 mt-1">
                  {formatDateTime(template.created_at)}
                </p>
              </div>
              {template.updated_at && (
                <div>
                  <span className="text-sm font-medium text-erie-black-700">
                    Atualizado em:
                  </span>
                  <p className="text-sm text-erie-black-900 mt-1">
                    {formatDateTime(template.updated_at)}
                  </p>
                </div>
              )}
            </div>

            {/* Rejection reason if any */}
            {template.rejection_reason && (
              <div className="pt-3 border-t border-silver-200">
                <span className="text-sm font-medium text-red-700">
                  Motivo da Rejeição:
                </span>
                <p className="text-sm text-red-600 mt-1">
                  {template.rejection_reason}
                </p>
              </div>
            )}
          </div>

          {/* Template Preview */}
          <div>
            <h3 className="text-sm font-medium text-erie-black-700 mb-3">
              Preview da Mensagem
            </h3>
            <TemplatePreview template={template} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
