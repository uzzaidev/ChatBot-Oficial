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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Agent, AgentExperiment } from "@/lib/types";
import {
  BarChart3,
  FlaskConical,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// =====================================================
// TYPES
// =====================================================

interface ABTestDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExperimentWithAgents extends AgentExperiment {
  agent_a: Pick<Agent, "id" | "name" | "avatar_emoji"> | null;
  agent_b: Pick<Agent, "id" | "name" | "avatar_emoji"> | null;
}

interface ExperimentsData {
  experiments: ExperimentWithAgents[];
  agents: Pick<Agent, "id" | "name" | "avatar_emoji" | "is_active">[];
}

// =====================================================
// COMPONENT
// =====================================================

export const ABTestDashboard = ({
  open,
  onOpenChange,
}: ABTestDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ExperimentsData | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // New experiment form
  const [newName, setNewName] = useState("");
  const [newAgentA, setNewAgentA] = useState("");
  const [newAgentB, setNewAgentB] = useState("");
  const [newSplit, setNewSplit] = useState(50);
  const [creating, setCreating] = useState(false);

  // Fetch experiments
  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch("/api/agents/experiments");
      const result = (await response.json()) as ExperimentsData;
      setData(result);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar experimentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchExperiments();
    }
  }, [open, fetchExperiments]);

  // Create new experiment
  const handleCreate = async () => {
    if (!newName || !newAgentA || !newAgentB) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (newAgentA === newAgentB) {
      toast({
        title: "Erro",
        description: "Selecione agentes diferentes",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      await apiFetch("/api/agents/experiments", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          agent_a_id: newAgentA,
          agent_b_id: newAgentB,
          traffic_split: newSplit,
        }),
      });

      toast({
        title: "Sucesso",
        description: "Experimento criado com sucesso",
      });

      // Reset form
      setNewName("");
      setNewAgentA("");
      setNewAgentB("");
      setNewSplit(50);
      setShowNewForm(false);

      // Refresh
      fetchExperiments();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar experimento",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Toggle experiment active state
  const toggleExperiment = async (
    experiment: ExperimentWithAgents,
    activate: boolean,
  ) => {
    try {
      await apiFetch(`/api/agents/experiments/${experiment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: activate }),
      });

      toast({
        title: "Sucesso",
        description: activate ? "Experimento ativado" : "Experimento pausado",
      });

      fetchExperiments();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao atualizar";
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    }
  };

  // Delete experiment
  const deleteExperiment = async (experiment: ExperimentWithAgents) => {
    if (experiment.is_active) {
      toast({
        title: "Erro",
        description: "Pause o experimento antes de excluir",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiFetch(`/api/agents/experiments/${experiment.id}`, {
        method: "DELETE",
      });

      toast({
        title: "Sucesso",
        description: "Experimento excluído",
      });

      fetchExperiments();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir experimento",
        variant: "destructive",
      });
    }
  };

  // Get agent display
  const getAgentDisplay = (
    agent: Pick<Agent, "id" | "name" | "avatar_emoji"> | null,
  ) => {
    if (!agent) return "Agente removido";
    return `${agent.avatar_emoji || "🤖"} ${agent.name}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Testes A/B de Agentes
          </DialogTitle>
          <DialogDescription>
            Compare o desempenho de diferentes agentes com split de tráfego
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Experiment Form */}
            {showNewForm ? (
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Novo Experimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Experimento</Label>
                    <Input
                      placeholder="Ex: Teste Tom Vendas vs Suporte"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Agente A</Label>
                      <Select value={newAgentA} onValueChange={setNewAgentA}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                    <div className="space-y-2">
                      <Label>Agente B</Label>
                      <Select value={newAgentB} onValueChange={setNewAgentB}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
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
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Divisão de Tráfego: {newSplit}% A / {100 - newSplit}% B
                    </Label>
                    <Slider
                      value={[newSplit]}
                      onValueChange={([v]) => setNewSplit(v)}
                      min={10}
                      max={90}
                      step={10}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Criar Experimento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setShowNewForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Novo Experimento A/B
              </Button>
            )}

            {/* Experiments List */}
            {data?.experiments.length === 0 && !showNewForm ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    Nenhum experimento ainda
                  </p>
                  <p className="text-sm">
                    Crie um teste A/B para comparar agentes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data?.experiments.map((experiment) => {
                  const totalConv = experiment.total_conversations || 1;
                  const aPercent = Math.round(
                    (experiment.agent_a_conversations / totalConv) * 100,
                  );
                  const bPercent = Math.round(
                    (experiment.agent_b_conversations / totalConv) * 100,
                  );

                  return (
                    <Card
                      key={experiment.id}
                      className={
                        experiment.is_active ? "border-green-500/50" : ""
                      }
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {experiment.name}
                            </CardTitle>
                            {experiment.is_active ? (
                              <Badge variant="default" className="bg-green-500">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pausado</Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {experiment.is_active ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleExperiment(experiment, false)
                                }
                                title="Pausar"
                              >
                                <Pause className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleExperiment(experiment, true)
                                }
                                title="Ativar"
                              >
                                <Play className="w-4 h-4 text-green-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteExperiment(experiment)}
                              title="Excluir"
                              disabled={experiment.is_active}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Traffic Split */}
                        <div className="text-sm text-muted-foreground">
                          Split: {experiment.traffic_split}% /{" "}
                          {100 - experiment.traffic_split}%
                        </div>

                        {/* Agent A Stats */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">
                              {getAgentDisplay(experiment.agent_a)}
                            </span>
                            <span>
                              {experiment.agent_a_conversations} conv (
                              {aPercent}
                              %)
                            </span>
                          </div>
                          <Progress value={aPercent} className="h-2" />
                        </div>

                        {/* Agent B Stats */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">
                              {getAgentDisplay(experiment.agent_b)}
                            </span>
                            <span>
                              {experiment.agent_b_conversations} conv (
                              {bPercent}
                              %)
                            </span>
                          </div>
                          <Progress value={bPercent} className="h-2" />
                        </div>

                        {/* Total */}
                        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                          Total: {experiment.total_conversations} conversas
                          {experiment.started_at && (
                            <>
                              {" "}
                              • Iniciado em{" "}
                              {new Date(
                                experiment.started_at,
                              ).toLocaleDateString("pt-BR")}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
