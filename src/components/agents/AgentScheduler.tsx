"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Agent, AgentSchedule, AgentScheduleRule } from "@/lib/types";
import { Calendar, Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// =====================================================
// TYPES
// =====================================================

interface AgentSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ScheduleData {
  schedule: AgentSchedule;
  agents: Pick<Agent, "id" | "name" | "avatar_emoji" | "is_active">[];
}

// =====================================================
// CONSTANTS
// =====================================================

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom", full: "Domingo" },
  { value: 1, label: "Seg", full: "Segunda" },
  { value: 2, label: "Ter", full: "Terça" },
  { value: 3, label: "Qua", full: "Quarta" },
  { value: 4, label: "Qui", full: "Quinta" },
  { value: 5, label: "Sex", full: "Sexta" },
  { value: 6, label: "Sáb", full: "Sábado" },
];

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)" },
  { value: "America/Manaus", label: "Manaus (AMT)" },
  { value: "America/Fortaleza", label: "Fortaleza (BRT)" },
  { value: "America/Recife", label: "Recife (BRT)" },
  { value: "America/Cuiaba", label: "Cuiabá (AMT)" },
  { value: "America/Porto_Velho", label: "Porto Velho (AMT)" },
];

// =====================================================
// COMPONENT
// =====================================================

export const AgentScheduler = ({ open, onOpenChange }: AgentSchedulerProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ScheduleData | null>(null);

  // Form state
  const [isEnabled, setIsEnabled] = useState(false);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [rules, setRules] = useState<AgentScheduleRule[]>([]);
  const [defaultAgentId, setDefaultAgentId] = useState<string | null>(null);

  // Fetch schedule data
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/agents/schedules");
      const result = (await response.json()) as ScheduleData;
      setData(result);
      setIsEnabled(result.schedule.is_enabled);
      setTimezone(result.schedule.timezone);
      setRules(result.schedule.rules || []);
      setDefaultAgentId(result.schedule.default_agent_id);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSchedule();
    }
  }, [open, fetchSchedule]);

  // Add new rule
  const addRule = () => {
    if (!data?.agents.length) return;
    setRules([
      ...rules,
      {
        agent_id: data.agents[0].id,
        days: [1, 2, 3, 4, 5], // Mon-Fri default
        start: "09:00",
        end: "18:00",
      },
    ]);
  };

  // Remove rule
  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  // Update rule
  const updateRule = (
    index: number,
    field: keyof AgentScheduleRule,
    value: unknown,
  ) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setRules(newRules);
  };

  // Toggle day in rule
  const toggleDay = (ruleIndex: number, day: number) => {
    const rule = rules[ruleIndex];
    const newDays = rule.days.includes(day)
      ? rule.days.filter((d) => d !== day)
      : [...rule.days, day].sort();
    updateRule(ruleIndex, "days", newDays);
  };

  // Save schedule
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/agents/schedules", {
        method: "PUT",
        body: JSON.stringify({
          is_enabled: isEnabled,
          timezone,
          rules,
          default_agent_id: defaultAgentId,
        }),
      });

      toast({
        title: "Sucesso",
        description: "Agendamento salvo com sucesso",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar agendamento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Get agent name by ID
  const getAgentName = (agentId: string) => {
    const agent = data?.agents.find((a) => a.id === agentId);
    return agent ? `${agent.avatar_emoji || "🤖"} ${agent.name}` : "Selecione";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Agendamento de Agentes
          </DialogTitle>
          <DialogDescription>
            Configure horários para ativar agentes automaticamente
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-base font-medium">
                  Ativar Agendamento
                </Label>
                <p className="text-sm text-muted-foreground">
                  Troca automaticamente o agente ativo com base no horário
                </p>
              </div>
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Fuso Horário</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Default Agent */}
            <div className="space-y-2">
              <Label>Agente Padrão (fora dos horários configurados)</Label>
              <Select
                value={defaultAgentId || "none"}
                onValueChange={(v) =>
                  setDefaultAgentId(v === "none" ? null : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    Nenhum (usa o agente ativo manualmente)
                  </SelectItem>
                  {data?.agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.avatar_emoji || "🤖"} {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Regras de Agendamento</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRule}
                  disabled={!data?.agents.length}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Regra
                </Button>
              </div>

              {rules.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma regra configurada</p>
                    <p className="text-sm">
                      Clique em "Nova Regra" para adicionar
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <Card key={index}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">
                            Regra {index + 1}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeRule(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 px-4 pb-4 space-y-4">
                        {/* Agent Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs">Agente</Label>
                          <Select
                            value={rule.agent_id}
                            onValueChange={(v) =>
                              updateRule(index, "agent_id", v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue>
                                {getAgentName(rule.agent_id)}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {data?.agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.avatar_emoji || "🤖"} {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Days */}
                        <div className="space-y-2">
                          <Label className="text-xs">Dias da Semana</Label>
                          <div className="flex gap-1 flex-wrap">
                            {DAYS_OF_WEEK.map((day) => (
                              <Badge
                                key={day.value}
                                variant={
                                  rule.days.includes(day.value)
                                    ? "default"
                                    : "outline"
                                }
                                className="cursor-pointer select-none"
                                onClick={() => toggleDay(index, day.value)}
                              >
                                {day.label}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Início</Label>
                            <input
                              type="time"
                              value={rule.start}
                              onChange={(e) =>
                                updateRule(index, "start", e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Fim</Label>
                            <input
                              type="time"
                              value={rule.end}
                              onChange={(e) =>
                                updateRule(index, "end", e.target.value)
                              }
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
