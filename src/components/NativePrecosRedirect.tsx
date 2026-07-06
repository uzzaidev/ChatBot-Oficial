"use client";

import type { ReactNode } from "react";
import { NativeCompanionGate } from "@/components/NativeCompanionGate";
import { isNativeCompanionApp } from "@/lib/nativeAppCompliance";

type NativePrecosGateProps = {
  children: ReactNode;
};

/**
 * Renders pricing content on web only; blocks the page in the native companion app.
 */
export const NativePrecosGate = ({ children }: NativePrecosGateProps) => {
  if (isNativeCompanionApp()) {
    return <NativeCompanionGate variant="pricing" />;
  }

  return <>{children}</>;
};
