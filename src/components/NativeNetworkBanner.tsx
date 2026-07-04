"use client";

/**
 * Banner nativo de "sem conexão" — só roda no app (Capacitor), usando
 * @capacitor/network. Argumento de funcionalidade nativa real para a Apple
 * (Guideline 4.2): o app reage ao estado de rede do dispositivo, algo que
 * uma aba de navegador comum não expõe.
 */

import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function NativeNetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    Network.getStatus().then((status) => setIsOffline(!status.connected));

    Network.addListener("networkStatusChange", (status) => {
      setIsOffline(!status.connected);
    }).then((handle) => {
      unsubscribe = () => handle.remove();
    });

    return () => unsubscribe?.();
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-xs font-medium px-3 py-1.5 flex items-center justify-center gap-1.5">
      <WifiOff className="h-3.5 w-3.5" />
      Sem conexão com a internet
    </div>
  );
}
