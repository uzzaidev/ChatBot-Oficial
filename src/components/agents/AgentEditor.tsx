"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  Send,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

// =====================================================
// CONSTANTS
// =====================================================

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
  enable_rag: true,
  rag_threshold: 0.7,
  rag_max_results: 3,
  primary_provider: "groq",
  openai_model: "gpt-4o",
  groq_model: "llama-3.3-70b-versatile",
  temperature: 0.7,
  max_tokens: 2000,
};

// =====================================================
// TYPES
// =====================================================

interface AgentEditorProps {
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

export const AgentEditor = ({
  open,
  onOpenChange,
  agent,
  isNew,
  onSave,
  onClose,
}: AgentEditorProps) => {
  const [formData, setFormData] = useState<Partial<Agent>>(DEFAULT_AGENT);
  const [saving, setSaving] = useState(false);
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
    // Validate required fields
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
          liveConfig: formData, // Send current form state for preview
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

  // Clear test chat
  const handleClearTest = () => {
    setTestMessages([]);
    setTestInput("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="text-2xl">{formData.avatar_emoji}</span>
            {isNew ? "Novo Agente" : `Editar: ${formData.name}`}
          </SheetTitle>
          <SheetDescription>
            Configure a personalidade e comportamento do agente
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identity" className="text-xs">
                <Bot className="w-3.5 h-3.5 mr-1" />
                Identidade
              </TabsTrigger>
              <TabsTrigger value="behavior" className="text-xs">
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Comportamento
              </TabsTrigger>
              <TabsTrigger value="model" className="text-xs">
                <Brain className="w-3.5 h-3.5 mr-1" />
                Modelo
              </TabsTrigger>
              <TabsTrigger value="test" className="text-xs" disabled={isNew}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                Testar
              </TabsTrigger>
            </TabsList>

            {/* IDENTITY TAB */}
            <TabsContent value="identity" className="mt-4 space-y-6">
              {/* Avatar & Name */}
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="flex flex-wrap gap-2 max-w-[200px]">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => updateField("avatar_emoji", emoji)}
                        className={`text-2xl p-2 rounded-lg transition-all ${
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

                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Agente *</Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Ex: Vendas Expert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Identificador</Label>
                    <Input
                      id="slug"
                      value={formData.slug || ""}
                      onChange={(e) => updateField("slug", e.target.value)}
                      placeholder="vendas-expert"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Descreva brevemente o propósito deste agente..."
                  rows={2}
                />
              </div>

              <Separator />

              {/* Tone & Style */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tom de Voz</Label>
                  <Select
                    value={formData.response_tone}
                    onValueChange={(v) =>
                      updateField("response_tone", v as Agent["response_tone"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
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
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {opt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">
                              {opt.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                  <div>
                    <Label htmlFor="emojis" className="cursor-pointer">
                      Usar Emojis
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Incluir emojis nas respostas
                    </p>
                  </div>
                  <Switch
                    id="emojis"
                    checked={formData.use_emojis}
                    onCheckedChange={(v) => updateField("use_emojis", v)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* BEHAVIOR TAB */}
            <TabsContent value="behavior" className="mt-4 space-y-6">
              <Accordion type="single" collapsible defaultValue="role">
                <AccordionItem value="role">
                  <AccordionTrigger>Papel & Objetivo</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="role">Descrição do Papel</Label>
                      <Textarea
                        id="role"
                        value={formData.role_description || ""}
                        onChange={(e) =>
                          updateField("role_description", e.target.value)
                        }
                        placeholder="Ex: Você é um especialista em vendas de produtos de tecnologia..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goal">Objetivo Principal</Label>
                      <Textarea
                        id="goal"
                        value={formData.primary_goal || ""}
                        onChange={(e) =>
                          updateField("primary_goal", e.target.value)
                        }
                        placeholder="Ex: Qualificar leads e agendar demonstrações"
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="messages">
                  <AccordionTrigger>Mensagens Especiais</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="greeting">Mensagem de Saudação</Label>
                      <Textarea
                        id="greeting"
                        value={formData.greeting_message || ""}
                        onChange={(e) =>
                          updateField("greeting_message", e.target.value)
                        }
                        placeholder="Mensagem inicial quando um novo contato inicia conversa"
                        rows={2}
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
                        placeholder="Quando o agente não consegue responder adequadamente"
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tools">
                  <AccordionTrigger>Ferramentas & Integrações</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
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

                    {formData.enable_rag && (
                      <div className="pl-4 space-y-4 border-l-2 border-primary/30">
                        <div className="space-y-2">
                          <Label>
                            Threshold de Relevância: {formData.rag_threshold}
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
                    )}

                    <div className="flex items-center justify-between p-3 border rounded-lg">
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

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="cursor-pointer">
                          Resposta em Áudio
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Converte respostas em áudio (TTS)
                        </p>
                      </div>
                      <Switch
                        checked={formData.enable_audio_response}
                        onCheckedChange={(v) =>
                          updateField("enable_audio_response", v)
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>

            {/* MODEL TAB */}
            <TabsContent value="model" className="mt-4 space-y-6">
              <div className="space-y-2">
                <Label>Provider Principal</Label>
                <Select
                  value={formData.primary_provider}
                  onValueChange={(v) =>
                    updateField("primary_provider", v as "groq" | "openai")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="groq">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-orange-500/10 text-orange-500"
                        >
                          Groq
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          Rápido e econômico
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="openai">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-500"
                        >
                          OpenAI
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          Alta qualidade
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Modelo Groq</Label>
                  <Select
                    value={formData.groq_model}
                    onValueChange={(v) => updateField("groq_model", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llama-3.3-70b-versatile">
                        Llama 3.3 70B (Recomendado)
                      </SelectItem>
                      <SelectItem value="llama-3.1-70b-versatile">
                        Llama 3.1 70B
                      </SelectItem>
                      <SelectItem value="llama-3.1-8b-instant">
                        Llama 3.1 8B (Rápido)
                      </SelectItem>
                      <SelectItem value="mixtral-8x7b-32768">
                        Mixtral 8x7B
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modelo OpenAI</Label>
                  <Select
                    value={formData.openai_model}
                    onValueChange={(v) => updateField("openai_model", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o">
                        GPT-4o (Recomendado)
                      </SelectItem>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
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

                <div className="space-y-2">
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
            </TabsContent>

            {/* TEST TAB */}
            <TabsContent value="test" className="mt-4">
              <div className="border rounded-lg overflow-hidden flex flex-col h-[400px]">
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
                  {testMessages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Envie uma mensagem para testar o agente</p>
                      <p className="text-xs mt-1">
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
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" && (
                          <span className="text-xs text-muted-foreground block mb-1">
                            {formData.avatar_emoji} {formData.name || "Agente"}
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
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="border-t p-3 flex gap-2">
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
                  />
                  <Button
                    size="icon"
                    onClick={handleSendTest}
                    disabled={testLoading || !testInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleClearTest}
                    disabled={testMessages.length === 0}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
      </SheetContent>
    </Sheet>
  );
};
