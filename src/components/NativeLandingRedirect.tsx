"use client";

import { isNativeCompanionApp } from "@/lib/nativeAppCompliance";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * On the native companion app, skip marketing/landing pages and go straight to login.
 */
export const NativeLandingRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    if (isNativeCompanionApp()) {
      router.replace("/login");
    }
  }, [router]);

  return null;
};
