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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  ArrowDown,
  BarChart3,
  Megaphone,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface AnalyticsData {
  period: string;
  summary: {
    totalCards: number;
    totalLeads: number;
    conversionRate: number;
    totalActivities: number;
    totalAutomations: number;
  };
  funnel: Array<{
    id: string;
    name: string;
    position: number;
    count: number;
  }>;
  leadSources: {
    byType: Array<{
      type: string;
      count: number;
      percentage: string;
    }>;
    topCampaigns: Array<{
      name: string;
      count: number;
    }>;
  };
  cardsByStatus: {
    awaiting_attendant: number;
    awaiting_client: number;
    neutral: number;
  };
  activities: {
    byType: Record<string, number>;
    byDay: Array<{
      date: string;
      count: number;
    }>;
  };
  growth: Array<{
    date: string;
    count: number;
  }>;
  automations: {
    total: number;
    byStatus: {
      success: number;
      failed: number;
      pending: number;
    };
  };
}

interface CRMAnalyticsDashboardProps {
  clientId: string;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  organic: "Orgânico",
  direct: "Contato Direto",
  referral: "Indicação",
  unknown: "Não Identificado",
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_attendant: "Aguardando Atendente",
  awaiting_client: "Aguardando Cliente",
  neutral: "Neutro",
  in_progress: "Em Andamento",
  resolved: "Resolvido",
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_attendant: "bg-yellow-500",
  awaiting_client: "bg-blue-500",
  neutral: "bg-gray-500",
  in_progress: "bg-green-500",
  resolved: "bg-emerald-600",
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  column_move: "Moveu Coluna",
  tag_added: "Tag Adicionada",
  tag_removed: "Tag Removida",
  note_added: "Nota Adicionada",
  status_change: "Status Alterado",
  message_received: "Mensagem Recebida",
  message_sent: "Mensagem Enviada",
  system: "Sistema",
  ad_referral: "Lead de Anúncio",
};

export const CRMAnalyticsDashboard = ({
  clientId,
}: CRMAnalyticsDashboardProps) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/crm/analytics?clientId=${clientId}&period=${period}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Carregando analytics...
        </span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Não foi possível carregar os dados de analytics.
      </div>
    );
  }

  const maxFunnelCount = Math.max(...analytics.funnel.map((f) => f.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics do CRM</h2>
          <p className="text-muted-foreground">
            Métricas e desempenho do seu pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.totalCards}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Leads de Anúncios
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.totalLeads}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conversão
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.conversionRate}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Atividades (7d)
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.totalActivities}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automações</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.summary.totalAutomations}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="growth">Crescimento</TabsTrigger>
        </TabsList>

        {/* Funil de Conversão */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Funil de Conversão
              </CardTitle>
              <CardDescription>
                Distribuição de cards por etapa do pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.funnel.map((stage, index) => {
                  const percentage = (stage.count / maxFunnelCount) * 100;
                  const nextStage = analytics.funnel[index + 1];
                  const dropRate =
                    nextStage && stage.count > 0
                      ? (
                          ((stage.count - nextStage.count) / stage.count) *
                          100
                        ).toFixed(0)
                      : null;

                  return (
                    <div key={stage.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {stage.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {stage.count} cards
                        </span>
                      </div>
                      <div className="relative h-8 w-full overflow-hidden rounded-md bg-secondary">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-foreground mix-blend-difference">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {dropRate && (
                        <div className="mt-1 flex items-center justify-center text-xs text-muted-foreground">
                          <ArrowDown className="h-3 w-3 mr-1" />
                          {dropRate}% saem nesta etapa
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cards por Status */}
          <Card>
            <CardHeader>
              <CardTitle>Cards por Status</CardTitle>
              <CardDescription>
                Distribuição atual dos cards por status automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {Object.entries(analytics.cardsByStatus).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex-1 rounded-lg border p-4 text-center"
                    >
                      <div
                        className={`mx-auto mb-2 h-3 w-3 rounded-full ${STATUS_COLORS[status]}`}
                      />
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground">
                        {STATUS_LABELS[status]}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Origens dos Leads */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Origem dos Leads
                </CardTitle>
                <CardDescription>
                  De onde seus leads estão vindo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.leadSources.byType.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum lead rastreado ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.leadSources.byType.map((source) => (
                      <div
                        key={source.type}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {SOURCE_TYPE_LABELS[source.type] || source.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {source.count}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({source.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Campanhas
                </CardTitle>
                <CardDescription>
                  Campanhas com mais leads convertidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.leadSources.topCampaigns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma campanha rastreada ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.leadSources.topCampaigns.map(
                      (campaign, index) => (
                        <div
                          key={campaign.name}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="text-sm truncate max-w-[200px]">
                              {campaign.name}
                            </span>
                          </div>
                          <Badge>{campaign.count}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Atividade */}
        <TabsContent value="activity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Atividades por Tipo
                </CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.activities.byType).length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma atividade registrada
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(analytics.activities.byType).map(
                      ([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm">
                            {ACTIVITY_TYPE_LABELS[type] || type}
                          </span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Atividades por Dia</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-1 h-32">
                  {analytics.activities.byDay.map((day) => {
                    const maxActivity = Math.max(
                      ...analytics.activities.byDay.map((d) => d.count),
                      1,
                    );
                    const height = (day.count / maxActivity) * 100;
                    const dayName = new Date(day.date).toLocaleDateString(
                      "pt-BR",
                      { weekday: "short" },
                    );

                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{ height: `${Math.max(height, 4)}%` }}
                          title={`${day.count} atividades`}
                        />
                        <span className="text-xs text-muted-foreground mt-1">
                          {dayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automações Executadas
              </CardTitle>
              <CardDescription>
                Regras de automação que foram acionadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1 rounded-lg border border-green-500/20 bg-green-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.automations.byStatus.success}
                  </div>
                  <div className="text-xs text-muted-foreground">Sucesso</div>
                </div>
                <div className="flex-1 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analytics.automations.byStatus.failed}
                  </div>
                  <div className="text-xs text-muted-foreground">Falhou</div>
                </div>
                <div className="flex-1 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analytics.automations.byStatus.pending}
                  </div>
                  <div className="text-xs text-muted-foreground">Pendente</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Crescimento */}
        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Crescimento de Leads
              </CardTitle>
              <CardDescription>
                Novos cards criados por dia (últimos 30 dias)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-0.5 h-40">
                {analytics.growth.map((day) => {
                  const maxGrowth = Math.max(
                    ...analytics.growth.map((d) => d.count),
                    1,
                  );
                  const height = (day.count / maxGrowth) * 100;

                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center group"
                    >
                      <div
                        className="w-full bg-primary/60 hover:bg-primary rounded-t transition-all cursor-pointer"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${day.date}: ${day.count} cards`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>
                  {new Date(analytics.growth[0]?.date).toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "short" },
                  )}
                </span>
                <span>
                  {new Date(
                    analytics.growth[analytics.growth.length - 1]?.date,
                  ).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMAnalyticsDashboard;
