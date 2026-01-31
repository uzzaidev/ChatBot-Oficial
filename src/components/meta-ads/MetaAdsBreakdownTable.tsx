"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { ChevronDown, ChevronRight, Image } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface BreakdownItem {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  thumbnail_url?: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  cpm: number;
  cpc: number;
  ctr: number;
  leads: number;
  conversions: number;
  revenue: number;
  cpl: number;
  cpa: number;
  roi: number;
}

interface MetaAdsBreakdownTableProps {
  dateFrom: string;
  dateTo: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function MetaAdsBreakdownTable({
  dateFrom,
  dateTo,
}: MetaAdsBreakdownTableProps) {
  const [data, setData] = useState<BreakdownItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<"campaign" | "adset" | "ad">("adset");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  const fetchBreakdown = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/crm/meta-insights/breakdown?date_from=${dateFrom}&date_to=${dateTo}&level=${level}`,
      );
      const json = await res.json();
      setData(json.breakdown || []);
    } catch (error) {
      console.error("Error fetching breakdown:", error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, level]);

  useEffect(() => {
    fetchBreakdown();
  }, [fetchBreakdown]);

  // Group by campaign for hierarchical view
  const groupedData = data.reduce(
    (acc, item) => {
      const campaignId = item.campaign_id;
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaign_id: campaignId,
          campaign_name: item.campaign_name,
          items: [],
          totals: {
            spend: 0,
            impressions: 0,
            clicks: 0,
            leads: 0,
            conversions: 0,
            revenue: 0,
          },
        };
      }
      acc[campaignId].items.push(item);
      acc[campaignId].totals.spend += item.spend;
      acc[campaignId].totals.impressions += item.impressions;
      acc[campaignId].totals.clicks += item.clicks;
      acc[campaignId].totals.leads += item.leads;
      acc[campaignId].totals.conversions += item.conversions;
      acc[campaignId].totals.revenue += item.revenue;
      return acc;
    },
    {} as Record<
      string,
      {
        campaign_id: string;
        campaign_name: string;
        items: BreakdownItem[];
        totals: {
          spend: number;
          impressions: number;
          clicks: number;
          leads: number;
          conversions: number;
          revenue: number;
        };
      }
    >,
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Level Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Nível:</span>
        <Select
          value={level}
          onValueChange={(v) => setLevel(v as "campaign" | "adset" | "ad")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="campaign">Campanha</SelectItem>
            <SelectItem value="adset">Conjunto de Anúncios</SelectItem>
            <SelectItem value="ad">Anúncio</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchBreakdown}>
          Atualizar
        </Button>
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum dado disponível. Configure o Meta Ads para ver métricas.
          </CardContent>
        </Card>
      ) : level === "campaign" ? (
        // Simple table for campaign level
        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">CPL</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.campaign_id}>
                    <TableCell className="font-medium">
                      {item.campaign_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.spend)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.clicks)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.leads}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.cpl)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          item.roi >= 0
                            ? "text-green-600 font-medium"
                            : "text-red-600 font-medium"
                        }
                      >
                        {formatPercent(item.roi)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      ) : (
        // Hierarchical view for adset/ad level
        <Card>
          <ScrollArea className="h-[500px]">
            <div className="p-4 space-y-2">
              {Object.values(groupedData).map((group) => (
                <div key={group.campaign_id} className="border rounded-lg">
                  {/* Campaign Header (expandable) */}
                  <button
                    onClick={() =>
                      setExpandedCampaign(
                        expandedCampaign === group.campaign_id
                          ? null
                          : group.campaign_id,
                      )
                    }
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedCampaign === group.campaign_id ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium">{group.campaign_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {group.items.length}{" "}
                        {level === "adset" ? "conjuntos" : "anúncios"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>
                        <span className="text-muted-foreground">Gasto:</span>{" "}
                        {formatCurrency(group.totals.spend)}
                      </span>
                      <span>
                        <span className="text-muted-foreground">Leads:</span>{" "}
                        {group.totals.leads}
                      </span>
                      <span>
                        <span className="text-muted-foreground">ROI:</span>{" "}
                        <span
                          className={
                            group.totals.revenue - group.totals.spend >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {group.totals.spend > 0
                            ? formatPercent(
                                ((group.totals.revenue - group.totals.spend) /
                                  group.totals.spend) *
                                  100,
                              )
                            : "N/A"}
                        </span>
                      </span>
                    </div>
                  </button>

                  {/* Expanded Items */}
                  {expandedCampaign === group.campaign_id && (
                    <div className="border-t">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              {level === "adset" ? "Conjunto" : "Anúncio"}
                            </TableHead>
                            <TableHead className="text-right">Gasto</TableHead>
                            <TableHead className="text-right">
                              Impressões
                            </TableHead>
                            <TableHead className="text-right">CTR</TableHead>
                            <TableHead className="text-right">Leads</TableHead>
                            <TableHead className="text-right">CPL</TableHead>
                            <TableHead className="text-right">ROI</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {level === "ad" && item.thumbnail_url ? (
                                    <img
                                      src={item.thumbnail_url}
                                      alt=""
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                  ) : level === "ad" ? (
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                      <Image className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  ) : null}
                                  <span className="text-sm">
                                    {level === "adset"
                                      ? item.adset_name
                                      : item.ad_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.spend)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(item.impressions)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercent(item.ctr)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{item.leads}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.cpl)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    item.roi >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {formatPercent(item.roi)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
