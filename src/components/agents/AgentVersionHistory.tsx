"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, History, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AgentVersion {
  id: string;
  version_number: number;
  change_description: string | null;
  created_by: string | null;
  created_at: string;
}

interface AgentVersionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  onRestore: () => void;
}

export const AgentVersionHistory = ({
  open,
  onOpenChange,
  agentId,
  agentName,
  onRestore,
}: AgentVersionHistoryProps) => {
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      const response = await apiFetch(`/api/agents/${agentId}/versions`);
      const data = await response.json();

      if (response.ok) {
        setVersions(data.versions || []);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Falha ao carregar versões",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar versões",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (open && agentId) {
      fetchVersions();
    }
  }, [open, agentId, fetchVersions]);

  const handleRestore = async (versionId: string, versionNumber: number) => {
    try {
      setRestoring(versionId);
      const response = await apiFetch(
        `/api/agents/${agentId}/versions/${versionId}/restore`,
        { method: "POST" },
      );

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Versão Restaurada",
          description: `Agente restaurado para versão ${versionNumber}.`,
        });
        onRestore();
        onOpenChange(false);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Falha ao restaurar versão",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error restoring version:", error);
      toast({
        title: "Erro",
        description: "Falha ao restaurar versão",
        variant: "destructive",
      });
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Versões salvas automaticamente de "{agentName}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma versão salva ainda.</p>
              <p className="text-sm mt-1">
                Versões são salvas automaticamente ao editar o agente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
                    v{version.version_number}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {version.change_description ||
                          `Versão ${version.version_number}`}
                      </span>
                      {index === 0 && (
                        <Badge variant="outline" className="shrink-0">
                          Mais recente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(version.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleRestore(version.id, version.version_number)
                    }
                    disabled={restoring !== null}
                    className="shrink-0"
                  >
                    {restoring === version.id ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span className="ml-1 hidden sm:inline">Restaurar</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Até 20 versões são mantidas automaticamente.
        </div>
      </DialogContent>
    </Dialog>
  );
};
