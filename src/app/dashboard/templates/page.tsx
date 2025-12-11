"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientBrowser } from "@/lib/supabase";
import { TemplateList } from "@/components/templates/TemplateList";
import { useTemplates } from "@/hooks/useTemplates";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Templates Page - Client Component
 * 
 * Displays list of WhatsApp message templates
 */
export default function TemplatesPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const {
    templates,
    loading,
    error,
    refetch,
    submitTemplate,
    deleteTemplate,
    syncTemplates,
  } = useTemplates({
    autoFetch: !!clientId,
  });

  // Check authentication and get client_id
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClientBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Get client_id from user profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("client_id")
          .eq("id", user.id)
          .single();

        if (profile?.client_id) {
          setClientId(profile.client_id);
        } else {
          // Fallback to user metadata
          const metadataClientId = user.user_metadata?.client_id;
          if (metadataClientId) {
            setClientId(metadataClientId);
          }
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (templateId: string) => {
    try {
      await submitTemplate(templateId);
      toast({
        title: "Template Submetido",
        description: "O template foi enviado para aprovação da Meta.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Falha ao submeter template para aprovação.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      toast({
        title: "Template Excluído",
        description: "O template foi excluído com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Falha ao excluir template.",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncTemplates();
      toast({
        title: "Templates Sincronizados",
        description: "Os status dos templates foram atualizados.",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: "Falha ao sincronizar templates.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-silver-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mint-500"></div>
      </div>
    );
  }

  if (!clientId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-silver-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-erie-black-900">
              Templates de Mensagem
            </h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing || loading}
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                />
                Sincronizar
              </Button>
              <Button
                onClick={() => router.push("/dashboard/templates/new")}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Novo Template
              </Button>
            </div>
          </div>
          <p className="text-sm text-erie-black-600">
            Crie e gerencie templates de mensagem pré-aprovados pela Meta para
            iniciar conversas fora da janela de 24 horas.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Template List */}
        <TemplateList
          templates={templates}
          loading={loading}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
