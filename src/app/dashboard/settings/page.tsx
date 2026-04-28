"use client";

import { EmbeddedSignupButton } from "@/components/EmbeddedSignupButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  MessageCircle,
  Mic,
  Save,
  Search,
  Settings,
  Shield,
  Sparkles,
  Unplug,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SettingsTab =
  | "perfil"
  | "whatsapp"
  | "preferencias"
  | "outras"
  | "suporte"
  | "avancado";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "perfil", label: "Perfil", icon: <User className="w-4 h-4" /> },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: <MessageCircle className="w-4 h-4" />,
  },
  {
    id: "preferencias",
    label: "Preferências",
    icon: <Settings className="w-4 h-4" />,
  },
  { id: "outras", label: "Outras", icon: <Sparkles className="w-4 h-4" /> },
  { id: "suporte", label: "Suporte/Bugs", icon: <Bell className="w-4 h-4" /> },
  { id: "avancado", label: "Avançado", icon: <Shield className="w-4 h-4" /> },
];

const SEARCH_INDEX: { tab: SettingsTab; text: string }[] = [
  {
    tab: "perfil",
    text: "perfil nome email telefone fuso horário senha alterar",
  },
  {
    tab: "whatsapp",
    text: "whatsapp meta business number quality reautenticar desconectar",
  },
  {
    tab: "preferencias",
    text: "tema dark light claro escuro idioma densidade compacta",
  },
  { tab: "outras", text: "agentes ia text-to-speech tts notificações push" },
  { tab: "suporte", text: "suporte bugs modo triagem" },
  {
    tab: "avancado",
    text: "avançado credenciais meta token openai api key sessão segurança apagar conta groq",
  },
];

