"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface LeadAdEvent {
  id: string;
  leadgen_id: string;
  form_id?: string;
  ad_id?: string;
  campaign_id?: string;
  phone?: string;
  email?: string;
  full_name?: string;
  card_id?: string;
  processed: boolean;
  processed_at?: string;
  error_message?: string;
  created_at: string;
}

interface LeadAdsStats {
  total: number;
  processed: number;
  pending: number;
  errors: number;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetaAdsLeadAds() {
  const [events, setEvents] = useState<LeadAdEvent[]>([]);
  const [stats, setStats] = useState<LeadAdsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crm/lead-ads-events?limit=50");
      const data = await res.json();

      setEvents(data.events || []);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching lead ads events:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Leads</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Processados
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.processed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-500" />
                Pendentes
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Erros
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.errors}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lead Ads Recebidos
            </CardTitle>
            <CardDescription>
              Leads capturados através de formulários do Facebook/Instagram
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchEvents}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
        </CardHeader>

        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="font-medium">Nenhum lead recebido</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configure o webhook de Lead Ads para receber leads de
                formulários
              </p>
              <div className="mt-4">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://developers.facebook.com/docs/marketing-api/guides/lead-ads"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Ver documentação
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Form ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Card</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {new Date(event.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {event.full_name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {event.phone && (
                            <div className="font-mono">
                              {event.phone
                                .slice(-4)
                                .padStart(event.phone.length, "*")}
                            </div>
                          )}
                          {event.email && (
                            <div className="text-muted-foreground text-xs">
                              {event.email.replace(/(.{3}).*@/, "$1***@")}
                            </div>
                          )}
                          {!event.phone && !event.email && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.form_id?.slice(-8) || "-"}
                      </TableCell>
                      <TableCell>
                        {event.processed ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Processado
                          </Badge>
                        ) : event.error_message ? (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                            <XCircle className="h-3 w-3 mr-1" />
                            Erro
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.card_id ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            asChild
                          >
                            <a href={`/dashboard/crm?card=${event.card_id}`}>
                              Ver card
                            </a>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Setup Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <h4 className="font-medium mb-2">🔧 Configuração do Lead Ads</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>
              Solicite a permissão{" "}
              <code className="bg-background px-1 rounded">
                leads_retrieval
              </code>{" "}
              no Meta Developer Console
            </li>
            <li>Configure o webhook em Webhooks → Ad Account → leadgen</li>
            <li>
              URL:{" "}
              <code className="bg-background px-1 rounded">
                https://seu-dominio.com/api/webhook/meta-ads
              </code>
            </li>
            <li>
              Leads de formulários serão automaticamente criados como cards no
              CRM
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
