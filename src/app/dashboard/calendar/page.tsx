"use client";

/**
 * Calendar Integration Page
 *
 * /dashboard/calendar
 *
 * Client Component (Mobile Compatible)
 * Connects Google Calendar or Microsoft Outlook via OAuth.
 * Shows calendar grid with events inside each day.
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
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Unlink,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

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

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

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
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

        if (response.ok && data) {
          setStatus({
            google: {
              enabled: data.google_calendar_enabled || false,
              userEmail: data.google_calendar_user_email || undefined,
            },
            microsoft: {
              enabled: data.microsoft_calendar_enabled || false,
              userEmail: data.microsoft_calendar_user_email || undefined,
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

  const fetchEvents = useCallback(async () => {
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
  }, []);

  // Fetch events when a calendar is connected
  useEffect(() => {
    const isConnected = status.google.enabled || status.microsoft.enabled;
    if (!isConnected || loading) return;
    fetchEvents();
  }, [status.google.enabled, status.microsoft.enabled, loading, fetchEvents]);

  const handleSync = async () => {
    setSyncing(true);
    await fetchEvents();
    setSyncing(false);
    setNotification({
      type: "success",
      message: "Eventos sincronizados!",
    });
  };

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

  // Group events by date string (YYYY-MM-DD in São Paulo timezone)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const dateKey = new Date(event.startDateTime).toLocaleDateString(
        "en-CA",
        { timeZone: "America/Sao_Paulo" },
      );
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(event);
    }
    // Sort events within each day by start time
    for (const key of Object.keys(map)) {
      map[key].sort(
        (a, b) =>
          new Date(a.startDateTime).getTime() -
          new Date(b.startDateTime).getTime(),
      );
    }
    return map;
  }, [events]);

  // Build calendar grid for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: Array<{
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
    }> = [];

    // Pad start
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        dateKey: d.toLocaleDateString("en-CA"),
        isCurrentMonth: false,
      });
    }
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: d,
        dateKey: d.toLocaleDateString("en-CA"),
        isCurrentMonth: true,
      });
    }
    // Pad end to fill 6 rows
    const remainder = days.length % 7;
    if (remainder > 0) {
      const padEnd = 7 - remainder;
      for (let i = 1; i <= padEnd; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: d,
          dateKey: d.toLocaleDateString("en-CA"),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [currentMonth]);

  const todayKey = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatFullDate = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const selectedDayEvents = selectedDate
    ? eventsByDate[selectedDate] || []
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConnected = status.google.enabled || status.microsoft.enabled;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Integração de Calendário
          </h1>
          <p className="text-muted-foreground">
            Conecte seu Google Calendar ou Microsoft Outlook para que o agente
            IA possa consultar e gerenciar sua agenda pelo WhatsApp.
          </p>
        </div>
        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loadingEvents}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", syncing && "animate-spin")}
            />
            Sincronizar
          </Button>
        )}
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

      {/* Calendar Grid */}
      {isConnected && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {MONTH_NAMES[currentMonth.getMonth()]}{" "}
                {currentMonth.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentMonth(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    setCurrentMonth(
                      new Date(now.getFullYear(), now.getMonth(), 1),
                    );
                    setSelectedDate(todayKey);
                  }}
                >
                  Hoje
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setCurrentMonth(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {/* Weekday headers */}
                {WEEKDAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="bg-muted px-1 py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}

                {/* Day cells */}
                {calendarDays.map(({ date, dateKey, isCurrentMonth }) => {
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDate;

                  return (
                    <div
                      key={dateKey}
                      className={cn(
                        "bg-background min-h-[90px] md:min-h-[110px] p-1 cursor-pointer transition-colors hover:bg-accent/50",
                        !isCurrentMonth && "bg-muted/30",
                        isSelected && "ring-2 ring-primary ring-inset",
                      )}
                      onClick={() =>
                        setSelectedDate(
                          selectedDate === dateKey ? null : dateKey,
                        )
                      }
                    >
                      <div
                        className={cn(
                          "text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                          !isCurrentMonth && "text-muted-foreground/40",
                          isToday &&
                            "bg-primary text-primary-foreground font-bold",
                        )}
                      >
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary truncate"
                            title={`${formatTime(event.startDateTime)} ${
                              event.title
                            }`}
                          >
                            <span className="font-medium">
                              {formatTime(event.startDateTime)}
                            </span>{" "}
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Day Detail */}
      {selectedDate && isConnected && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base capitalize">
              {formatFullDate(selectedDate)}
            </CardTitle>
            <CardDescription>
              {selectedDayEvents.length === 0
                ? "Nenhum evento neste dia"
                : `${selectedDayEvents.length} evento${
                    selectedDayEvents.length > 1 ? "s" : ""
                  }`}
            </CardDescription>
          </CardHeader>
          {selectedDayEvents.length > 0 && (
            <CardContent className="space-y-3">
              {selectedDayEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-1.5 p-3 rounded-lg border bg-muted/50"
                >
                  <p className="font-medium text-sm">{event.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(event.startDateTime)} —{" "}
                    {formatTime(event.endDateTime)}
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {event.attendees.join(", ")}
                    </div>
                  )}
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          )}
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
