"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatNumber } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface CustomAudience {
  id: string;
  name: string;
  description?: string;
  subtype: string;
  approximate_count?: number;
  time_created?: string;
  time_updated?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetaAdsAudienceSync() {
  const { toast } = useToast();
  const [audiences, setAudiences] = useState<CustomAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configured, setConfigured] = useState(false);

  // Form state
  const [newAudience, setNewAudience] = useState({
    audience_name: "",
    description: "",
    source: "all_cards",
  });

  const fetchAudiences = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crm/meta-audiences");
      const data = await res.json();

      setAudiences(data.audiences || []);
      setConfigured(data.configured || false);
    } catch (error) {
      console.error("Error fetching audiences:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudiences();
  }, [fetchAudiences]);

  const handleSyncAudience = async () => {
    if (!newAudience.audience_name) {
      toast({
        title: "Erro",
        description: "Informe o nome da audiência",
        variant: "destructive",
      });
      return;
    }

    try {
      setSyncing(true);
      const res = await fetch("/api/crm/meta-audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience_name: newAudience.audience_name,
          description:
            newAudience.description || `[CRM-SYNC] ${newAudience.source}`,
          source: newAudience.source,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Audiência sincronizada",
          description: `${data.users_added} contatos enviados para "${newAudience.audience_name}"`,
        });
        setDialogOpen(false);
        setNewAudience({
          audience_name: "",
          description: "",
          source: "all_cards",
        });
        fetchAudiences();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Falha ao sincronizar",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "all_cards":
        return "Todos os Leads";
      case "won":
        return "Clientes (Fechados)";
      case "high_value":
        return "Alto Valor (R$1000+)";
      case "column":
        return "Coluna Específica";
      case "tag":
        return "Tag Específica";
      default:
        return source;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!configured) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Meta Ads não configurado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Configure o Ad Account ID nas configurações para sincronizar
            audiências
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Audiências Customizadas
            </CardTitle>
            <CardDescription>
              Sincronize leads do CRM para audiências do Meta Ads
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAudiences}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Sincronização
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sincronizar Audiência</DialogTitle>
                  <DialogDescription>
                    Envie contatos do CRM para uma audiência customizada do Meta
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome da Audiência</Label>
                    <Input
                      placeholder="Ex: Leads CRM Janeiro"
                      value={newAudience.audience_name}
                      onChange={(e) =>
                        setNewAudience({
                          ...newAudience,
                          audience_name: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Se já existir, os contatos serão adicionados
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Fonte de Dados</Label>
                    <Select
                      value={newAudience.source}
                      onValueChange={(v) =>
                        setNewAudience({ ...newAudience, source: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_cards">
                          Todos os Leads
                        </SelectItem>
                        <SelectItem value="won">Clientes (Fechados)</SelectItem>
                        <SelectItem value="high_value">
                          Alto Valor (R$1000+)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Input
                      placeholder="Descrição da audiência"
                      value={newAudience.description}
                      onChange={(e) =>
                        setNewAudience({
                          ...newAudience,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSyncAudience} disabled={syncing}>
                    {syncing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Sincronizar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {audiences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma audiência sincronizada</p>
              <p className="text-sm">
                Crie uma audiência para melhorar o targeting dos seus anúncios
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {audiences.map((audience) => (
                <div
                  key={audience.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <div className="font-medium">{audience.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {audience.description?.replace("[CRM-SYNC] ", "") ||
                          "Audiência customizada"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {audience.approximate_count !== undefined && (
                      <Badge variant="secondary">
                        {formatNumber(audience.approximate_count)} contatos
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {audience.subtype}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">💡 Dica: Lookalike Audiences</h4>
          <p className="text-sm text-muted-foreground">
            Após sincronizar uma audiência de clientes, você pode criar uma
            &quot;Lookalike Audience&quot; no Meta Ads Manager para alcançar
            pessoas semelhantes aos seus melhores clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
