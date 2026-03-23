"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnalyticsShellProps {
  title: ReactNode;
  description?: ReactNode;
  kicker?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  controlsClassName?: string;
  bodyClassName?: string;
  plotClassName?: string;
  variant?: "default" | "hero";
}

export function AnalyticsShell({
  title,
  description,
  kicker,
  meta,
  actions,
  controls,
  children,
  className,
  headerClassName,
  controlsClassName,
  bodyClassName,
  plotClassName,
  variant = "default",
}: AnalyticsShellProps) {
  return (
    <section
      className={cn(
        "analytics-shell",
        variant === "hero" && "analytics-shell-hero",
        className,
      )}
    >
      <div className={cn("analytics-shell-header", headerClassName)}>
        <div className="min-w-0 space-y-2">
          {kicker ? <div className="analytics-shell-kicker">{kicker}</div> : null}
          <div className="space-y-1">
            <h3 className="analytics-shell-title">{title}</h3>
            {description ? (
              <div className="analytics-shell-description">{description}</div>
            ) : null}
          </div>
          {meta ? <div className="analytics-shell-meta">{meta}</div> : null}
        </div>
        {actions ? <div className="analytics-shell-actions">{actions}</div> : null}
      </div>

      {controls ? (
        <div className={cn("analytics-shell-controls", controlsClassName)}>
          {controls}
        </div>
      ) : null}

      <div className={cn("analytics-shell-body", bodyClassName)}>
        <div className={cn("analytics-shell-plot", plotClassName)}>{children}</div>
      </div>
    </section>
  );
}
