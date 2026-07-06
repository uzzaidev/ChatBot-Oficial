import { Capacitor } from "@capacitor/core";

/**
 * True when running inside the Capacitor native shell (iOS or Android).
 *
 * App Store Guideline 3.1.1 / 3.1.3(b): the native app is a companion client
 * for existing business accounts. Account creation, organization signup, and
 * external subscription checkout stay on the web platform only.
 */
export const isNativeCompanionApp = (): boolean =>
  Capacitor.isNativePlatform();

export const isIosCompanionApp = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
