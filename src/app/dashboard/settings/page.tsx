"use client";

/**
 * Settings Page
 *
 * /dashboard/settings
 *
 * Client Component (Mobile Compatible)
 * Motivo: Static Export (Capacitor) não suporta Server Components
 *
 * Implementação completa do Settings com:
 * 1. Perfil do Usuário - visualizar/editar nome, email, telefone, alterar senha
 * 2. Variáveis de Ambiente - gerenciar credenciais do Vault (Meta, OpenAI, Groq)
 * 3. Bot Configurations - gerenciar configurações modulares do bot
 *
 * Baseado na implementação do desenvolvedor sênior
 * IMPORTANTE: Edição de variáveis requer revalidação de senha
 */

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
  BarChart3,
  Bot,
  Check,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Key,
  Lightbulb,
  Lock,
  LockKeyhole,
  Mic,
  Save,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
export default function SettingsPage() {
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Settings className="w-9 h-9 text-primary" />
            <h1 className="text-4xl font-poppins font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent pb-1">
              Configurações
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Gerencie seu perfil, credenciais e variáveis de ambiente
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <Alert
            variant={notification.type === "error" ? "destructive" : "default"}
          >
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* Seção 1: Perfil do Usuário */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-poppins text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Perfil do Usuário
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Visualize e edite suas informações pessoais
            </CardDescription>
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
              <p className="text-xs text-muted-foreground mt-1">
                O email não pode ser alterado
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">
                Telefone do WhatsApp configurado nas variáveis de ambiente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Alterar Senha */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-xl font-poppins text-foreground flex items-center gap-2">
              <LockKeyhole className="w-5 h-5 text-primary" />
              Alterar Senha
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Atualize sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label htmlFor="current_password" className="text-foreground">
                Senha Atual
              </Label>
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
                placeholder="Digite sua senha atual"
              />
            </div>

            <div>
              <Label htmlFor="new_password" className="text-foreground">
                Nova Senha
              </Label>
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
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo 8 caracteres
              </p>
            </div>

            <div>
              <Label htmlFor="confirm_password" className="text-foreground">
                Confirmar Nova Senha
              </Label>
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
                placeholder="Digite novamente"
              />
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={loadingPassword}
              className="w-full bg-gradient-to-r from-uzz-mint to-uzz-blue text-foreground hover:from-uzz-blue hover:to-uzz-mint"
            >
              {loadingPassword ? "Atualizando..." : "Atualizar Senha"}
            </Button>
          </CardContent>
        </Card>

        {/* Seção 3: Banner de Redirecionamento para Agentes IA */}
        <Card className="bg-gradient-to-br from-uzz-purple/10 via-uzz-mint/10 to-uzz-blue/10 border-uzz-mint/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-uzz-mint/5 via-transparent to-transparent" />
          <CardHeader className="border-b border-uzz-mint/20 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-uzz-mint/20">
                  <Sparkles className="w-6 h-6 text-uzz-mint" />
                </div>
                <div>
                  <CardTitle className="text-xl font-poppins text-foreground flex items-center gap-2">
                    Configurações de IA
                    <span className="text-xs bg-uzz-mint/20 text-uzz-mint px-2 py-0.5 rounded-full font-normal">
                      Centralizado
                    </span>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Todas as configurações de IA, prompts, modelos e
                    comportamentos foram centralizados na página de Agentes IA.
                  </CardDescription>
                </div>
              </div>
              <Link href="/dashboard/agents">
                <Button className="gap-2 bg-uzz-mint hover:bg-uzz-mint/90 text-white">
                  Ir para Agentes IA
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6 relative">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-uzz-mint" />O que você encontra
                  lá:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-mint">•</span>
                    System Prompts personalizados
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-mint">•</span>
                    Configuração de modelos (Groq, OpenAI)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-mint">•</span>
                    Temperatura e parâmetros de geração
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-mint">•</span>
                    RAG e Function Calling
                  </li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-uzz-blue" />
                  Timing & Comportamento:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-blue">•</span>
                    Delay de agrupamento de mensagens
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-blue">•</span>
                    Delay entre mensagens divididas
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-blue">•</span>
                    Memória de contexto (histórico)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-uzz-blue">•</span>
                    Divisão automática de mensagens longas
                  </li>
                </ul>
              </div>
            </div>
            <Alert className="mt-4 bg-uzz-mint/10 border-uzz-mint/30">
              <Lightbulb className="h-4 w-4 text-uzz-mint" />
              <AlertDescription className="text-sm">
                <strong className="text-uzz-mint">Dica:</strong> Na página de
                Agentes IA você pode criar múltiplos agentes com diferentes
                configurações e alternar entre eles facilmente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        {/* Seção 4: Variáveis de Ambiente */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-poppins text-foreground flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Variáveis de Ambiente
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Gerencie as credenciais de API do seu cliente
                </CardDescription>
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
            {/* Meta Access Token */}
            <div>
              <Label htmlFor="meta_access_token" className="text-foreground">
                Meta Access Token
              </Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    id="meta_access_token"
                    type={
                      showPasswords["meta_access_token"] ? "text" : "password"
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
                    className="bg-gradient-to-r from-uzz-mint to-uzz-blue text-foreground hover:from-uzz-blue hover:to-uzz-mint"
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            {/* Meta Verify Token */}
            <div>
              <Label htmlFor="meta_verify_token">Meta Verify Token</Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    id="meta_verify_token"
                    type={
                      showPasswords["meta_verify_token"] ? "text" : "password"
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
              <Label htmlFor="meta_app_secret">
                Meta App Secret
                <span className="text-xs text-muted-foreground ml-2">
                  (HMAC validation - diferente do Verify Token)
                </span>
              </Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    id="meta_app_secret"
                    type={
                      showPasswords["meta_app_secret"] ? "text" : "password"
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
                    onClick={() => togglePasswordVisibility("meta_app_secret")}
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

            {/* Meta Phone Number ID */}
            <div>
              <Label htmlFor="meta_phone_number_id">Meta Phone Number ID</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="meta_phone_number_id"
                  value={secrets.meta_phone_number_id}
                  onChange={(e) =>
                    setSecrets({
                      ...secrets,
                      meta_phone_number_id: e.target.value,
                    })
                  }
                  disabled={!editingSecrets}
                />
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret(
                        "meta_phone_number_id",
                        secrets.meta_phone_number_id,
                      )
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            {/* WhatsApp Business Account ID */}
            <div>
              <Label htmlFor="whatsapp_business_account_id">
                WhatsApp Business Account ID (WABA ID)
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="whatsapp_business_account_id"
                  value={secrets.whatsapp_business_account_id}
                  onChange={(e) =>
                    setSecrets({
                      ...secrets,
                      whatsapp_business_account_id: e.target.value,
                    })
                  }
                  disabled={!editingSecrets}
                  placeholder="123456789012345"
                />
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret(
                        "whatsapp_business_account_id",
                        secrets.whatsapp_business_account_id,
                      )
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ID da conta comercial do WhatsApp (usado para criar templates)
              </p>
            </div>

            {/* Meta Ads Section */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Meta Ads Integration
                <span className="text-xs text-muted-foreground">
                  (Conversions API & Marketing API)
                </span>
              </h4>
            </div>

            {/* Meta Dataset ID */}
            <div>
              <Label htmlFor="meta_dataset_id">
                Meta Dataset ID (Conversions API)
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="meta_dataset_id"
                  value={secrets.meta_dataset_id}
                  onChange={(e) =>
                    setSecrets({ ...secrets, meta_dataset_id: e.target.value })
                  }
                  disabled={!editingSecrets}
                  placeholder="1234567890123456"
                />
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret(
                        "meta_dataset_id",
                        secrets.meta_dataset_id,
                      )
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dataset ID criado no Events Manager para enviar eventos de
                conversão
              </p>
            </div>

            {/* Meta Ad Account ID */}
            <div>
              <Label htmlFor="meta_ad_account_id">
                Meta Ad Account ID (Marketing API)
              </Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="meta_ad_account_id"
                  value={secrets.meta_ad_account_id}
                  onChange={(e) =>
                    setSecrets({
                      ...secrets,
                      meta_ad_account_id: e.target.value,
                    })
                  }
                  disabled={!editingSecrets}
                  placeholder="9876543210"
                />
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret(
                        "meta_ad_account_id",
                        secrets.meta_ad_account_id,
                      )
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ID da conta de anúncios (sem o prefixo &quot;act_&quot;) para
                buscar métricas de campanhas
              </p>
            </div>

            {/* Divisor */}
            <div className="border-t my-6"></div>

            {/* Seção de Credenciais de IA */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  Credenciais de IA (Fallback)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure suas chaves de API da OpenAI e Groq. Estas
                  credenciais são usadas como{" "}
                  <strong>fallback automático</strong> caso o AI Gateway falhe
                  ou fique sem créditos.
                </p>
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Como funciona o fallback:</strong> Quando o AI
                    Gateway não está disponível ou apresenta erro, o sistema
                    automaticamente usa as credenciais abaixo (OpenAI como
                    preferência). Isto garante que seu chatbot nunca pare de
                    funcionar.
                  </AlertDescription>
                </Alert>
              </div>

              {/* OpenAI API Key */}
              <div>
                <Label htmlFor="openai_api_key">
                  OpenAI API Key
                  <span className="text-xs text-blue-600 ml-2">
                    (Usado como fallback principal)
                  </span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai_api_key"
                      type={
                        showPasswords["openai_api_key"] ? "text" : "password"
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
                      onClick={() => togglePasswordVisibility("openai_api_key")}
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

              {/* OpenAI Admin API Key */}
              <div>
                <Label htmlFor="openai_admin_key">
                  OpenAI Admin API Key
                  <span className="text-xs text-orange-600 ml-2">
                    (Para analytics/billing - scope: api.usage.read)
                  </span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai_admin_key"
                      type={
                        showPasswords["openai_admin_key"] ? "text" : "password"
                      }
                      value={secrets.openai_admin_key}
                      onChange={(e) =>
                        setSecrets({
                          ...secrets,
                          openai_admin_key: e.target.value,
                        })
                      }
                      disabled={!editingSecrets}
                      placeholder="sk-proj-... (com permissão de usage)"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("openai_admin_key")}
                      className="absolute right-2 top-2"
                    >
                      {showPasswords["openai_admin_key"] ? (
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
                          "openai_admin_key",
                          secrets.openai_admin_key,
                        )
                      }
                      disabled={loadingSecrets}
                    >
                      Salvar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Crie uma key com permissão "api.usage.read" em:{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    platform.openai.com/api-keys
                  </a>
                  {" "}→ Permissions → Enable "api.usage.read"
                </p>
              </div>

              {/* Groq API Key */}
              <div>
                <Label htmlFor="groq_api_key">
                  Groq API Key
                  <span className="text-xs text-muted-foreground ml-2">
                    (Opcional - secundário)
                  </span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="groq_api_key"
                      type={showPasswords["groq_api_key"] ? "text" : "password"}
                      value={secrets.groq_api_key}
                      onChange={(e) =>
                        setSecrets({ ...secrets, groq_api_key: e.target.value })
                      }
                      disabled={!editingSecrets}
                      placeholder="gsk_..."
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility("groq_api_key")}
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
                        handleUpdateSecret("groq_api_key", secrets.groq_api_key)
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

            {/* Webhook URL (readonly) */}
            <div>
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="webhook_url"
                  value={secrets.webhook_url}
                  disabled
                  className="font-mono text-sm"
                />
                <Button
                  onClick={() => handleCopy(secrets.webhook_url, "webhook_url")}
                  variant="outline"
                  size="icon"
                >
                  {copied === "webhook_url" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use esta URL para configurar o webhook na Meta API
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4.5: Links Rápidos para Outras Configurações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
