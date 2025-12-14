"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { TemplateComponent, TemplateCategory } from "@/lib/types";

export default function NewTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const handleSubmit = async (data: {
    name: string;
    category: TemplateCategory;
    language: string;
    waba_id: string;
    components: TemplateComponent[];
  }) => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Falha ao criar template");
      }

      toast({
        title: "Template Criado",
        description: "O template foi criado com sucesso como DRAFT.",
      });

      // Redirect to templates list
      router.push("/dashboard/templates");
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar template.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-silver-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
            Criar Novo Template
          </h1>
          <p className="text-sm text-erie-black-600">
            Crie um template de mensagem pré-aprovado pela Meta para iniciar
            conversas fora da janela de 24 horas.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div>
            <TemplateForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-lg shadow border border-silver-200 p-6">
              <h2 className="text-lg font-semibold text-erie-black-900 mb-4">
                Pré-visualização
              </h2>
              <div className="flex items-center justify-center py-12 text-center">
                <p className="text-sm text-erie-black-500">
                  Preencha o formulário para ver a pré-visualização
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
