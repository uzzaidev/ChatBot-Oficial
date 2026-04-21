"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type EvaluationVerdict = "PASS" | "REVIEW" | "FAIL";

const verdictClass: Record<EvaluationVerdict, string> = {
  PASS: "bg-green-100 text-green-700 border-green-300",
  REVIEW: "bg-amber-100 text-amber-700 border-amber-300",
  FAIL: "bg-red-100 text-red-700 border-red-300",
};

export function ScoreBadge({
  score,
  verdict,
}: {
  score: number;
  verdict?: EvaluationVerdict;
}) {
  const normalizedVerdict: EvaluationVerdict =
    verdict ?? (score >= 7 ? "PASS" : score >= 4 ? "REVIEW" : "FAIL");

  return (
    <Badge className={cn("font-semibold", verdictClass[normalizedVerdict])}>
      {normalizedVerdict} · {score.toFixed(2)}
    </Badge>
  );
}
