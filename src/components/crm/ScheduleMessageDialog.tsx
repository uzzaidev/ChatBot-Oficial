"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api";
import type { MessageTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ScheduleMessageDialogProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (data: {
    template_id: string;
    template_name: string;
    template_params?: string[];
    scheduled_for: string;
  }) => Promise<boolean>;
  phone: string | number;
  contactName?: string;
}

export const ScheduleMessageDialog = ({
  open,
  onClose,
  onSchedule,
  phone,
  contactName,
}: ScheduleMessageDialogProps) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [parameters, setParameters] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Extract variable count from template body
  const getVariableCount = (template: MessageTemplate | undefined): number => {
    if (!template) return 0;
    const bodyComponent = template.components.find((c) => c.type === "BODY");
    if (!bodyComponent || !bodyComponent.text) return 0;

    const matches = bodyComponent.text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  const variableCount = getVariableCount(selectedTemplate);

  // Get template body text for preview
  const getTemplateBody = (template: MessageTemplate | undefined): string => {
    if (!template) return "";
    const bodyComponent = template.components.find((c) => c.type === "BODY");
    return bodyComponent?.text || "";
  };

  // Replace variables in template text
  const getPreviewText = (): string => {
    let text = getTemplateBody(selectedTemplate);
    parameters.forEach((param, index) => {
      text = text.replace(`{{${index + 1}}}`, param || `[${index + 1}]`);
    });
    return text;
  };

  // Load approved templates
  useEffect(() => {
    if (open) {
      const fetchTemplates = async () => {
        try {
          setLoadingTemplates(true);
          const response = await apiFetch("/api/templates?status=APPROVED");
          const data = await response.json();

          if (response.ok) {
            setTemplates(data.templates || []);
          } else {
            setError(data.error || "Falha ao carregar templates");
          }
        } catch (err) {
          setError("Falha ao carregar templates");
        } finally {
          setLoadingTemplates(false);
        }
      };

      fetchTemplates();
    }
  }, [open]);

  // Reset parameters when template changes
  useEffect(() => {
    setParameters(new Array(variableCount).fill(""));
  }, [selectedTemplateId, variableCount]);

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      setError("Selecione um template");
      return;
    }
    if (!date) {
      setError("Selecione uma data");
      return;
    }

    // Validate parameters
    if (variableCount > 0 && parameters.some((p) => !p.trim())) {
      setError("Preencha todos os parâmetros do template");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // Combine date with time
      const scheduledDate = setMinutes(
        setHours(date, parseInt(hour)),
        parseInt(minute),
      );

      // Check if date is in the future
      if (scheduledDate <= new Date()) {
        setError("A data deve ser no futuro");
        setSubmitting(false);
        return;
      }

      const success = await onSchedule({
        template_id: selectedTemplate.id,
        template_name: selectedTemplate.name,
        template_params: variableCount > 0 ? parameters : undefined,
        scheduled_for: scheduledDate.toISOString(),
      });

      if (success) {
        // Reset form
        setSelectedTemplateId("");
        setParameters([]);
        setDate(undefined);
        setHour("09");
        setMinute("00");
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao agendar mensagem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedTemplateId("");
      setParameters([]);
      setDate(undefined);
      setHour("09");
      setMinute("00");
      setError(null);
      onClose();
    }
  };

  // Generate hour options (00-23)
  const hours = Array.from({ length: 24 }, (_, i) =>
    i.toString().padStart(2, "0"),
  );

  // Generate minute options (00, 15, 30, 45)
  const minutes = ["00", "15", "30", "45"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agendar Mensagem
          </DialogTitle>
          <DialogDescription>
            Agendar template para{" "}
            <span className="font-medium">{contactName || String(phone)}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {/* Info banner */}
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950">
              <AlertCircle className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div className="text-blue-800 dark:text-blue-200">
                <p className="font-medium">Apenas templates aprovados</p>
                <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                  Mensagens agendadas só podem usar templates aprovados pela
                  Meta. Isso garante conformidade com as políticas do WhatsApp.
                </p>
              </div>
            </div>

            {/* Template selector */}
            <div className="space-y-2">
              <Label>Template</Label>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhum template aprovado encontrado
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/templates/new">
                      <Plus className="h-4 w-4 mr-1" />
                      Criar Template
                    </Link>
                  </Button>
                </div>
              ) : (
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({template.language})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Link to create new template */}
              {templates.length > 0 && (
                <div className="flex items-center justify-end">
                  <Button
                    variant="link"
                    size="sm"
                    asChild
                    className="text-xs h-auto p-0"
                  >
                    <Link
                      href="/dashboard/templates/new"
                      target="_blank"
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Criar novo template
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Template parameters */}
            {selectedTemplate && variableCount > 0 && (
              <div className="space-y-3">
                <Label>Parâmetros do Template</Label>
                <p className="text-xs text-muted-foreground">
                  Preencha os valores para as variáveis do template
                </p>
                {parameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-12">
                      {`{{${index + 1}}}`}
                    </span>
                    <Input
                      value={param}
                      onChange={(e) => {
                        const newParams = [...parameters];
                        newParams[index] = e.target.value;
                        setParameters(newParams);
                      }}
                      placeholder={`Valor para variável ${index + 1}`}
                      disabled={submitting}
                    />
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Date picker */}
            <div className="space-y-2">
              <Label>Data do Envio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground",
                    )}
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      format(date, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date()}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time picker */}
            <div className="space-y-2">
              <Label>Horário</Label>
              <div className="flex gap-2">
                <Select
                  value={hour}
                  onValueChange={setHour}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-[100px]">
                    <Clock className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}h
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select
                  value={minute}
                  onValueChange={setMinute}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Preview */}
            {selectedTemplate && date && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Prévia do Agendamento</p>
                  <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded">
                    Template Aprovado
                  </span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium">{selectedTemplate.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data/Hora:</span>
                    <span className="font-medium">
                      {format(
                        setMinutes(
                          setHours(date, parseInt(hour)),
                          parseInt(minute),
                        ),
                        "PPPp",
                        { locale: ptBR },
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Destinatário:</span>
                    <span className="font-medium">
                      {contactName || String(phone)}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1">Mensagem:</p>
                  <p className="bg-background rounded p-2 text-foreground">
                    {getPreviewText()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedTemplate || templates.length === 0}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
