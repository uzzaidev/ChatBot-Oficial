"use client";

/**
 * Haptics - feedback tátil nativo (@capacitor/haptics).
 * No-op na web; só executa em Capacitor.isNativePlatform().
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export const hapticImpact = async (style: ImpactStyle = ImpactStyle.Medium) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Best effort
  }
};

export const hapticNotification = async (
  type: NotificationType = NotificationType.Success,
) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.notification({ type });
  } catch {
    // Best effort
  }
};
