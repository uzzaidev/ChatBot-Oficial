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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Eye,
  LayoutDashboard,
  LineChart,
  Loader2,
  MousePointerClick,
  RefreshCcw,
  RefreshCw,
  Settings,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface MetaConfig {
  meta_ad_account_id: string | null;
  meta_dataset_id: string | null;
  whatsapp_business_account_id: string | null;
  meta_access_token_configured: boolean;
}

interface CampaignInsight {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpm: number;
  cpc: number;
  leads: number;
  conversions: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roi: number;
  leadToConversionRate: number;
}

interface InsightsSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalLeads: number;
  totalConversions: number;
  totalRevenue: number;
  averageCPL: number;
  averageCPA: number;
  overallROI: number;
  overallCTR: number;
}

interface ConversionEvent {
  id: string;
  event_name: string;
  event_time: string;
  status: "sent" | "error" | "pending";
  card_id: string;
  phone_number: string;
  event_value: number | null;
  error_message: string | null;
  meta_response: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function MetaAdsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "campaigns" | "events" | "config"
  >("overview");

  // Config state
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  // Insights state
  const [insights, setInsights] = useState<CampaignInsight[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Events state
  const [events, setEvents] = useState<ConversionEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Date range
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const res = await fetch("/api/client/meta-config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    } finally {
      setConfigLoading(false);
      setIsLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    try {
      setInsightsLoading(true);
      setInsightsError(null);

      const res = await fetch(
        `/api/crm/meta-insights?date_from=${dateFrom}&date_to=${dateTo}`,
      );
      const data = await res.json();

      if (data.error && !data.insights) {
        setInsightsError(data.message || data.error);
        setInsights([]);
        setSummary(null);
      } else {
        setInsights(data.insights || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      setInsightsError("Erro ao carregar insights");
    } finally {
      setInsightsLoading(false);
    }
  }, [dateFrom, dateTo]);

  const fetchEvents = useCallback(async () => {
    try {
      setEventsLoading(true);
      const res = await fetch("/api/crm/conversion-events?limit=50");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config && !configLoading) {
      fetchInsights();
      fetchEvents();
    }
  }, [config, configLoading, fetchInsights, fetchEvents]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const isConfigured =
    config?.meta_ad_account_id && config?.meta_access_token_configured;

  const renderConfigStatus = () => {
    const items = [
      {
        label: "Access Token",
        configured: config?.meta_access_token_configured,
      },
      {
        label: "Ad Account ID",
        configured: !!config?.meta_ad_account_id,
        value: config?.meta_ad_account_id,
      },
      {
        label: "Dataset ID (CAPI)",
        configured: !!config?.meta_dataset_id,
        value: config?.meta_dataset_id,
      },
      {
        label: "WABA ID",
        configured: !!config?.whatsapp_business_account_id,
        value: config?.whatsapp_business_account_id,
      },
    ];

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {item.configured ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.value && (
              <code className="text-xs bg-background px-2 py-1 rounded">
                {item.value.slice(0, 20)}
                {item.value.length > 20 ? "..." : ""}
              </code>
            )}
            {!item.configured && (
              <Badge variant="outline" className="text-muted-foreground">
                Não configurado
              </Badge>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Meta Ads
          </h1>
          <p className="text-muted-foreground">
            Performance de campanhas e conversões
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchInsights();
              fetchEvents();
            }}
            disabled={insightsLoading || eventsLoading}
          >
            {insightsLoading || eventsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/settings")}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {!isConfigured && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Configuração incompleta</p>
                <p className="text-sm text-muted-foreground">
                  Configure o Ad Account ID e o Access Token nas configurações
                  para ver métricas das campanhas.
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-yellow-600"
                  onClick={() => setActiveTab("config")}
                >
                  Ver status da configuração →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as "overview" | "campaigns" | "events" | "config")
        }
      >
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <LineChart className="h-4 w-4" />
            Campanhas
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Eventos CAPI
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* OVERVIEW TAB */}
        {/* ================================================================ */}
        <TabsContent value="overview" className="space-y-6">
          {/* Date Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-end gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button onClick={fetchInsights} disabled={insightsLoading}>
                  {insightsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Aplicar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {insightsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : insightsError ? (
            <Card className="border-destructive/50">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="font-medium">{insightsError}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique as configurações do Meta Ads
                </p>
              </CardContent>
            </Card>
          ) : summary ? (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="Gasto Total"
                  value={formatCurrency(summary.totalSpend)}
                  icon={DollarSign}
                  description="Investimento no período"
                />
                <MetricCard
                  title="Total de Leads"
                  value={formatNumber(summary.totalLeads)}
                  icon={Users}
                  description={`CPL: ${formatCurrency(summary.averageCPL)}`}
                  trend={
                    summary.averageCPL < 50
                      ? { value: "Bom", positive: true }
                      : undefined
                  }
                />
                <MetricCard
                  title="Conversões"
                  value={formatNumber(summary.totalConversions)}
                  icon={Target}
                  description={`CPA: ${formatCurrency(summary.averageCPA)}`}
                />
                <MetricCard
                  title="ROI"
                  value={formatPercent(summary.overallROI)}
                  icon={TrendingUp}
                  description={`Receita: ${formatCurrency(
                    summary.totalRevenue,
                  )}`}
                  trend={{
                    value: summary.overallROI >= 0 ? "Positivo" : "Negativo",
                    positive: summary.overallROI >= 0,
                  }}
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  title="Impressões"
                  value={formatNumber(summary.totalImpressions)}
                  icon={Eye}
                  description="Exibições dos anúncios"
                  small
                />
                <MetricCard
                  title="Cliques"
                  value={formatNumber(summary.totalClicks)}
                  icon={MousePointerClick}
                  description={`CTR: ${formatPercent(summary.overallCTR)}`}
                  small
                />
                <MetricCard
                  title="Receita Total"
                  value={formatCurrency(summary.totalRevenue)}
                  icon={DollarSign}
                  description="Valor dos cards fechados"
                  small
                />
              </div>

              {/* Quick Campaign Table */}
              {insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Top Campanhas por ROI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campanha</TableHead>
                          <TableHead className="text-right">Gasto</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                          <TableHead className="text-right">CPL</TableHead>
                          <TableHead className="text-right">ROI</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...insights]
                          .sort((a, b) => b.roi - a.roi)
                          .slice(0, 5)
                          .map((campaign) => (
                            <TableRow key={campaign.campaign_id}>
                              <TableCell className="font-medium">
                                {campaign.campaign_name}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(campaign.spend)}
                              </TableCell>
                              <TableCell className="text-right">
                                {campaign.leads}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(campaign.cpl)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    campaign.roi >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {formatPercent(campaign.roi)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium">Nenhum dado disponível</p>
                <p className="text-sm text-muted-foreground">
                  Configure o Meta Ads ou aguarde leads de campanhas
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ================================================================ */}
        {/* CAMPAIGNS TAB */}
        {/* ================================================================ */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Campanhas</CardTitle>
              <CardDescription>
                Métricas detalhadas por campanha no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : insights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma campanha encontrada no período
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead className="text-right">Gasto</TableHead>
                        <TableHead className="text-right">Impressões</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right">Leads</TableHead>
                        <TableHead className="text-right">CPL</TableHead>
                        <TableHead className="text-right">Conversões</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {insights.map((campaign) => (
                        <TableRow key={campaign.campaign_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {campaign.campaign_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {campaign.campaign_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(campaign.spend)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.impressions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.impressions > 0
                              ? formatPercent(
                                  (campaign.clicks / campaign.impressions) *
                                    100,
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(campaign.cpc)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{campaign.leads}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(campaign.cpl)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                campaign.conversions > 0
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {campaign.conversions}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(campaign.revenue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                campaign.roi >= 0
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {formatPercent(campaign.roi)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* EVENTS TAB */}
        {/* ================================================================ */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos de Conversão (CAPI)</CardTitle>
              <CardDescription>
                Histórico de eventos enviados para o Meta Conversions API
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    Nenhum evento enviado ainda
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Eventos são enviados automaticamente quando cards são
                    movidos no CRM
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="text-sm">
                            {new Date(event.created_at).toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{event.event_name}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {event.phone_number
                              ? `***${event.phone_number.slice(-4)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {event.event_value
                              ? formatCurrency(event.event_value)
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={event.status} />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {event.error_message || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================ */}
        {/* CONFIG TAB */}
        {/* ================================================================ */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status da Integração</CardTitle>
              <CardDescription>
                Verifique se todas as configurações estão corretas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                renderConfigStatus()
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como Configurar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. Access Token</h4>
                <p className="text-sm text-muted-foreground">
                  Vá em{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => router.push("/dashboard/settings")}
                  >
                    Configurações
                  </Button>{" "}
                  e configure o Meta Access Token (mesmo usado para WhatsApp)
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">2. Ad Account ID</h4>
                <p className="text-sm text-muted-foreground">
                  Encontre em{" "}
                  <a
                    href="https://business.facebook.com/settings/ad-accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Meta Business Settings → Ad Accounts
                  </a>
                  . O ID aparece na URL (ex: act_123456789)
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Dataset ID (para CAPI)</h4>
                <p className="text-sm text-muted-foreground">
                  Crie um dataset em{" "}
                  <a
                    href="https://business.facebook.com/events_manager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Events Manager
                  </a>{" "}
                  → Connect Data Sources → Business Messaging
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">4. Permissões Necessárias</h4>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>
                    <code className="text-xs bg-muted px-1 rounded">
                      ads_read
                    </code>{" "}
                    - Para ler métricas de campanhas
                  </li>
                  <li>
                    <code className="text-xs bg-muted px-1 rounded">
                      whatsapp_business_manage_events
                    </code>{" "}
                    - Para enviar eventos CAPI
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Sub Components
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  small?: boolean;
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  small,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className={small ? "p-4" : "p-6"}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={small ? "text-xl font-bold" : "text-2xl font-bold"}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div
              className={`rounded-full ${small ? "p-2" : "p-3"} bg-primary/10`}
            >
              <Icon
                className={`${small ? "h-4 w-4" : "h-5 w-5"} text-primary`}
              />
            </div>
            {trend && (
              <div
                className={`flex items-center text-xs ${
                  trend.positive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.positive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trend.value}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Enviado
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
          <XCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Pendente
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
