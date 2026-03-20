"use client";

import { cn } from "@/lib/utils";
import type { CRMTag } from "@/lib/types";

interface CardTagListProps {
  tags: CRMTag[];
  maxVisible?: number;
  size?: "sm" | "md";
}

const TAG_COLORS: Record<
  string,
  { background: string; border: string; color: string }
> = {
  mint: {
    background: "rgba(16, 185, 129, 0.14)",
    border: "rgba(16, 185, 129, 0.22)",
    color: "#6ee7b7",
  },
  blue: {
    background: "rgba(59, 130, 246, 0.14)",
    border: "rgba(59, 130, 246, 0.22)",
    color: "#93c5fd",
  },
  gold: {
    background: "rgba(245, 158, 11, 0.14)",
    border: "rgba(245, 158, 11, 0.22)",
    color: "#fcd34d",
  },
  red: {
    background: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.22)",
    color: "#fca5a5",
  },
  purple: {
    background: "rgba(168, 85, 247, 0.14)",
    border: "rgba(168, 85, 247, 0.22)",
    color: "#d8b4fe",
  },
  green: {
    background: "rgba(34, 197, 94, 0.14)",
    border: "rgba(34, 197, 94, 0.22)",
    color: "#86efac",
  },
  orange: {
    background: "rgba(249, 115, 22, 0.14)",
    border: "rgba(249, 115, 22, 0.22)",
    color: "#fdba74",
  },
  pink: {
    background: "rgba(236, 72, 153, 0.14)",
    border: "rgba(236, 72, 153, 0.22)",
    color: "#f9a8d4",
  },
  cyan: {
    background: "rgba(6, 182, 212, 0.14)",
    border: "rgba(6, 182, 212, 0.22)",
    color: "#67e8f9",
  },
  gray: {
    background: "rgba(107, 114, 128, 0.16)",
    border: "rgba(107, 114, 128, 0.24)",
    color: "#d1d5db",
  },
  default: {
    background: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.18)",
    color: "#cbd5e1",
  },
};

export const CardTagList = ({
  tags,
  maxVisible = 3,
  size = "sm",
}: CardTagListProps) => {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleTags.map((tag) => {
        const style = TAG_COLORS[tag.color] || TAG_COLORS.default;
        return (
          <span
            key={tag.id}
            className={cn(
              "crm-tag-badge inline-flex items-center border font-medium",
              size === "sm" && "min-h-6",
              size === "md" && "min-h-7 px-2.5 text-xs",
            )}
            style={{
              backgroundColor: style.background,
              borderColor: style.border,
              color: style.color,
            }}
          >
            {tag.name}
          </span>
        );
      })}
      {hiddenCount > 0 && (
        <span
          className={cn(
            "crm-tag-badge inline-flex items-center border border-border/70 bg-background/35 text-muted-foreground",
            size === "sm" && "min-h-6",
            size === "md" && "min-h-7 px-2.5 text-xs",
          )}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};
