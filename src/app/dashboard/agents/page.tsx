"use client";

import { ABTestDashboard } from "@/components/agents/ABTestDashboard";
import { AgentEditorModal } from "@/components/agents/AgentEditorModal";
import { AgentScheduler } from "@/components/agents/AgentScheduler";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Agent } from "@/lib/types";
import {
  Archive,
  Bot,
  Calendar,
  Copy,
  FlaskConical,
  MoreVertical,
  Plus,
  Power,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Agents Configuration Dashboard
 *
 * Allows users to create, edit, and manage multiple AI agents
 * with different personalities and configurations.
 */
const AgentsPage = () => {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isNewAgent, setIsNewAgent] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [abTestOpen, setABTestOpen] = useState(false);

  // Fetch agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await apiFetch("/api/agents");
        const data = await response.json();

        if (response.ok) {
          setAgents(data.agents || []);
        } else {
          toast({
            title: "Erro",
            description: data.error || "Falha ao carregar agentes",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar agentes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Handle creating a new agent
  const handleNewAgent = () => {
    setSelectedAgent(null);
    setIsNewAgent(true);
    setEditorOpen(true);
  };

  // Handle editing an agent
  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsNewAgent(false);
    setEditorOpen(true);
  };

  // Handle activating an agent
  const handleActivateAgent = async (agent: Agent) => {
    try {
      const response = await apiFetch(`/api/agents/${agent.id}/activate`, {
        method: "POST",
      });

      if (response.ok) {
        // Update local state to reflect activation
        setAgents((prev) =>
          prev.map((a) => ({
            ...a,
            is_active: a.id === agent.id,
          })),
        );
        toast({
          title: "Agente Ativado",
          description: `${agent.name} agora está ativo e respondendo mensagens.`,
        });
      } else {
        const data = await response.json();
        toast({
          title: "Erro",
          description: data.error || "Falha ao ativar agente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error activating agent:", error);
      toast({
        title: "Erro",
        description: "Falha ao ativar agente",
        variant: "destructive",
      });
    }
  };

  // Handle archiving an agent
  const handleArchiveAgent = async (agent: Agent) => {
    try {
      const response = await apiFetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_archived: true }),
      });

      if (response.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agent.id));
        toast({
          title: "Agente Arquivado",
          description: `${agent.name} foi arquivado.`,
        });
      } else {
        const data = await response.json();
        toast({
          title: "Erro",
          description: data.error || "Falha ao arquivar agente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error archiving agent:", error);
      toast({
        title: "Erro",
        description: "Falha ao arquivar agente",
        variant: "destructive",
      });
    }
  };

  // Handle duplicating an agent
  const handleDuplicateAgent = async (agent: Agent) => {
    try {
      // Create a copy without id and with modified name
      const { id, is_active, created_at, updated_at, ...agentCopy } = agent;
      const newAgent = {
        ...agentCopy,
        name: `${agent.name} (Cópia)`,
        is_active: false,
      };

      const response = await apiFetch("/api/agents", {
        method: "POST",
        body: JSON.stringify(newAgent),
      });

      if (response.ok) {
        const data = await response.json();
        setAgents((prev) => [...prev, data.agent]);
        toast({
          title: "Agente Duplicado",
          description: `${newAgent.name} foi criado.`,
        });
      } else {
        const data = await response.json();
        toast({
          title: "Erro",
          description: data.error || "Falha ao duplicar agente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error duplicating agent:", error);
      toast({
        title: "Erro",
        description: "Falha ao duplicar agente",
        variant: "destructive",
      });
    }
  };

  // Handle editor close and refresh
  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedAgent(null);
    setIsNewAgent(false);
  };

  // Handle agent saved (new or updated)
  const handleAgentSaved = (agent: Agent) => {
    if (isNewAgent) {
      setAgents((prev) => [...prev, agent]);
    } else {
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    }
    handleEditorClose();
  };

  // Get tone display name
  const getToneLabel = (tone: Agent["response_tone"]) => {
    const labels: Record<Agent["response_tone"], string> = {
      formal: "Formal",
      friendly: "Amigável",
      professional: "Profissional",
      casual: "Casual",
    };
    return labels[tone] || tone;
  };

  // Get style display name
  const getStyleLabel = (style: Agent["response_style"]) => {
    const labels: Record<Agent["response_style"], string> = {
      helpful: "Prestativo",
      direct: "Direto",
      educational: "Educativo",
      consultative: "Consultivo",
    };
    return labels[style] || style;
  };

  return (
    <div className="container max-w-7xl py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Agentes de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure diferentes personalidades para seu assistente
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setScheduleOpen(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            Agendamento
          </Button>
          <Button variant="outline" onClick={() => setABTestOpen(true)}>
            <FlaskConical className="w-4 h-4 mr-2" />
            Teste A/B
          </Button>
          <Button onClick={handleNewAgent}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Agente
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && agents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum agente criado</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Crie seu primeiro agente de IA para configurar como o assistente
              responde às mensagens.
            </p>
            <Button onClick={handleNewAgent}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agents Grid */}
      {!loading && agents.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={`group cursor-pointer transition-all hover:shadow-lg ${
                agent.is_active
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => handleEditAgent(agent)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 text-2xl">
                        {agent.avatar_emoji || "🤖"}
                      </div>
                      {agent.is_active && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                          <Zap className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        {agent.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {agent.is_active ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!agent.is_active && (
                        <DropdownMenuItem
                          onClick={() => handleActivateAgent(agent)}
                        >
                          <Power className="w-4 h-4 mr-2" />
                          Ativar Agente
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleEditAgent(agent)}>
                        <Settings2 className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicateAgent(agent)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleArchiveAgent(agent)}
                        className="text-destructive focus:text-destructive"
                        disabled={agent.is_active}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                {agent.description && (
                  <CardDescription className="line-clamp-2 mb-3">
                    {agent.description}
                  </CardDescription>
                )}

                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    {getToneLabel(agent.response_tone)}
                  </Badge>
                  <Badge variant="secondary">
                    {getStyleLabel(agent.response_style)}
                  </Badge>
                  {agent.enable_rag && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-500/10 text-blue-500"
                    >
                      RAG
                    </Badge>
                  )}
                  {agent.enable_human_handoff && (
                    <Badge
                      variant="secondary"
                      className="bg-purple-500/10 text-purple-500"
                    >
                      Handoff
                    </Badge>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex justify-between">
                  <span>
                    {agent.primary_provider === "openai" ? "OpenAI" : "Groq"} •{" "}
                    {agent.primary_provider === "openai"
                      ? agent.openai_model
                      : agent.groq_model}
                  </span>
                  <span>Temp: {agent.temperature}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Agent Editor Modal */}
      <AgentEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agent={selectedAgent}
        isNew={isNewAgent}
        onSave={handleAgentSaved}
        onClose={handleEditorClose}
      />

      {/* Agent Scheduler Modal */}
      <AgentScheduler open={scheduleOpen} onOpenChange={setScheduleOpen} />

      {/* A/B Test Dashboard Modal */}
      <ABTestDashboard open={abTestOpen} onOpenChange={setABTestOpen} />
    </div>
  );
};

export default AgentsPage;
