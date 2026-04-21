"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function QualityAlertBadge({ pendingCount }: { pendingCount: number }) {
  if (!pendingCount || pendingCount <= 0) return null;

  return (
    <Link href="/dashboard/quality/evaluations" className="inline-flex">
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">
        Revisões pendentes: {pendingCount}
      </Badge>
    </Link>
  );
}
