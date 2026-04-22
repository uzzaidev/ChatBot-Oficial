"use client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface TracesMetaResponse {
  meta?: {
    costTodayUsd?: number;
  };
}

export function CostTodayBadge() {
  const [costTodayUsd, setCostTodayUsd] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/traces?limit=1", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as TracesMetaResponse;
        if (!active) return;
        setCostTodayUsd(json.meta?.costTodayUsd ?? 0);
      } catch {
        if (!active) return;
        setCostTodayUsd(null);
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 60_000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Badge variant="outline" className="text-xs">
      Custo hoje: {costTodayUsd == null ? "—" : `$${costTodayUsd.toFixed(4)}`}
    </Badge>
  );
}

