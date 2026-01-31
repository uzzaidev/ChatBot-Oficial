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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import type { Agent } from "@/lib/types";
import {
  Bot,
  Brain,
  Check,
  Loader2,
  MessageSquare,
  Power,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

// =====================================================
// CONSTANTS - Modelos disponíveis
// =====================================================

const OPENAI_MODELS = [
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "Mais inteligente e rápido",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description: "Econômico e eficiente",
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "Alta capacidade",
  },
  { value: "gpt-4", label: "GPT-4", description: "Modelo clássico" },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    description: "Rápido e barato",
  },
] as const;

const GROQ_MODELS = [
  {
    value: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    description: "Mais recente e capaz",
  },
  {
    value: "llama-3.1-70b-versatile",
    label: "Llama 3.1 70B",
    description: "Estável e poderoso",
  },
  {
    value: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B",
    description: "Ultra rápido",
  },
  {
    value: "mixtral-8x7b-32768",
    label: "Mixtral 8x7B",
    description: "Bom custo-benefício",
  },
] as const;

const ANTHROPIC_MODELS = [
  {
    value: "claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    description: "Equilibrado",
  },
  {
    value: "claude-3-5-haiku-20241022",
    label: "Claude 3.5 Haiku",
    description: "Rápido",
  },
  {
    value: "claude-3-opus",
    label: "Claude 3 Opus",
    description: "Mais inteligente",
  },
] as const;

const GOOGLE_MODELS = [
  {
    value: "gemini-2.0-flash-exp",
    label: "Gemini 2.0 Flash",
    description: "Preview gratuito",
  },
  {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    description: "Alta capacidade",
  },
  {
    value: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    description: "Rápido",
  },
] as const;

const TONE_OPTIONS = [
  {
    value: "formal",
    label: "Formal",
    description: "Linguagem formal e respeitosa",
  },
  {
    value: "friendly",
    label: "Amigável",
    description: "Tom caloroso e acolhedor",
  },
  {
    value: "professional",
    label: "Profissional",
    description: "Equilibrado e competente",
  },
  { value: "casual", label: "Casual", description: "Descontraído e informal" },
] as const;

const STYLE_OPTIONS = [
  {
    value: "helpful",
    label: "Prestativo",
    description: "Foca em ajudar e resolver",
  },
  {
    value: "direct",
    label: "Direto",
    description: "Respostas objetivas e concisas",
  },
  { value: "educational", label: "Educativo", description: "Explica e ensina" },
  {
    value: "consultative",
    label: "Consultivo",
    description: "Faz perguntas e orienta",
  },
] as const;

const LENGTH_OPTIONS = [
  { value: "short", label: "Curto", description: "1-2 frases" },
  { value: "medium", label: "Médio", description: "1 parágrafo" },
  { value: "long", label: "Longo", description: "Explicações detalhadas" },
] as const;

const EMOJI_OPTIONS = [
  "🤖",
  "👋",
  "💼",
  "🎯",
  "💡",
  "🚀",
  "✨",
  "🌟",
  "💬",
  "🤝",
  "🧠",
  "⚡",
  "🔧",
  "📊",
  "🎨",
];

const DEFAULT_AGENT: Partial<Agent> = {
  name: "",
  slug: "",
  avatar_emoji: "🤖",
  description: "",
  response_tone: "professional",
  response_style: "helpful",
  language: "pt-BR",
  use_emojis: true,
  max_response_length: "medium",
  role_description: "",
  primary_goal: "",
  forbidden_topics: [],
  always_mention: [],
  greeting_message: "",
  fallback_message: "",
  enable_human_handoff: true,
  enable_document_search: true,
  enable_audio_response: false,
  enable_tools: false,
  enable_rag: true,
  rag_threshold: 0.7,
  rag_max_results: 3,
  primary_provider: "groq",
  openai_model: "gpt-4o",
  groq_model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  max_tokens: 2000,
  max_chat_history: 15,
  batching_delay_seconds: 10,
  message_delay_ms: 2000,
  message_split_enabled: false,
};

// =====================================================
// TYPES
// =====================================================

interface AgentEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent | null;
  isNew: boolean;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

interface TestChatMessage {
  role: "user" | "assistant";
  content: string;
}

// =====================================================
// COMPONENT
// =====================================================

