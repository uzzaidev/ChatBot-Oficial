"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CRMColumn, CRMTag } from "@/lib/types";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Info,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Types
interface TriggerCondition {
  field: string;
  type: string;
  label: string;
  default?: unknown;
  options?: string[];
}

interface ActionParam {
  field: string;
  type: string;
  label: string;
  required?: boolean;
  options?: string[];
}

interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  variables: string[];
  conditions?: TriggerCondition[];
}

interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  params: ActionParam[];
}

interface AutomationRule {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  action_type: string;
  action_params: Record<string, unknown>;
  is_active: boolean;
  is_system: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface CRMSettings {
  id: string;
  client_id: string;
  auto_status_enabled: boolean;
  lead_tracking_enabled: boolean;
  auto_tag_ads: boolean;
  default_column_id: string | null;
  auto_create_cards: boolean;
  inactivity_warning_days: number;
  inactivity_critical_days: number;
}

interface AutomationRulesPanelProps {
  clientId: string;
  columns: CRMColumn[];
  tags: CRMTag[];
}

const triggerIcons: Record<string, React.ReactNode> = {
  message_received: <MessageSquare className="h-4 w-4" />,
  message_sent: <MessageSquare className="h-4 w-4" />,
  inactivity: <Clock className="h-4 w-4" />,
  status_change: <RefreshCw className="h-4 w-4" />,
  lead_source: <Target className="h-4 w-4" />,
  transfer_human: <Users className="h-4 w-4" />,
  card_created: <Plus className="h-4 w-4" />,
  tag_added: <Tag className="h-4 w-4" />,
};

const actionIcons: Record<string, React.ReactNode> = {
  move_to_column: <ArrowRight className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <Tag className="h-4 w-4" />,
  assign_to: <Users className="h-4 w-4" />,
  update_auto_status: <RefreshCw className="h-4 w-4" />,
  log_activity: <MessageSquare className="h-4 w-4" />,
  add_note: <MessageSquare className="h-4 w-4" />,
};

export function AutomationRulesPanel({
  clientId,
  columns,
  tags,
}: AutomationRulesPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [settings, setSettings] = useState<CRMSettings | null>(null);
  const [triggers, setTriggers] = useState<TriggerDefinition[]>([]);
  const [actions, setActions] = useState<ActionDefinition[]>([]);

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  // Form state for new/edit rule
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    triggerType: "",
    triggerConditions: {} as Record<string, unknown>,
    actionType: "",
    actionParams: {} as Record<string, unknown>,
    priority: 0,
  });

  // Fetch rules and settings
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, settingsRes] = await Promise.all([
        fetch(
          `/api/crm/automation-rules?clientId=${clientId}&includeMetadata=true`,
        ),
        fetch(`/api/crm/settings?clientId=${clientId}`),
      ]);

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
        setTriggers(rulesData.triggers || []);
        setActions(rulesData.actions || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings);
      }
    } catch (error) {
      console.error("Error fetching automation data:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, fetchData]);

  // Toggle rule active status
  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/crm/automation-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ruleId, isActive }),
      });

      if (res.ok) {
        setRules(
          rules.map((r) =>
            r.id === ruleId ? { ...r, is_active: isActive } : r,
          ),
        );
      }
    } catch (error) {
      console.error("Error toggling rule:", error);
    }
  };

  // Update settings
  const updateSettings = async (updates: Partial<CRMSettings>) => {
    if (!settings) return;

    try {
      const res = await fetch("/api/crm/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, ...updates }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  // Open edit dialog
  const openEditDialog = (rule?: AutomationRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        description: rule.description || "",
        triggerType: rule.trigger_type,
        triggerConditions: rule.trigger_conditions,
        actionType: rule.action_type,
        actionParams: rule.action_params,
        priority: rule.priority,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: "",
        description: "",
        triggerType: "",
        triggerConditions: {},
        actionType: "",
        actionParams: {},
        priority: 0,
      });
    }
    setEditDialogOpen(true);
  };

  // Save rule
  const saveRule = async () => {
    setSaving(true);
    try {
      const payload = {
        ...(editingRule ? { id: editingRule.id } : { clientId }),
        name: formData.name,
        description: formData.description || null,
        triggerType: formData.triggerType,
        triggerConditions: formData.triggerConditions,
        actionType: formData.actionType,
        actionParams: formData.actionParams,
        priority: formData.priority,
        isActive: true,
      };

      const res = await fetch("/api/crm/automation-rules", {
        method: editingRule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving rule:", error);
    } finally {
      setSaving(false);
    }
  };

  // Delete rule
  const deleteRule = async () => {
    if (!ruleToDelete) return;

    try {
      await fetch(`/api/crm/automation-rules?id=${ruleToDelete}`, {
        method: "DELETE",
      });
      setRules(rules.filter((r) => r.id !== ruleToDelete));
      setDeleteConfirmOpen(false);
      setRuleToDelete(null);
    } catch (error) {
      console.error("Error deleting rule:", error);
    }
  };

  // Get trigger/action display info
  const getTriggerInfo = (type: string) => triggers.find((t) => t.id === type);
  const getActionInfo = (type: string) => actions.find((a) => a.id === type);

  // Render condition field
  const renderConditionField = (condition: TriggerCondition) => {
    const value = formData.triggerConditions[condition.field];

    if (condition.type === "number") {
      return (
        <Input
          type="number"
          value={String((value as number) || condition.default || "")}
          onChange={(e) =>
            setFormData({
              ...formData,
              triggerConditions: {
                ...formData.triggerConditions,
                [condition.field]: parseInt(e.target.value) || 0,
              },
            })
          }
          className="w-24"
        />
      );
    }

    if (condition.type === "select" && condition.options) {
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              triggerConditions: {
                ...formData.triggerConditions,
                [condition.field]: v,
              },
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {condition.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (condition.type === "tag_select") {
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              triggerConditions: {
                ...formData.triggerConditions,
                [condition.field]: v,
              },
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Selecione tag" />
          </SelectTrigger>
          <SelectContent>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  // Render action param field
  const renderActionParamField = (param: ActionParam) => {
    const value = formData.actionParams[param.field];

    if (param.type === "column_select") {
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              actionParams: {
                ...formData.actionParams,
                [param.field]: v,
              },
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione coluna" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "tag_select") {
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              actionParams: {
                ...formData.actionParams,
                [param.field]: v,
              },
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione tag" />
          </SelectTrigger>
          <SelectContent>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "select" && param.options) {
      return (
        <Select
          value={(value as string) || ""}
          onValueChange={(v) =>
            setFormData({
              ...formData,
              actionParams: {
                ...formData.actionParams,
                [param.field]: v,
              },
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {param.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "text") {
      return (
        <Input
          value={(value as string) || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              actionParams: {
                ...formData.actionParams,
                [param.field]: e.target.value,
              },
            })
          }
          placeholder={param.label}
        />
      );
    }

    return null;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Automações</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Regras de Automação
            </SheetTitle>
            <SheetDescription>
              Configure regras para automatizar ações no seu CRM
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-140px)] pr-4 mt-4">
              {/* Configurações Gerais */}
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Configurações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Auto-Status</Label>
                      <p className="text-xs text-muted-foreground">
                        Atualizar status automaticamente com base em eventos
                      </p>
                    </div>
                    <Switch
                      checked={settings?.auto_status_enabled ?? true}
                      onCheckedChange={(checked) =>
                        updateSettings({ autoStatusEnabled: checked } as Record<
                          string,
                          unknown
                        >)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Rastrear Origem</Label>
                      <p className="text-xs text-muted-foreground">
                        Capturar origem dos leads (anúncios, direto, etc)
                      </p>
                    </div>
                    <Switch
                      checked={settings?.lead_tracking_enabled ?? true}
                      onCheckedChange={(checked) =>
                        updateSettings({
                          leadTrackingEnabled: checked,
                        } as Record<string, unknown>)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Auto-Tag Anúncios</Label>
                      <p className="text-xs text-muted-foreground">
                        Criar tag automaticamente quando vem de anúncio
                      </p>
                    </div>
                    <Switch
                      checked={settings?.auto_tag_ads ?? true}
                      onCheckedChange={(checked) =>
                        updateSettings({ autoTagAds: checked } as Record<
                          string,
                          unknown
                        >)
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">
                        Criar Cards Automaticamente
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Criar card para novos contatos automaticamente
                      </p>
                    </div>
                    <Switch
                      checked={settings?.auto_create_cards ?? true}
                      onCheckedChange={(checked) =>
                        updateSettings({ autoCreateCards: checked } as Record<
                          string,
                          unknown
                        >)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Lista de Regras */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Regras Ativas</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Regra
                </Button>
              </div>

              <div className="space-y-2">
                {rules.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma regra configurada</p>
                    <p className="text-xs">
                      Clique em &quot;Nova Regra&quot; para começar
                    </p>
                  </Card>
                ) : (
                  rules.map((rule) => {
                    const triggerInfo = getTriggerInfo(rule.trigger_type);
                    const actionInfo = getActionInfo(rule.action_type);

                    return (
                      <Card
                        key={rule.id}
                        className={`transition-opacity ${
                          !rule.is_active ? "opacity-50" : ""
                        }`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm truncate">
                                  {rule.name}
                                </span>
                                {rule.is_system && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Sistema
                                  </Badge>
                                )}
                              </div>

                              {rule.description && (
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                                  {rule.description}
                                </p>
                              )}

                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="gap-1 px-1.5"
                                      >
                                        {triggerIcons[rule.trigger_type]}
                                        {triggerInfo?.name || rule.trigger_type}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {triggerInfo?.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <ChevronRight className="h-3 w-3" />

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="gap-1 px-1.5"
                                      >
                                        {actionIcons[rule.action_type]}
                                        {actionInfo?.name || rule.action_type}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {actionInfo?.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Switch
                                checked={rule.is_active}
                                onCheckedChange={(checked) =>
                                  toggleRuleActive(rule.id, checked)
                                }
                                disabled={rule.is_system}
                              />

                              {!rule.is_system && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditDialog(rule)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setRuleToDelete(rule.id);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Info sobre variáveis */}
              <Card className="mt-4 bg-muted/50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Variáveis disponíveis</p>
                      <p>
                        Use{" "}
                        <code className="bg-muted px-1 rounded">
                          {"{{variável}}"}
                        </code>{" "}
                        em textos:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>
                          <code>campaign_name</code> - Nome da campanha
                        </li>
                        <li>
                          <code>ad_name</code> - Nome do anúncio
                        </li>
                        <li>
                          <code>contact_name</code> - Nome do contato
                        </li>
                        <li>
                          <code>inactive_days</code> - Dias sem resposta
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit/Create Rule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Editar Regra" : "Nova Regra de Automação"}
            </DialogTitle>
            <DialogDescription>
              Configure quando e qual ação será executada automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="rule-name">Nome da Regra</Label>
              <Input
                id="rule-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Mover inativos para follow-up"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="rule-desc">Descrição (opcional)</Label>
              <Input
                id="rule-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o que esta regra faz"
              />
            </div>

            <Separator />

            {/* Trigger */}
            <div className="space-y-2">
              <Label>Quando (Trigger)</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    triggerType: v,
                    triggerConditions: {},
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gatilho" />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        {triggerIcons[t.id]}
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Trigger Conditions */}
              {formData.triggerType &&
                getTriggerInfo(formData.triggerType)?.conditions && (
                  <div className="pl-4 border-l-2 border-muted space-y-2">
                    {getTriggerInfo(formData.triggerType)?.conditions?.map(
                      (cond) => (
                        <div
                          key={cond.field}
                          className="flex items-center gap-2"
                        >
                          <Label className="text-xs w-24">{cond.label}:</Label>
                          {renderConditionField(cond)}
                        </div>
                      ),
                    )}
                  </div>
                )}
            </div>

            <Separator />

            {/* Action */}
            <div className="space-y-2">
              <Label>Então (Ação)</Label>
              <Select
                value={formData.actionType}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    actionType: v,
                    actionParams: {},
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        {actionIcons[a.id]}
                        <span>{a.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Params */}
              {formData.actionType &&
                getActionInfo(formData.actionType)?.params && (
                  <div className="pl-4 border-l-2 border-muted space-y-2">
                    {getActionInfo(formData.actionType)?.params.map((param) => (
                      <div key={param.field} className="space-y-1">
                        <Label className="text-xs">
                          {param.label}
                          {param.required && " *"}
                        </Label>
                        {renderActionParamField(param)}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={saveRule}
              disabled={
                saving ||
                !formData.name ||
                !formData.triggerType ||
                !formData.actionType
              }
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Salvar Regra
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Regra?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A regra será removida
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteRule}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
