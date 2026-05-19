"use client";

import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  LineChart,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { TracesClient } from "@/components/TracesClient";
import { AssistantFeedbackDashboard } from "@/components/assistant/AssistantFeedbackDashboard";
import { EvaluationsWorkspace } from "@/components/quality/EvaluationsWorkspace";
import { GroundTruthManager } from "@/components/quality/GroundTruthManager";
import { QualityDashboard } from "@/components/quality/QualityDashboard";
import { SupportBugsDashboard } from "@/components/support/SupportBugsDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_VALUES = [
  "overview",
  "traces",
  "evaluations",
  "ground-truth",
  "support",
  "agente-ia",
] as const;

type TabValue = (typeof TAB_VALUES)[number];

const DEFAULT_TAB: TabValue = "overview";

const isTabValue = (value: string | null): value is TabValue =>
  value !== null && (TAB_VALUES as readonly string[]).includes(value);

const ObservabilityShell = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab: TabValue = isTabValue(requestedTab)
    ? requestedTab
    : DEFAULT_TAB;

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const query = params.toString();
    router.replace(`/dashboard/observability${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Observabilidade
        </h1>
        <p className="text-sm text-muted-foreground">
          Traces, qualidade, ground truth, revisões e suporte em um só lugar.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col gap-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-2">
            <LineChart className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="traces" className="gap-2">
            <Activity className="h-4 w-4" />
            Traces
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Revisões
          </TabsTrigger>
          <TabsTrigger value="ground-truth" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Ground Truth
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Suporte / Bugs
          </TabsTrigger>
          <TabsTrigger value="agente-ia" className="gap-2">
            <Bot className="h-4 w-4" />
            Agente IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <QualityDashboard />
        </TabsContent>

        <TabsContent value="traces" className="mt-0">
          <TracesClient />
        </TabsContent>

        <TabsContent value="evaluations" className="mt-0">
          <EvaluationsWorkspace />
        </TabsContent>

        <TabsContent value="ground-truth" className="mt-0">
          <GroundTruthManager />
        </TabsContent>

        <TabsContent value="support" className="mt-0">
          <SupportBugsDashboard />
        </TabsContent>

        <TabsContent value="agente-ia" className="mt-0">
          <div className="flex flex-col gap-2">
            <div>
              <h2 className="text-base font-semibold">
                Feedbacks do Assistente IA
              </h2>
              <p className="text-xs text-muted-foreground">
                Avaliações feitas pelos usuários nas respostas do assistente —
                likes, dislikes e bugs reportados.
              </p>
            </div>
            <AssistantFeedbackDashboard />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default function ObservabilityPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      }
    >
      <ObservabilityShell />
    </Suspense>
  );
}