type CoexistenceSyncState = {
  status?: "requested" | "completed" | "declined" | "failed";
  request_id?: string | null;
  requested_at?: string | null;
  completed_at?: string | null;
  last_webhook_at?: string | null;
  progress?: number | null;
  phase?: number | null;
  chunk_order?: number | null;
  error_code?: number | null;
  error_message?: string | null;
  error_details?: string | null;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("perfil");
  const [searchQuery, setSearchQuery] = useState("");

  const matchedTab = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const lc = searchQuery.toLowerCase();
    return SEARCH_INDEX.find((s) => s.text.includes(lc))?.tab ?? null;
  }, [searchQuery]);

  // Estado do perfil
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Estado da senha
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Estado das variáveis de ambiente
  const [secrets, setSecrets] = useState({
    meta_access_token: "",
    meta_verify_token: "",
    meta_app_secret: "", // SECURITY FIX (VULN-012)
    meta_phone_number_id: "",
    whatsapp_business_account_id: "", // WABA ID
    meta_dataset_id: "", // Meta Ads - Dataset ID for Conversions API
    meta_ad_account_id: "", // Meta Ads - Ad Account ID for Marketing API
    openai_api_key: "",
    openai_admin_key: "",
    groq_api_key: "",
    webhook_url: "",
  });
  const [editingSecrets, setEditingSecrets] = useState(false);
  const [loadingSecrets, setLoadingSecrets] = useState(false);
  const [revalidationPassword, setRevalidationPassword] = useState("");
  const [showRevalidationModal, setShowRevalidationModal] = useState(false);
  const [revalidating, setRevalidating] = useState(false);

  const [aiKeysMode, setAiKeysMode] = useState<
    "platform_only" | "byok_allowed"
  >("platform_only");
  const [supportModeEnabled, setSupportModeEnabled] = useState(false);
  const [loadingSupportMode, setLoadingSupportMode] = useState(false);

  // Auto-provisioned clients (Embedded Signup) don't need manual Meta config
  const [isAutoProvisioned, setIsAutoProvisioned] = useState(false);

  // Client info for migration
  const [clientId, setClientId] = useState<string | null>(null);
  const [webhookRoutingMode, setWebhookRoutingMode] =
    useState<string>("legacy");
  const [isMigrating, setIsMigrating] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isRegisteringPhone, setIsRegisteringPhone] = useState(false);
  const [isDisconnectingWhatsApp, setIsDisconnectingWhatsApp] = useState(false);
  const [onboardingType, setOnboardingType] = useState<string | null>(null);
  const [provisionedAt, setProvisionedAt] = useState<string | null>(null);
  const [coexistenceSync, setCoexistenceSync] = useState<{
    contacts: CoexistenceSyncState | null;
    history: CoexistenceSyncState | null;
  }>({
    contacts: null,
    history: null,
  });
  const [isSyncingContacts, setIsSyncingContacts] = useState(false);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  // Estado de visibilidade de senhas
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>(
    {},
  );

  // Estado de notificações
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estado de cópia
  const [copied, setCopied] = useState<string | null>(null);

  // Carregar perfil do usuário

  // Check for migration success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("migration") === "success") {
      setNotification({
        type: "success",
        message:
          "WhatsApp migrado com sucesso! Suas mensagens agora são recebidas pelo novo sistema.",
      });
      setIsAutoProvisioned(true);
      setWebhookRoutingMode("waba");
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        const response = await apiFetch("/api/user/profile");
        const data = await response.json();

        if (response.ok) {
          setProfile({
            full_name: data.full_name || "",
            email: data.email || "",
            phone: data.phone || "",
          });
        }
      } catch (error) {}
    };

    fetchProfile();
  }, []);

  // Carregar variáveis de ambiente
  useEffect(() => {
    const fetchSecrets = async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        const response = await apiFetch("/api/vault/secrets");
        const data = await response.json();

        if (response.ok) {
          setSecrets(data.secrets || {});
          if (
            data.ai_keys_mode === "platform_only" ||
            data.ai_keys_mode === "byok_allowed"
          ) {
            setAiKeysMode(data.ai_keys_mode);
          }
        }
      } catch (error) {}
    };

    fetchSecrets();
  }, []);

  // Carregar WABA ID do config
  useEffect(() => {
    const fetchClientConfig = async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        const response = await apiFetch("/api/client/config");
        const data = await response.json();

        if (response.ok && data.config) {
          if (
            data.config.ai_keys_mode === "platform_only" ||
            data.config.ai_keys_mode === "byok_allowed"
          ) {
            setAiKeysMode(data.config.ai_keys_mode);
          }

          // Check if client was auto-provisioned via Embedded Signup
          if (data.config.auto_provisioned) {
            setIsAutoProvisioned(true);
          }

          // Store client ID and webhook routing mode for migration
          if (data.client_id) {
            setClientId(data.client_id);
          }
          if (data.config.webhook_routing_mode) {
            setWebhookRoutingMode(data.config.webhook_routing_mode);
          }
          if (data.onboarding_type) {
            setOnboardingType(data.onboarding_type);
          }
          if (data.provisioned_at) {
            setProvisionedAt(data.provisioned_at);
          }
          if (data.provisioning_status) {
            setCoexistenceSync({
              contacts: data.provisioning_status.contacts_sync || null,
              history: data.provisioning_status.history_sync || null,
            });
          }

          // Update WABA ID from client config if present
          if (data.whatsapp_business_account_id) {
            setSecrets((prev) => ({
              ...prev,
              whatsapp_business_account_id: data.whatsapp_business_account_id,
            }));
          }
        }
      } catch (error) {}
    };

    fetchClientConfig();
  }, []);

  useEffect(() => {
    const fetchSupportMode = async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        const response = await apiFetch("/api/config");
        const data = await response.json();
        if (!response.ok) return;

        const supportConfig = (data.configs || []).find(
          (item: { config_key?: string }) =>
            item.config_key === "support_mode:enabled",
        );

        if (supportConfig) {
          setSupportModeEnabled(Boolean(supportConfig.config_value));
        }
      } catch (error) {}
    };

    fetchSupportMode();
  }, []);

  const handleToggleSupportMode = async () => {
    setLoadingSupportMode(true);
    setNotification(null);

    try {
      const nextValue = !supportModeEnabled;
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config_key: "support_mode:enabled",
          config_value: nextValue,
          description:
            "Enable support mode to capture support/bug signals from conversations.",
          category: "rules",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao atualizar modo de suporte");
      }

      setSupportModeEnabled(nextValue);
      setNotification({
        type: "success",
        message: nextValue
          ? "Modo Suporte/Bugs ativado com sucesso."
          : "Modo Suporte/Bugs desativado com sucesso.",
      });
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar modo de suporte",
      });
    } finally {
      setLoadingSupportMode(false);
    }
  };

  // Atualizar nome do usuário
  const handleUpdateProfile = async () => {
    setLoadingProfile(true);
    setNotification(null);

    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: profile.full_name }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({
          type: "success",
          message: "Nome atualizado com sucesso!",
        });
        setEditingProfile(false);
      } else {
        setNotification({
          type: "error",
          message: data.error || "Erro ao atualizar nome",
        });
      }
    } catch (error) {
      setNotification({ type: "error", message: "Erro ao atualizar nome" });
    } finally {
      setLoadingProfile(false);
    }
  };

  // Atualizar senha
  const handleUpdatePassword = async () => {
    setLoadingPassword(true);
    setNotification(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotification({ type: "error", message: "As senhas não coincidem" });
      setLoadingPassword(false);
      return;
    }

    if (passwordForm.new_password.length < 8) {
      setNotification({
        type: "error",
        message: "A senha deve ter pelo menos 8 caracteres",
      });
      setLoadingPassword(false);
      return;
    }

    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({
          type: "success",
          message: "Senha atualizada com sucesso!",
        });
        setPasswordForm({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        setNotification({
          type: "error",
          message: data.error || "Erro ao atualizar senha",
        });
      }
    } catch (error) {
      setNotification({ type: "error", message: "Erro ao atualizar senha" });
    } finally {
      setLoadingPassword(false);
    }
  };

  // Revalidar senha antes de editar variáveis
  const handleRevalidatePassword = async () => {
    setRevalidating(true);
    setNotification(null);

    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/user/revalidate-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: revalidationPassword }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setShowRevalidationModal(false);
        setEditingSecrets(true);
        setRevalidationPassword("");
        setNotification({
          type: "success",
          message: "Senha validada! Você pode editar as variáveis.",
        });
      } else {
        setNotification({ type: "error", message: "Senha incorreta" });
      }
    } catch (error) {
      setNotification({ type: "error", message: "Erro ao validar senha" });
    } finally {
      setRevalidating(false);
    }
  };

  // Atualizar variável de ambiente
  const handleUpdateSecret = async (key: string, value: string) => {
    setLoadingSecrets(true);
    setNotification(null);

    try {
      const { apiFetch } = await import("@/lib/api");

      // Fields stored in clients table (not vault)
      const clientTableFields = [
        "whatsapp_business_account_id",
        "meta_dataset_id",
        "meta_ad_account_id",
      ];

      if (clientTableFields.includes(key)) {
        const response = await apiFetch("/api/client/meta-config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: value }),
        });

        const data = await response.json();

        if (response.ok) {
          const fieldNames: Record<string, string> = {
            whatsapp_business_account_id: "WABA ID",
            meta_dataset_id: "Meta Dataset ID",
            meta_ad_account_id: "Meta Ad Account ID",
          };
          setNotification({
            type: "success",
            message: `${fieldNames[key] || key} atualizado com sucesso!`,
          });
          // Update local state
          setSecrets((prev) => ({
            ...prev,
            [key]: value,
          }));
        } else {
          setNotification({
            type: "error",
            message: data.error || `Erro ao atualizar ${key}`,
          });
        }
      } else {
        // Other secrets go to vault
        const response = await apiFetch("/api/vault/secrets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value }),
        });

        const data = await response.json();

        if (response.ok) {
          setNotification({
            type: "success",
            message: `${key} atualizado com sucesso!`,
          });
          // Recarregar secrets para mostrar valor atualizado (mascarado)
          const refreshResponse = await apiFetch("/api/vault/secrets");
          const refreshData = await refreshResponse.json();
          if (refreshResponse.ok) {
            setSecrets(refreshData.secrets || {});
            if (
              refreshData.ai_keys_mode === "platform_only" ||
              refreshData.ai_keys_mode === "byok_allowed"
            ) {
              setAiKeysMode(refreshData.ai_keys_mode);
            }
          }
        } else {
          const errorMessage = data.details
            ? `${data.error}: ${data.details}`
            : data.error || "Erro ao atualizar variável";
          setNotification({ type: "error", message: errorMessage });
        }
      }
    } catch (error) {
      setNotification({ type: "error", message: "Erro ao atualizar variável" });
    } finally {
      setLoadingSecrets(false);
    }
  };

  const handleUpdateAIKeysMode = async (
    mode: "platform_only" | "byok_allowed",
  ) => {
    setLoadingSecrets(true);
    setNotification(null);

    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/client/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_keys_mode: mode }),
      });

      const data = await response.json();

      if (response.ok) {
        setAiKeysMode(mode);
        setNotification({
          type: "success",
          message: "Modo de chaves de IA atualizado com sucesso!",
        });
      } else {
        setNotification({
          type: "error",
          message: data.error || "Erro ao atualizar modo de chaves de IA",
        });
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: "Erro ao atualizar modo de chaves de IA",
      });
    } finally {
      setLoadingSecrets(false);
    }
  };

  // Copiar para clipboard
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Toggle visibilidade de senha
  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const canShowCoexistenceSyncCard =
    isAutoProvisioned || Boolean(secrets.meta_phone_number_id);

  const isSyncLocked = (syncState: CoexistenceSyncState | null) => {
    if (!syncState) return false;
    if (syncState.request_id) return true;

    return (
      syncState.status === "requested" ||
      syncState.status === "completed" ||
      syncState.status === "declined"
    );
  };

  const formatSyncStatus = (syncState: CoexistenceSyncState | null) => {
    switch (syncState?.status) {
      case "completed":
        return "Concluído";
      case "declined":
        return "Recusado pela empresa";
      case "failed":
        return "Falhou";
      case "requested":
        return "Solicitado";
      default:
        return "Não solicitado";
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("pt-BR");
  };

  const handleRequestCoexistenceSync = async (
    syncType: "contacts" | "history",
  ) => {
    const setLoading =
      syncType === "contacts" ? setIsSyncingContacts : setIsSyncingHistory;

    setLoading(true);
    setNotification(null);

    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/client/whatsapp-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sync_type: syncType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao solicitar sincronização");
      }

      setCoexistenceSync((prev) => ({
        ...prev,
        [syncType]: data.sync_state || prev[syncType],
      }));

      setNotification({
        type: "success",
        message:
          syncType === "contacts"
            ? `Sincronização de contatos solicitada. Request ID: ${
                data.request_id || "sem request_id"
              }`
            : `Sincronização de histórico solicitada. Request ID: ${
                data.request_id || "sem request_id"
              }`,
      });
    } catch (error) {
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro ao solicitar sincronização",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky page header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 pt-5 pb-0">
        <div className="flex items-start gap-4 mb-4 flex-wrap max-w-5xl">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-poppins font-bold tracking-tight">
              Configurações
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Conta, integrações e ajustes do sistema
            </p>
          </div>
          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar configuração…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-16"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">
              ⌘K
            </kbd>
            {/* Search suggestion dropdown */}
            {matchedTab && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl p-1.5 shadow-lg z-20">
                <button
                  onClick={() => {
                    setActiveTab(matchedTab);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors text-left"
                >
                  <span className="text-primary">
                    {TABS.find((t) => t.id === matchedTab)?.icon}
                  </span>
                  Ir para{" "}
                  <strong>
                    {TABS.find((t) => t.id === matchedTab)?.label}
                  </strong>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 -mx-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={[
                "flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-all",
                "border-b-2 -mb-px",
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-6 py-7 space-y-5">
        {/* Notification banner */}
        {notification && (
          <Alert
            variant={notification.type === "error" ? "destructive" : "default"}
          >
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* ── PERFIL ── */}
        {activeTab === "perfil" && (
          <>
            {/* Seção 1: Perfil do Usuário */}
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Perfil do Usuário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Nome */}
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      disabled={!editingProfile || loadingProfile}
                    />
                    {!editingProfile ? (
                      <Button onClick={() => setEditingProfile(true)}>
                        Editar
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={handleUpdateProfile}
                          disabled={loadingProfile}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Salvar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingProfile(false)}
                          disabled={loadingProfile}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Email (readonly) */}
                <div>
                  <Label htmlFor="email" className="text-foreground">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={profile.email}
                    disabled
                    className="mt-2 bg-muted/50 border-border text-foreground/70"
                  />
                </div>

                {/* Telefone (readonly) */}
                <div>
                  <Label htmlFor="phone" className="text-foreground">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    value={profile.phone || "Não configurado"}
                    disabled
                    className="mt-2 bg-muted/50 border-border text-foreground/70"
                  />
                </div>

                <div className="border-t border-border pt-5 space-y-4">
                  <p className="text-sm font-medium text-foreground">
                    Alterar Senha
                  </p>
                  <div>
                    <Label htmlFor="current_password">Senha Atual</Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          current_password: e.target.value,
                        })
                      }
                      disabled={loadingPassword}
                      className="mt-2 bg-muted/50 border-border text-foreground"
                      placeholder="Senha atual"
                    />
                  </div>

                  <div>
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          new_password: e.target.value,
                        })
                      }
                      disabled={loadingPassword}
                      className="mt-2 bg-muted/50 border-border text-foreground"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm_password">Confirmar Senha</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirm_password: e.target.value,
                        })
                      }
                      disabled={loadingPassword}
                      className="mt-2 bg-muted/50 border-border text-foreground"
                      placeholder="Repita a nova senha"
                    />
                  </div>

                  <Button
                    onClick={handleUpdatePassword}
                    disabled={loadingPassword}
                  >
                    {loadingPassword ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── WHATSAPP ── */}
        {activeTab === "whatsapp" && (
          <>
            {/* Seção 4: Variáveis de Ambiente */}
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      Variáveis de Ambiente
                    </CardTitle>
                  </div>
                  {!editingSecrets && (
                    <Button
                      onClick={() => setShowRevalidationModal(true)}
                      variant="outline"
                      className="gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      Editar
                    </Button>
                  )}
                  {editingSecrets && (
                    <Button
                      onClick={() => setEditingSecrets(false)}
                      variant="outline"
                    >
                      Bloquear Edição
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {/* Auto-provisioned clients: show connected status instead of manual fields */}
                {isAutoProvisioned && (
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">
                          WhatsApp conectado via Embedded Signup
                        </span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isDisconnectingWhatsApp}
                        onClick={async () => {
                          if (
                            !confirm(
                              "Tem certeza que deseja desconectar o WhatsApp? O bot parará de funcionar até reconectar.",
                            )
                          )
                            return;
                          setIsDisconnectingWhatsApp(true);
                          try {
                            const { apiFetch } = await import("@/lib/api");
                            const res = await apiFetch(
                              "/api/auth/meta/disconnect",
                              { method: "DELETE" },
                            );
                            const data = await res.json();
                            if (!res.ok)
                              throw new Error(
                                data.error || "Erro ao desconectar",
                              );
                            setIsAutoProvisioned(false);
                            setNotification({
                              type: "success",
                              message: `WhatsApp ${
                                data.disconnected?.phone || ""
                              } desconectado com sucesso.`,
                            });
                          } catch (err) {
                            setNotification({
                              type: "error",
                              message:
                                err instanceof Error
                                  ? err.message
                                  : "Erro ao desconectar WhatsApp",
                            });
                          } finally {
                            setIsDisconnectingWhatsApp(false);
                          }
                        }}
                      >
                        {isDisconnectingWhatsApp ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Desconectando...
                          </>
                        ) : (
                          <>
                            <Unplug className="mr-2 h-4 w-4" />
                            Desconectar WhatsApp
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gerenciado automaticamente pela plataforma.
                    </p>
                  </div>
                )}

                {canShowCoexistenceSyncCard && (
                  <div className="rounded-lg border border-border p-4 mb-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-medium">
                          Sincronização Coexistence
                        </p>
                        {provisionedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Janela até{" "}
                            {formatDateTime(
                              new Date(
                                new Date(provisionedAt).getTime() +
                                  24 * 60 * 60 * 1000,
                              ).toISOString(),
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            isSyncingContacts ||
                            isSyncLocked(coexistenceSync.contacts)
                          }
                          onClick={() =>
                            handleRequestCoexistenceSync("contacts")
                          }
                        >
                          {isSyncingContacts ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Contatos"
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            isSyncingHistory ||
                            isSyncLocked(coexistenceSync.history)
                          }
                          onClick={() =>
                            handleRequestCoexistenceSync("history")
                          }
                        >
                          {isSyncingHistory ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Histórico"
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground border border-border rounded px-3 py-2">
                        <span>Contatos</span>
                        <span>
                          {formatSyncStatus(coexistenceSync.contacts)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground border border-border rounded px-3 py-2">
                        <span>Histórico</span>
                        <span>{formatSyncStatus(coexistenceSync.history)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Legacy clients: migration banner */}
                {!isAutoProvisioned &&
                  webhookRoutingMode !== "waba" &&
                  clientId && (
                    <div className="rounded-lg border border-border p-4 mb-4 flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Conectado via configuração manual. Migre para Embedded
                        Signup para gerenciamento automático.
                      </p>
                      <div className="flex gap-2 shrink-0">
                        <EmbeddedSignupButton
                          clientId={clientId || undefined}
                          variant="default"
                          size="sm"
                          onSuccess={(data) => {
                            setNotification({
                              type: "success",
                              message: `WhatsApp ${data.displayPhone} conectado com sucesso via Embedded Signup!`,
                            });
                          }}
                          onError={(error) => {
                            setNotification({ type: "error", message: error });
                          }}
                        >
                          Migrar
                        </EmbeddedSignupButton>
                        <Button
                          onClick={async () => {
                            setIsRollingBack(true);
                            try {
                              const res = await fetch(
                                "/api/client/migrate/rollback",
                                { method: "POST" },
                              );
                              const data = await res.json();
                              if (!res.ok)
                                throw new Error(
                                  data.error || "Erro ao reverter",
                                );
                              setNotification({
                                type: "success",
                                message:
                                  "WhatsApp reconectado ao app anterior.",
                              });
                            } catch (err) {
                              setNotification({
                                type: "error",
                                message:
                                  err instanceof Error
                                    ? err.message
                                    : "Erro ao reverter. Tente novamente.",
                              });
                            } finally {
                              setIsRollingBack(false);
                            }
                          }}
                          disabled={isRollingBack || isMigrating}
                          variant="outline"
                          size="sm"
                        >
                          {isRollingBack ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Reverter"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                {/* Legacy clients: manual Meta credential fields */}
                {!isAutoProvisioned && (
                  <>
                    {/* Meta Access Token */}
                    <div>
                      <Label
                        htmlFor="meta_access_token"
                        className="text-foreground"
                      >
                        Meta Access Token
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                          <Input
                            id="meta_access_token"
                            type={
                              showPasswords["meta_access_token"]
                                ? "text"
                                : "password"
                            }
                            value={secrets.meta_access_token}
                            onChange={(e) =>
                              setSecrets({
                                ...secrets,
                                meta_access_token: e.target.value,
                              })
                            }
                            disabled={!editingSecrets}
                            className="bg-muted/50 border-border text-foreground font-mono text-sm"
                            placeholder="EAABsbCS1iHgBO7ZC..."
                          />
                          <button
                            type="button"
                            onClick={() =>
                              togglePasswordVisibility("meta_access_token")
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPasswords["meta_access_token"] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {editingSecrets && (
                          <Button
                            onClick={() =>
                              handleUpdateSecret(
                                "meta_access_token",
                                secrets.meta_access_token,
                              )
                            }
                            disabled={loadingSecrets}
                          >
                            Salvar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Meta Verify Token */}
                    <div>
                      <Label htmlFor="meta_verify_token">
                        Meta Verify Token
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                          <Input
                            id="meta_verify_token"
                            type={
                              showPasswords["meta_verify_token"]
                                ? "text"
                                : "password"
                            }
                            value={secrets.meta_verify_token}
                            onChange={(e) =>
                              setSecrets({
                                ...secrets,
                                meta_verify_token: e.target.value,
                              })
                            }
                            disabled={!editingSecrets}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              togglePasswordVisibility("meta_verify_token")
                            }
                            className="absolute right-2 top-2"
                          >
                            {showPasswords["meta_verify_token"] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {editingSecrets && (
                          <Button
                            onClick={() =>
                              handleUpdateSecret(
                                "meta_verify_token",
                                secrets.meta_verify_token,
                              )
                            }
                            disabled={loadingSecrets}
                          >
                            Salvar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Meta App Secret - SECURITY FIX (VULN-012) */}
                    <div>
                      <Label htmlFor="meta_app_secret">Meta App Secret</Label>
                      <div className="flex gap-2 mt-2">
                        <div className="relative flex-1">
                          <Input
                            id="meta_app_secret"
                            type={
                              showPasswords["meta_app_secret"]
                                ? "text"
                                : "password"
                            }
                            value={secrets.meta_app_secret}
                            onChange={(e) =>
                              setSecrets({
                                ...secrets,
                                meta_app_secret: e.target.value,
                              })
                            }
                            disabled={!editingSecrets}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              togglePasswordVisibility("meta_app_secret")
                            }
                            className="absolute right-2 top-2"
                          >
                            {showPasswords["meta_app_secret"] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {editingSecrets && (
                          <Button
                            onClick={() =>
                              handleUpdateSecret(
                                "meta_app_secret",
                                secrets.meta_app_secret,
                              )
                            }
                            disabled={loadingSecrets}
                          >
                            Salvar
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Divisor */}
                <div className="border-t my-6"></div>

                {/* Seção de Credenciais de IA */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm mb-4 flex items-center gap-2 text-foreground">
                      <Key className="w-4 h-4 text-muted-foreground" />
                      Credenciais de IA
                    </h3>
                  </div>

                  {/* OpenAI API Key */}
                  <div>
                    <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Input
                          id="openai_api_key"
                          type={
                            showPasswords["openai_api_key"]
                              ? "text"
                              : "password"
                          }
                          value={secrets.openai_api_key}
                          onChange={(e) =>
                            setSecrets({
                              ...secrets,
                              openai_api_key: e.target.value,
                            })
                          }
                          disabled={!editingSecrets}
                          placeholder="sk-proj-..."
                        />
                        <button
                          type="button"
                          onClick={() =>
                            togglePasswordVisibility("openai_api_key")
                          }
                          className="absolute right-2 top-2"
                        >
                          {showPasswords["openai_api_key"] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {editingSecrets && (
                        <Button
                          onClick={() =>
                            handleUpdateSecret(
                              "openai_api_key",
                              secrets.openai_api_key,
                            )
                          }
                          disabled={loadingSecrets}
                        >
                          Salvar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Obtenha em:{" "}
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        platform.openai.com/api-keys
                      </a>
                    </p>
                  </div>

                  {/* Groq API Key */}
                  <div>
                    <Label htmlFor="groq_api_key">Groq API Key</Label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Input
                          id="groq_api_key"
                          type={
                            showPasswords["groq_api_key"] ? "text" : "password"
                          }
                          value={secrets.groq_api_key}
                          onChange={(e) =>
                            setSecrets({
                              ...secrets,
                              groq_api_key: e.target.value,
                            })
                          }
                          disabled={!editingSecrets}
                          placeholder="gsk_..."
                        />
                        <button
                          type="button"
                          onClick={() =>
                            togglePasswordVisibility("groq_api_key")
                          }
                          className="absolute right-2 top-2"
                        >
                          {showPasswords["groq_api_key"] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {editingSecrets && (
                        <Button
                          onClick={() =>
                            handleUpdateSecret(
                              "groq_api_key",
                              secrets.groq_api_key,
                            )
                          }
                          disabled={loadingSecrets}
                        >
                          Salvar
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Obtenha em:{" "}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        console.groq.com/keys
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── OUTRAS ── */}
        {activeTab === "outras" && (
          <>
            {/* Seção 4.5: Links Rápidos para Outras Configurações */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Card TTS */}
              <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/30 hover:border-blue-500/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Mic className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Text-to-Speech
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure vozes, velocidade e qualidade de áudio
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                            6 vozes
                          </span>
                          <span className="text-xs bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                            HD
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href="/dashboard/settings/tts">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Card Notificações */}
              <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 hover:border-amber-500/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <BellRing className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Notificações Push
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Categorias, som, vibração e modo Não Perturbe
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                            5 categorias
                          </span>
                          <span className="text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded">
                            DND
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href="/dashboard/settings/notifications">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Card Agentes IA - Centraliza todas configurações de comportamento */}
              <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Bot className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Agentes IA
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Comportamento, timing, prompts e modelo de IA
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                            Multi-Agente
                          </span>
                          <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded">
                            Timing
                          </span>
                        </div>
                      </div>
                    </div>
                    <Link href="/dashboard/agents">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-purple-500 hover:text-purple-600 hover:bg-purple-500/10"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* ── SUPORTE ── */}
        {activeTab === "suporte" && (
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-poppins text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Modo Suporte/Bugs
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Quando ativo, o sistema passa a registrar sinais de suporte para
                triagem e melhoria contínua.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Status atual:{" "}
                  <span className="font-semibold text-foreground">
                    {supportModeEnabled ? "Ativo" : "Inativo"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Casos detectados ficam na aba dedicada de Suporte/Bugs.
                </p>
              </div>
              <Button
                onClick={handleToggleSupportMode}
                disabled={loadingSupportMode}
                variant={supportModeEnabled ? "destructive" : "default"}
              >
                {loadingSupportMode
                  ? "Salvando..."
                  : supportModeEnabled
                  ? "Desativar"
                  : "Ativar"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── PREFERÊNCIAS ── */}
        {activeTab === "preferencias" && (
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-xl font-poppins text-foreground flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Preferências
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Personalize a aparência e idioma do dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-sm font-medium mb-2">Tema</p>
                <div className="flex gap-2">
                  <Link href="/dashboard/settings/notifications">
                    <Button variant="outline" size="sm">
                      Claro
                    </Button>
                  </Link>
                  <Link href="/dashboard/settings/notifications">
                    <Button variant="outline" size="sm">
                      Escuro
                    </Button>
                  </Link>
                  <Link href="/dashboard/settings/notifications">
                    <Button variant="outline" size="sm">
                      Sistema
                    </Button>
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  O tema é controlado pelo seletor no topo do dashboard.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Idioma</p>
                <p className="text-sm text-muted-foreground">
                  Português (Brasil) — único idioma disponível no momento.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── AVANÇADO ── */}
        {activeTab === "avancado" && (
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                As configurações avançadas de credenciais ficam na aba{" "}
                <strong>WhatsApp</strong>.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Revalidação de Senha */}
      {showRevalidationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader>
              <CardTitle>Confirme sua Senha</CardTitle>
              <CardDescription>
                Por segurança, confirme sua senha antes de editar as variáveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="revalidation_password">Senha</Label>
                <Input
                  id="revalidation_password"
                  type="password"
                  value={revalidationPassword}
                  onChange={(e) => setRevalidationPassword(e.target.value)}
                  disabled={revalidating}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleRevalidatePassword()
                  }
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRevalidatePassword}
                  disabled={revalidating || !revalidationPassword}
                  className="flex-1"
                >
                  {revalidating ? "Validando..." : "Confirmar"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRevalidationModal(false);
                    setRevalidationPassword("");
                  }}
                  disabled={revalidating}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
