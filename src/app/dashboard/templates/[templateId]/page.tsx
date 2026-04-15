"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { apiFetch } from "@/lib/api";
import type {
  MessageTemplate,
  TemplateCategory,
  TemplateComponent,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const parseTemplateComponents = (value: unknown): TemplateComponent[] => {
  if (Array.isArray(value)) {
    return value as TemplateComponent[];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as TemplateComponent[]) : [];
    } catch {
      return [];
    }
  }

  return [];
};

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams<{ templateId: string }>();
  const { toast } = useToast();
  const templateId = params?.templateId;

  const [template, setTemplate] = useState<MessageTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) {
        setError("Template ID inválido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch(`/api/templates/${templateId}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error || "Falha ao carregar template");
        }

        setTemplate({
          ...(result.template as MessageTemplate),
          components: parseTemplateComponents(result.template?.components),
        });
      } catch (err: any) {
        console.error("Error loading template:", err);
        setError(err?.message || "Falha ao carregar template.");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  const initialData = useMemo(() => {
    if (!template) return undefined;

    return {
      name: template.name,
      category: template.category as TemplateCategory,
      language: template.language,
      waba_id: template.waba_id,
      components: parseTemplateComponents(template.components),
    };
  }, [template]);

  const handleSubmit = async (data: {
    name: string;
    category: TemplateCategory;
    language: string;
    waba_id: string;
    components: TemplateComponent[];
  }) => {
    if (!templateId) return;

    setSaving(true);
    try {
      const response = await apiFetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          components: data.components,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Falha ao atualizar template");
      }

      toast({
        title: "Template atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      router.push("/dashboard/templates");
    } catch (err: any) {
      console.error("Error updating template:", err);
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Falha ao atualizar template.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-silver-50 p-6">
        <div className="max-w-4xl mx-auto py-16 text-center text-erie-black-600">
          Carregando template...
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen bg-silver-50 p-6">
        <div className="max-w-4xl mx-auto py-16 text-center">
          <p className="text-red-600 mb-4">{error || "Template não encontrado."}</p>
          <Button onClick={() => router.push("/dashboard/templates")}>
            Voltar para Templates
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-silver-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/templates")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Templates
          </Button>

          <h1 className="text-2xl font-bold text-erie-black-900 mb-2">
            Editar Template
          </h1>
          <p className="text-sm text-erie-black-600">
            Edite o rascunho e salve as alterações antes de enviar para aprovação.
          </p>
        </div>

        <TemplateForm
          initialData={initialData}
          onSubmit={handleSubmit}
          loading={saving}
        />
      </div>
    </div>
  );
}