export const AgentEditorModal = ({
  open,
  onOpenChange,
  agent,
  isNew,
  onSave,
  onClose,
}: AgentEditorModalProps) => {
  const [formData, setFormData] = useState<Partial<Agent>>(DEFAULT_AGENT);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activeTab, setActiveTab] = useState("identity");

  // Test chat state
  const [testMessages, setTestMessages] = useState<TestChatMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  // Initialize form when agent changes
  useEffect(() => {
    if (agent) {
      setFormData(agent);
    } else {
      setFormData(DEFAULT_AGENT);
    }
    setTestMessages([]);
    setTestInput("");
    setActiveTab("identity");
  }, [agent, open]);

  // Generate slug from name
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    }));
  };

  // Update form field
  const updateField = <K extends keyof Agent>(field: K, value: Agent[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do agente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const endpoint = isNew ? "/api/agents" : `/api/agents/${agent?.id}`;
      const method = isNew ? "POST" : "PATCH";

      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: isNew ? "Agente Criado" : "Agente Atualizado",
          description: `${formData.name} foi ${
            isNew ? "criado" : "atualizado"
          } com sucesso.`,
        });
        onSave(data.agent);
      } else {
        toast({
          title: "Erro",
          description: data.error || "Falha ao salvar agente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error saving agent:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar agente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle activate
  const handleActivate = async () => {
    if (!agent?.id) return;

    try {
      setActivating(true);
      const response = await apiFetch(`/api/agents/${agent.id}/activate`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "Agente Ativado",
          description: `${formData.name} agora está ativo e respondendo mensagens.`,
        });
        // Update local state
        setFormData((prev) => ({ ...prev, is_active: true }));
        onSave({ ...agent, is_active: true });
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
    } finally {
      setActivating(false);
    }
  };

  // Handle test message
  const handleSendTest = async () => {
    if (!testInput.trim() || !agent?.id) return;

    const userMessage = testInput.trim();
    setTestInput("");
    setTestMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setTestLoading(true);

    try {
      const response = await apiFetch(`/api/agents/${agent.id}/test`, {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
          liveConfig: formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
      } else {
        toast({
          title: "Erro no teste",
          description: data.error || "Falha ao testar agente",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing agent:", error);
      toast({
        title: "Erro",
        description: "Falha ao testar agente",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleClearTest = () => {
    setTestMessages([]);
    setTestInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{formData.avatar_emoji}</span>
              <div>
                <DialogTitle className="text-xl">
                  {isNew ? "Novo Agente" : formData.name || "Editar Agente"}
                </DialogTitle>
                <DialogDescription>
                  Configure a personalidade e comportamento do agente
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isNew && (
                <>
                  {formData.is_active ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Ativo
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleActivate}
                      disabled={activating}
                    >
                      {activating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Power className="w-4 h-4 mr-2" />
                      )}
                      Ativar Este Agente
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <div className="px-6 border-b shrink-0">
              <TabsList className="h-12">
                <TabsTrigger value="identity" className="gap-2">
                  <Bot className="w-4 h-4" />
                  Identidade
                </TabsTrigger>
                <TabsTrigger value="behavior" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comportamento
                </TabsTrigger>
                <TabsTrigger value="model" className="gap-2">
                  <Brain className="w-4 h-4" />
                  Modelo IA
                </TabsTrigger>
                <TabsTrigger value="advanced" className="gap-2">
                  <Settings2 className="w-4 h-4" />
                  Avançado
                </TabsTrigger>
                <TabsTrigger value="test" className="gap-2" disabled={isNew}>
                  <Send className="w-4 h-4" />
                  Testar
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              {/* IDENTITY TAB */}
              <TabsContent value="identity" className="p-6 space-y-6 mt-0">
                <div className="grid grid-cols-[auto_1fr] gap-6">
                  {/* Avatar Selection */}
                  <div className="space-y-3">
                    <Label>Avatar</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => updateField("avatar_emoji", emoji)}
                          className={`text-2xl p-2 rounded-lg transition-all hover:scale-110 ${
                            formData.avatar_emoji === emoji
                              ? "bg-primary/20 ring-2 ring-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name & Slug */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Agente *</Label>
                        <Input
                          id="name"
                          value={formData.name || ""}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Ex: Vendas Expert"
                          className="text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">Identificador (slug)</Label>
                        <Input
                          id="slug"
                          value={formData.slug || ""}
                          onChange={(e) => updateField("slug", e.target.value)}
                          placeholder="vendas-expert"
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={formData.description || ""}
                        onChange={(e) =>
                          updateField("description", e.target.value)
                        }
                        placeholder="Descreva brevemente o propósito e características deste agente..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Tone & Style */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Tom & Estilo de Comunicação
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Tom de Voz</Label>
                      <Select
                        value={formData.response_tone}
                        onValueChange={(v) =>
                          updateField(
                            "response_tone",
                            v as Agent["response_tone"],
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {opt.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Estilo de Resposta</Label>
                      <Select
                        value={formData.response_style}
                        onValueChange={(v) =>
                          updateField(
                            "response_style",
                            v as Agent["response_style"],
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STYLE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {opt.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tamanho das Respostas</Label>
                      <Select
                        value={formData.max_response_length}
                        onValueChange={(v) =>
                          updateField(
                            "max_response_length",
                            v as Agent["max_response_length"],
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LENGTH_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{opt.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {opt.description}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg h-fit self-end">
                      <div>
                        <Label
                          htmlFor="emojis"
                          className="cursor-pointer text-sm"
                        >
                          Usar Emojis
                        </Label>
                      </div>
                      <Switch
                        id="emojis"
                        checked={formData.use_emojis}
                        onCheckedChange={(v) => updateField("use_emojis", v)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* BEHAVIOR TAB */}
              <TabsContent value="behavior" className="p-6 space-y-6 mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Papel & Objetivo</h3>

                  <div className="space-y-2">
                    <Label htmlFor="role">
                      Descrição do Papel / System Prompt
                      <span className="text-xs text-muted-foreground ml-2">
                        (Descreva quem é o agente, seu contexto e como deve se
                        comportar)
                      </span>
                    </Label>
                    <Textarea
                      id="role"
                      value={formData.role_description || ""}
                      onChange={(e) =>
                        updateField("role_description", e.target.value)
                      }
                      placeholder="Ex: Você é um especialista em vendas de produtos de tecnologia. Sua empresa é a XYZ e você atende clientes via WhatsApp. Seja sempre educado e profissional..."
                      rows={8}
                      className="font-mono text-sm resize-y min-h-[200px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goal">
                      Objetivo Principal
                      <span className="text-xs text-muted-foreground ml-2">
                        (O que o agente deve buscar alcançar)
                      </span>
                    </Label>
                    <Textarea
                      id="goal"
                      value={formData.primary_goal || ""}
                      onChange={(e) =>
                        updateField("primary_goal", e.target.value)
                      }
                      placeholder="Ex: Qualificar leads, entender necessidades e agendar demonstrações do produto"
                      rows={3}
                      className="resize-y"
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Mensagens Especiais</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="greeting">Mensagem de Saudação</Label>
                      <Textarea
                        id="greeting"
                        value={formData.greeting_message || ""}
                        onChange={(e) =>
                          updateField("greeting_message", e.target.value)
                        }
                        placeholder="Mensagem quando um novo contato inicia conversa..."
                        rows={4}
                        className="resize-y"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fallback">Mensagem de Fallback</Label>
                      <Textarea
                        id="fallback"
                        value={formData.fallback_message || ""}
                        onChange={(e) =>
                          updateField("fallback_message", e.target.value)
                        }
                        placeholder="Quando o agente não consegue responder..."
                        rows={4}
                        className="resize-y"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Ferramentas & Integrações
                  </h3>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="cursor-pointer">
                          Base de Conhecimento (RAG)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Buscar informações nos documentos
                        </p>
                      </div>
                      <Switch
                        checked={formData.enable_rag}
                        onCheckedChange={(v) => updateField("enable_rag", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="cursor-pointer">
                          Transferir para Humano
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Permite solicitar atendimento humano
                        </p>
                      </div>
                      <Switch
                        checked={formData.enable_human_handoff}
                        onCheckedChange={(v) =>
                          updateField("enable_human_handoff", v)
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label className="cursor-pointer">
                          Resposta em Áudio (TTS)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Converte respostas em áudio
                        </p>
                      </div>
                      <Switch
                        checked={formData.enable_audio_response}
                        onCheckedChange={(v) =>
                          updateField("enable_audio_response", v)
                        }
                      />
                    </div>
                  </div>

                  {/* RAG Settings */}
                  {formData.enable_rag && (
                    <div className="pl-4 border-l-2 border-primary/30 space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            Threshold de Relevância:{" "}
                            {formData.rag_threshold?.toFixed(2)}
                          </Label>
                          <Slider
                            value={[formData.rag_threshold || 0.7]}
                            onValueChange={([v]) =>
                              updateField("rag_threshold", v)
                            }
                            min={0.3}
                            max={1}
                            step={0.05}
                          />
                          <p className="text-xs text-muted-foreground">
                            Menor = mais resultados, Maior = mais precisos
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>
                            Máximo de Resultados: {formData.rag_max_results}
                          </Label>
                          <Slider
                            value={[formData.rag_max_results || 3]}
                            onValueChange={([v]) =>
                              updateField("rag_max_results", v)
                            }
                            min={1}
                            max={10}
                            step={1}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* MODEL TAB */}
              <TabsContent value="model" className="p-6 space-y-6 mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Provider Principal</h3>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        value: "groq",
                        label: "Groq",
                        color: "orange",
                        desc: "Rápido e econômico",
                      },
                      {
                        value: "openai",
                        label: "OpenAI",
                        color: "green",
                        desc: "Alta qualidade",
                      },
                    ].map((provider) => (
                      <button
                        key={provider.value}
                        type="button"
                        onClick={() =>
                          updateField(
                            "primary_provider",
                            provider.value as "groq" | "openai",
                          )
                        }
                        className={`p-4 border rounded-lg text-left transition-all ${
                          formData.primary_provider === provider.value
                            ? "ring-2 ring-primary border-primary"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge
                            variant="outline"
                            className={`bg-${provider.color}-500/10 text-${provider.color}-500`}
                          >
                            {provider.label}
                          </Badge>
                          {formData.primary_provider === provider.value && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {provider.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-6">
                  {/* OpenAI Models */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Modelo OpenAI
                    </Label>
                    <Select
                      value={formData.openai_model}
                      onValueChange={(v) => updateField("openai_model", v)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENAI_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Groq Models */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">
                      Modelo Groq
                    </Label>
                    <Select
                      value={formData.groq_model}
                      onValueChange={(v) => updateField("groq_model", v)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GROQ_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{model.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Parâmetros do Modelo
                  </h3>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>
                          Temperatura: {formData.temperature?.toFixed(1)}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {(formData.temperature || 0) < 0.5
                            ? "Mais previsível"
                            : (formData.temperature || 0) > 1
                            ? "Mais criativo"
                            : "Equilibrado"}
                        </span>
                      </div>
                      <Slider
                        value={[formData.temperature || 0.7]}
                        onValueChange={([v]) => updateField("temperature", v)}
                        min={0}
                        max={2}
                        step={0.1}
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>Tokens Máximos: {formData.max_tokens}</Label>
                        <span className="text-xs text-muted-foreground">
                          ~{Math.round((formData.max_tokens || 2000) * 0.75)}{" "}
                          palavras
                        </span>
                      </div>
                      <Slider
                        value={[formData.max_tokens || 2000]}
                        onValueChange={([v]) => updateField("max_tokens", v)}
                        min={256}
                        max={8192}
                        step={256}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ADVANCED TAB */}
              <TabsContent value="advanced" className="p-6 space-y-6 mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Configurações Avançadas
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Estas configurações afetam o comportamento técnico do
                    agente.
                  </p>
                </div>

                <Separator />

                {/* TIMING & BATCHING */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    ⏱️ Timing & Agrupamento de Mensagens
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Configure como o agente agrupa e envia mensagens
                  </p>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>
                          Delay de Agrupamento:{" "}
                          {formData.batching_delay_seconds}s
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          (debounce)
                        </span>
                      </div>
                      <Slider
                        value={[formData.batching_delay_seconds || 10]}
                        onValueChange={([v]) =>
                          updateField("batching_delay_seconds", v)
                        }
                        min={0}
                        max={60}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tempo para esperar mais mensagens antes de processar
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>
                          Delay entre Mensagens: {formData.message_delay_ms}ms
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          (
                          {((formData.message_delay_ms || 2000) / 1000).toFixed(
                            1,
                          )}
                          s)
                        </span>
                      </div>
                      <Slider
                        value={[formData.message_delay_ms || 2000]}
                        onValueChange={([v]) =>
                          updateField("message_delay_ms", v)
                        }
                        min={0}
                        max={10000}
                        step={500}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pausa entre mensagens divididas (mais natural)
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Label>
                          Histórico de Contexto: {formData.max_chat_history}{" "}
                          msgs
                        </Label>
                      </div>
                      <Slider
                        value={[formData.max_chat_history || 15]}
                        onValueChange={([v]) =>
                          updateField("max_chat_history", v)
                        }
                        min={1}
                        max={50}
                        step={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantas mensagens anteriores manter no contexto
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg h-fit">
                      <div>
                        <Label className="cursor-pointer">
                          Dividir Mensagens Longas
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Quebra respostas grandes em várias mensagens
                        </p>
                      </div>
                      <Switch
                        checked={formData.message_split_enabled}
                        onCheckedChange={(v) =>
                          updateField("message_split_enabled", v)
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* FUNCTION CALLING */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    🔧 Function Calling (Tools)
                  </h4>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="cursor-pointer">
                        Habilitar Function Calling
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Permite executar ações como transferência, agendamento,
                        busca de documentos
                      </p>
                    </div>
                    <Switch
                      checked={formData.enable_tools}
                      onCheckedChange={(v) => updateField("enable_tools", v)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Idioma</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Idioma Principal</Label>
                      <Select
                        value={formData.language || "pt-BR"}
                        onValueChange={(v) => updateField("language", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pt-BR">
                            Português (Brasil)
                          </SelectItem>
                          <SelectItem value="pt-PT">
                            Português (Portugal)
                          </SelectItem>
                          <SelectItem value="en-US">English (US)</SelectItem>
                          <SelectItem value="es-ES">Español</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Restrições de Conteúdo</h4>

                  <div className="space-y-2">
                    <Label>
                      Tópicos Proibidos
                      <span className="text-xs text-muted-foreground ml-2">
                        (Assuntos que o agente deve evitar - separe por vírgula)
                      </span>
                    </Label>
                    <Textarea
                      value={(formData.forbidden_topics || []).join(", ")}
                      onChange={(e) =>
                        updateField(
                          "forbidden_topics",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="Ex: concorrentes, política, religião, preços sem aprovação"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Sempre Mencionar
                      <span className="text-xs text-muted-foreground ml-2">
                        (Coisas que o agente deve sempre incluir - separe por
                        vírgula)
                      </span>
                    </Label>
                    <Textarea
                      value={(formData.always_mention || []).join(", ")}
                      onChange={(e) =>
                        updateField(
                          "always_mention",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="Ex: nome da empresa, link do site, horário de atendimento"
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Informações do Sistema</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">ID:</span>{" "}
                      <code className="text-xs">{agent?.id || "Novo"}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Slug:</span>{" "}
                      <code className="text-xs">{formData.slug || "-"}</code>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Criado:</span>{" "}
                      {agent?.created_at
                        ? new Date(agent.created_at).toLocaleDateString("pt-BR")
                        : "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Atualizado:</span>{" "}
                      {agent?.updated_at
                        ? new Date(agent.updated_at).toLocaleDateString("pt-BR")
                        : "-"}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TEST TAB */}
              <TabsContent value="test" className="p-6 mt-0 h-full">
                <div className="flex flex-col h-[500px] border rounded-lg overflow-hidden">
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{formData.avatar_emoji}</span>
                      <span className="font-medium">
                        {formData.name || "Agente"}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearTest}
                      disabled={testMessages.length === 0}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  </div>

                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {testMessages.length === 0 && (
                      <div className="text-center text-muted-foreground py-12">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">
                          Envie uma mensagem para testar o agente
                        </p>
                        <p className="text-sm mt-1">
                          O agente usará as configurações atuais do formulário
                        </p>
                      </div>
                    )}

                    {testMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <span className="text-xs text-muted-foreground block mb-1">
                              {formData.avatar_emoji}{" "}
                              {formData.name || "Agente"}
                            </span>
                          )}
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))}

                    {testLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat input */}
                  <div className="border-t p-4 flex gap-2">
                    <Input
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      placeholder="Digite uma mensagem de teste..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendTest();
                        }
                      }}
                      disabled={testLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendTest}
                      disabled={testLoading || !testInput.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-between items-center shrink-0">
          <div className="text-sm text-muted-foreground">
            {!isNew && formData.is_active && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                Este agente está ativo e respondendo mensagens
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isNew ? "Criar Agente" : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
