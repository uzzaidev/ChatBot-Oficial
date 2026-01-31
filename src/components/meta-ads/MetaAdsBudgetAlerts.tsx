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
import { formatCurrency } from "@/lib/utils";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface AlertStatus {
  alert: {
    id: string;
    name: string;
    alert_type: string;
    threshold: number;
    current_value: number;
    is_active: boolean;
    last_triggered?: string;
  };
  status: "ok" | "warning" | "exceeded";
  percentage: number;
  message: string;
}

interface SpendData {
  daily_spend: number;
  monthly_spend: number;
  average_cpl: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetaAdsBudgetAlerts() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertStatus[]>([]);
  const [spend, setSpend] = useState<SpendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [newAlert, setNewAlert] = useState({
    name: "",
    alert_type: "daily_spend",
    threshold: "",
  });

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crm/budget-alerts");
      const data = await res.json();

      setAlerts(data.alerts || []);
      setSpend(data.spend);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleCreateAlert = async () => {
    if (!newAlert.name || !newAlert.threshold) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const res = await fetch("/api/crm/budget-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAlert.name,
          alert_type: newAlert.alert_type,
          threshold: parseFloat(newAlert.threshold),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Alerta criado",
          description: `Alerta "${newAlert.name}" criado com sucesso`,
        });
        setDialogOpen(false);
        setNewAlert({ name: "", alert_type: "daily_spend", threshold: "" });
        fetchAlerts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao criar alerta",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/crm/budget-alerts?id=${alertId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({ title: "Alerta removido" });
        fetchAlerts();
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao remover alerta",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "exceeded":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "daily_spend":
        return "Gasto Diário";
      case "monthly_spend":
        return "Gasto Mensal";
      case "campaign_spend":
        return "Gasto por Campanha";
      case "cpl_threshold":
        return "CPL Máximo";
      default:
        return type;
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

  return (
    <div className="space-y-4">
      {/* Current Spend Summary */}
      {spend && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Gasto Hoje</div>
              <div className="text-2xl font-bold">
                {formatCurrency(spend.daily_spend)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Gasto do Mês</div>
              <div className="text-2xl font-bold">
                {formatCurrency(spend.monthly_spend)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">CPL Médio</div>
              <div className="text-2xl font-bold">
                {formatCurrency(spend.average_cpl)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas de Orçamento
            </CardTitle>
            <CardDescription>
              Receba alertas quando o gasto se aproximar do limite
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Novo Alerta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Alerta de Orçamento</DialogTitle>
                <DialogDescription>
                  Configure um alerta para monitorar seus gastos
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Alerta</Label>
                  <Input
                    placeholder="Ex: Limite diário"
                    value={newAlert.name}
                    onChange={(e) =>
                      setNewAlert({ ...newAlert, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Alerta</Label>
                  <Select
                    value={newAlert.alert_type}
                    onValueChange={(v) =>
                      setNewAlert({ ...newAlert, alert_type: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily_spend">Gasto Diário</SelectItem>
                      <SelectItem value="monthly_spend">
                        Gasto Mensal
                      </SelectItem>
                      <SelectItem value="cpl_threshold">CPL Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Limite (R$)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={newAlert.threshold}
                    onChange={(e) =>
                      setNewAlert({ ...newAlert, threshold: e.target.value })
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateAlert} disabled={creating}>
                  {creating && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Criar Alerta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum alerta configurado</p>
              <p className="text-sm">
                Crie alertas para monitorar seus gastos com anúncios
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((item) => (
                <div
                  key={item.alert.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <div className="font-medium">{item.alert.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {getAlertTypeLabel(item.alert.alert_type)} •{" "}
                        {formatCurrency(item.alert.current_value)} /{" "}
                        {formatCurrency(item.alert.threshold)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.status === "exceeded"
                          ? "destructive"
                          : item.status === "warning"
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {item.percentage}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAlert(item.alert.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
