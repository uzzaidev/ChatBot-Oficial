'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import type { MessageTemplate } from '@/lib/types';
import { CheckCircle, Loader2 } from 'lucide-react';

interface TemplateSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  clientId: string;
  onTemplateSent?: () => void;
}

export const TemplateSelectorDialog = ({
  open,
  onOpenChange,
  phone,
  clientId,
  onTemplateSent,
}: TemplateSelectorDialogProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [parameters, setParameters] = useState<string[]>([]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Extract variable count from template body
  const getVariableCount = (template: MessageTemplate | undefined): number => {
    if (!template) return 0;
    const bodyComponent = template.components.find((c) => c.type === 'BODY');
    if (!bodyComponent || !bodyComponent.text) return 0;

    const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  const variableCount = getVariableCount(selectedTemplate);

  // Load approved templates
  useEffect(() => {
    if (open) {
      const fetchTemplates = async () => {
        try {
          setLoading(true);
          const response = await apiFetch('/api/templates?status=APPROVED');
          const data = await response.json();

          if (response.ok) {
            setTemplates(data.templates || []);
          } else {
            toast({
              title: 'Erro',
              description: data.error || 'Falha ao carregar templates',
              variant: 'destructive',
            });
          }
        } catch (error) {
          toast({
            title: 'Erro',
            description: 'Falha ao carregar templates',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      };

      fetchTemplates();
    }
  }, [open]);

  // Reset parameters when template changes
  useEffect(() => {
    setParameters(new Array(variableCount).fill(''));
  }, [selectedTemplateId, variableCount]);

  const handleSend = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Atenção',
        description: 'Selecione um template',
        variant: 'destructive',
      });
      return;
    }

    // Validate parameters
    if (variableCount > 0 && parameters.some((p) => !p.trim())) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os parâmetros do template',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSending(true);

      const response = await apiFetch(`/api/templates/${selectedTemplate.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          parameters: variableCount > 0 ? parameters : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Template Enviado',
          description: `Template "${selectedTemplate.name}" enviado com sucesso!`,
        });

        onOpenChange(false);
        
        if (onTemplateSent) {
          onTemplateSent();
        }
      } else {
        throw new Error(data.error || 'Falha ao enviar template');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar template',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Template</DialogTitle>
          <DialogDescription>
            Selecione um template aprovado para enviar ao contato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum template aprovado disponível</p>
              <p className="text-sm mt-2">
                Crie e envie templates para aprovação em /dashboard/templates
              </p>
            </div>
          ) : (
            <>
              {/* Template Selection */}
              <div>
                <Label htmlFor="template">Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger id="template" className="mt-2">
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>{template.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Prévia:</p>
                  {selectedTemplate.components.map((component, index) => {
                    if (component.type === 'BODY' && component.text) {
                      let previewText = component.text;
                      // Replace variables with parameters or placeholders
                      parameters.forEach((param, idx) => {
                        const placeholder = `{{${idx + 1}}}`;
                        previewText = previewText.replace(
                          new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'),
                          param || placeholder
                        );
                      });
                      return (
                        <p key={index} className="text-sm text-gray-800 whitespace-pre-wrap">
                          {previewText}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {/* Parameter Inputs */}
              {selectedTemplate && variableCount > 0 && (
                <div className="space-y-3">
                  <Label>Parâmetros do Template</Label>
                  {Array.from({ length: variableCount }).map((_, index) => (
                    <div key={index}>
                      <Label htmlFor={`param-${index}`} className="text-xs text-gray-600">
                        Variável {index + 1} ({`{{${index + 1}}}`})
                      </Label>
                      <Input
                        id={`param-${index}`}
                        value={parameters[index] || ''}
                        onChange={(e) => {
                          const newParams = [...parameters];
                          newParams[index] = e.target.value;
                          setParameters(newParams);
                        }}
                        placeholder={`Valor para {{${index + 1}}}`}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Recipient Info */}
              <div className="text-sm text-gray-500">
                <p>
                  <strong>Destinatário:</strong> {phone}
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedTemplateId || sending || loading}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
