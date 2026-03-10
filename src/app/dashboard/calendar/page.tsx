"use client";

/**
 * Calendar Integration Page
 *
 * /dashboard/calendar
 *
 * Client Component (Mobile Compatible)
 * Connects Google Calendar or Microsoft Outlook via OAuth.
 * Shows connection status and upcoming events (7 days).
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
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Unlink,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

interface CalendarStatus {
  google: { enabled: boolean; userEmail?: string };
  microsoft: { enabled: boolean; userEmail?: string };
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CalendarStatus>({
    google: { enabled: false },
    microsoft: { enabled: false },
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Show success toast from OAuth redirect
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "google") {
      setNotification({
        type: "success",
        message: "Google Calendar conectado com sucesso!",
      });
    } else if (success === "microsoft") {
      setNotification({
        type: "success",
        message: "Microsoft Outlook conectado com sucesso!",
      });
    } else if (error) {
      setNotification({
        type: "error",
        message: `Erro na conexão: ${error}`,
      });
    }
  }, [searchParams]);

  // Fetch calendar status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { apiFetch } = await import("@/lib/api");
        const response = await apiFetch("/api/client/config");
        const data = await response.json();

        if (response.ok && data.config) {
          setStatus({
            google: {
              enabled: data.config.google_calendar_enabled || false,
              userEmail: data.config.google_calendar_user_email || undefined,
            },
            microsoft: {
              enabled: data.config.microsoft_calendar_enabled || false,
              userEmail: data.config.microsoft_calendar_user_email || undefined,
            },
          });
        }
      } catch (error) {
        console.error("Failed to fetch calendar status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // Fetch events when a calendar is connected
  useEffect(() => {
    const isConnected = status.google.enabled || status.microsoft.enabled;
    if (!isConnected || loading) return;

    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const { apiFetch } = await import("@/lib/api");
        const response = await apiFetch("/api/calendar/events");
        const data = await response.json();

        if (response.ok) {
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [status.google.enabled, status.microsoft.enabled, loading]);

  const handleConnect = (provider: "google" | "microsoft") => {
    const url =
      provider === "google"
        ? "/api/auth/google-calendar"
        : "/api/auth/microsoft-calendar";
    window.location.href = url;
  };

  const handleDisconnect = async (provider: "google" | "microsoft") => {
    setDisconnecting(provider);
    try {
      const { apiFetch } = await import("@/lib/api");
      const response = await apiFetch("/api/calendar/disconnect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (response.ok) {
        setStatus((prev) => ({
          ...prev,
          [provider]: { enabled: false, userEmail: undefined },
        }));
        setEvents([]);
        setNotification({
          type: "success",
          message: `${
            provider === "google" ? "Google Calendar" : "Microsoft Outlook"
          } desconectado.`,
        });
      } else {
        setNotification({
          type: "error",
          message: "Erro ao desconectar calendário.",
        });
      }
    } catch (error) {
      setNotification({
        type: "error",
        message: "Erro ao desconectar calendário.",
      });
    } finally {
      setDisconnecting(null);
    }
  };

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Integração de Calendário
        </h1>
        <p className="text-muted-foreground">
          Conecte seu Google Calendar ou Microsoft Outlook para que o agente IA
          possa consultar e gerenciar sua agenda pelo WhatsApp.
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

      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Google Calendar Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Conecte sua conta Google para acesso ao Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.google.enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Conectado</span>
                </div>
                {status.google.userEmail && (
                  <p className="text-sm text-muted-foreground">
                    📧 {status.google.userEmail}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect("google")}
                  disabled={disconnecting === "google"}
                  className="text-red-600 hover:text-red-700"
                >
                  {disconnecting === "google" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleConnect("google")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar com Google
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Microsoft Outlook Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              Microsoft Outlook
            </CardTitle>
            <CardDescription>
              Conecte sua conta Microsoft para acesso ao calendário do Outlook
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status.microsoft.enabled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Conectado</span>
                </div>
                {status.microsoft.userEmail && (
                  <p className="text-sm text-muted-foreground">
                    📧 {status.microsoft.userEmail}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect("microsoft")}
                  disabled={disconnecting === "microsoft"}
                  className="text-red-600 hover:text-red-700"
                >
                  {disconnecting === "microsoft" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleConnect("microsoft")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar com Microsoft
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      {(status.google.enabled || status.microsoft.enabled) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Próximos Eventos (7 dias)
            </CardTitle>
            <CardDescription>
              Eventos dos próximos 7 dias do calendário conectado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhum evento encontrado nos próximos 7 dias.
              </p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/50"
                  >
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      📅 {formatEventTime(event.startDateTime)} —{" "}
                      {formatEventTime(event.endDateTime)}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.attendees.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Conecte seu Google Calendar ou Microsoft Outlook acima.</p>
          <p>
            2. O agente IA ganha acesso para consultar e criar eventos na sua
            agenda.
          </p>
          <p>
            3. Seus clientes podem perguntar pelo WhatsApp: &quot;Quais meus
            compromissos de amanhã?&quot; ou &quot;Marca uma reunião sexta às
            10h&quot;.
          </p>
          <p>
            4. O acesso pode ser revogado a qualquer momento clicando em
            &quot;Desconectar&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
