"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Bell, BellDot, BellOff, Megaphone, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createBrowserClient } from "@/lib/supabase-browser";
import type { NotificationCategory, NotificationPreferences } from "@/lib/types";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  critical: { enabled: true, sound: true, vibration: true },
  important: { enabled: true, sound: true, vibration: true },
  normal: { enabled: true, sound: true, vibration: true },
  low: { enabled: false, sound: false, vibration: false },
  marketing: { enabled: false, sound: false, vibration: false },
};

const DND_DAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const CATEGORIES: Array<{
  key: NotificationCategory;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    key: "critical",
    label: "Urgentes",
    description: "Transferências para atendente e alertas críticos.",
    icon: ShieldAlert,
  },
  {
    key: "important",
    label: "Importantes",
    description: "Novas conversas e alertas de orçamento.",
    icon: BellDot,
  },
  {
    key: "normal",
    label: "Mensagens",
    description: "Mensagens em conversas já existentes.",
    icon: Bell,
  },
  {
    key: "low",
    label: "Atualizações",
    description: "Status e confirmações de baixa prioridade.",
    icon: BellOff,
  },
  {
    key: "marketing",
    label: "Novidades",
    description: "Novas funcionalidades, anúncios e dicas.",
    icon: Megaphone,
  },
];

const isMissingTableError = (error: any) => {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  return code === "42P01" || message.includes("does not exist") || message.includes("relation");
};

export default function NotificationSettingsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndStart, setDndStart] = useState("22:00");
  const [dndEnd, setDndEnd] = useState("07:00");
  const [dndDays, setDndDays] = useState<number[]>([]);

  const categoryCountEnabled = useMemo(() => {
    return CATEGORIES.filter((item) => preferences[item.key].enabled).length;
  }, [preferences]);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserClient() as any;

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente para configurar notificações.",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase
          .from("notification_preferences")
          .select("preferences, dnd_enabled, dnd_start_time, dnd_end_time, dnd_days")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && !isMissingTableError(error)) {
          throw error;
        }

        if (isMissingTableError(error)) {
          toast({
            title: "Migration pendente",
            description:
              "A tabela de notificações ainda não existe. Aplique a migration para habilitar esta tela.",
            variant: "destructive",
          });
          return;
        }

        if (!data) {
          const { data: profile, error: profileError } = await supabase
            .from("user_profiles")
            .select("client_id")
            .eq("id", user.id)
            .single();

          if (profileError || !profile?.client_id) {
            throw profileError || new Error("User profile not found");
          }

          const { data: inserted, error: insertError } = await supabase
            .from("notification_preferences")
            .upsert(
              {
                user_id: user.id,
                client_id: profile.client_id,
              },
              { onConflict: "user_id" },
            )
            .select("preferences, dnd_enabled, dnd_start_time, dnd_end_time, dnd_days")
            .single();

          if (insertError) {
            throw insertError;
          }

          setPreferences({ ...DEFAULT_PREFERENCES, ...(inserted?.preferences || {}) });
          setDndEnabled(Boolean(inserted?.dnd_enabled));
          setDndStart(inserted?.dnd_start_time?.slice(0, 5) || "22:00");
          setDndEnd(inserted?.dnd_end_time?.slice(0, 5) || "07:00");
          setDndDays(Array.isArray(inserted?.dnd_days) ? inserted.dnd_days : []);
          return;
        }

        setPreferences({ ...DEFAULT_PREFERENCES, ...(data.preferences || {}) });
        setDndEnabled(Boolean(data.dnd_enabled));
        setDndStart(data.dnd_start_time?.slice(0, 5) || "22:00");
        setDndEnd(data.dnd_end_time?.slice(0, 5) || "07:00");
        setDndDays(Array.isArray(data.dnd_days) ? data.dnd_days : []);
      } catch (error) {
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar suas preferências de notificação.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const updateCategory = (
    category: NotificationCategory,
    key: "enabled" | "sound" | "vibration",
    value: boolean,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const toggleDay = (day: number) => {
    setDndDays((prev) =>
      prev.includes(day) ? prev.filter((item) => item !== day) : [...prev, day].sort(),
    );
  };

  const savePreferences = async () => {
    const supabase = createBrowserClient() as any;

    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw userError || new Error("User not authenticated");
      }

      const payload = {
        user_id: user.id,
        preferences,
        dnd_enabled: dndEnabled,
        dnd_start_time: dndEnabled ? `${dndStart}:00` : null,
        dnd_end_time: dndEnabled ? `${dndEnd}:00` : null,
        dnd_days: dndDays,
      };

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.client_id) {
        throw profileError || new Error("User profile not found");
      }

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            ...payload,
            client_id: profile.client_id,
          },
          { onConflict: "user_id" },
        );

      if (error) {
        throw error;
      }

      toast({
        title: "Preferências salvas",
        description: "As configurações de notificações foram atualizadas.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as preferências de notificações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando preferências...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Notificações Push</h1>
        <p className="text-sm text-muted-foreground">
          Escolha categorias, som/vibração e janela de Não Perturbe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>
            {categoryCountEnabled} de {CATEGORIES.length} categorias habilitadas.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Controle por categoria com personalização de som e vibração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            const values = preferences[category.key];

            return (
              <div key={category.key} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <h3 className="text-sm font-semibold">{category.label}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <Switch
                    checked={values.enabled}
                    onCheckedChange={(checked) => updateCategory(category.key, "enabled", checked)}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-xs">Som</Label>
                    <Switch
                      checked={values.sound}
                      disabled={!values.enabled}
                      onCheckedChange={(checked) => updateCategory(category.key, "sound", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-xs">Vibração</Label>
                    <Switch
                      checked={values.vibration}
                      disabled={!values.enabled}
                      onCheckedChange={(checked) => updateCategory(category.key, "vibration", checked)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Não Perturbe (DND)</CardTitle>
          <CardDescription>
            Notificações críticas continuam chegando mesmo com DND ligado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="dnd-toggle">Ativar Não Perturbe</Label>
            <Switch id="dnd-toggle" checked={dndEnabled} onCheckedChange={setDndEnabled} />
          </div>

          {dndEnabled && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dnd-start">Início</Label>
                  <input
                    id="dnd-start"
                    type="time"
                    value={dndStart}
                    onChange={(event) => setDndStart(event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dnd-end">Fim</Label>
                  <input
                    id="dnd-end"
                    type="time"
                    value={dndEnd}
                    onChange={(event) => setDndEnd(event.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias da semana (opcional)</Label>
                <p className="text-xs text-muted-foreground">
                  Se nada for selecionado, o DND vale para todos os dias.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DND_DAY_LABELS.map((day) => {
                    const active = dndDays.includes(day.value);
                    return (
                      <Button
                        key={day.value}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving}>
          {saving ? "Salvando..." : "Salvar Preferências"}
        </Button>
      </div>
    </div>
  );
}
