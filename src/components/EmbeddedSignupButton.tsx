"use client";

/**
 * Embedded Signup Button with Facebook JS SDK
 *
 * Uses FB.login() popup with coexistence support via extras.featureType
 * Replaces redirect-based OAuth for WhatsApp Business onboarding
 *
 * Key: extras.featureType = "whatsapp_business_app_onboarding" enables
 * coexistence (WhatsApp Business App + Cloud API on same number)
 */

import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, MessageSquare } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

// Types for Facebook SDK
declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            version: string;
            featureType: string;
          };
        },
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

interface FBLoginResponse {
  authResponse?: {
    code: string;
    userID?: string;
  };
  status: string;
}

interface SessionInfo {
  waba_id?: string;
  phone_number_id?: string;
  business_id?: string;
  event?: string;
}

interface EmbeddedSignupButtonProps {
  clientId?: string;
  onSuccess?: (data: {
    clientId: string;
    wabaId: string;
    displayPhone: string;
  }) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_PLATFORM_APP_ID || "";
const META_CONFIG_ID =
  process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || "";

export const EmbeddedSignupButton = ({
  clientId,
  onSuccess,
  onError,
  onCancel,
  variant = "default",
  size = "lg",
  className = "",
  children,
}: EmbeddedSignupButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionInfoRef = useRef<SessionInfo>({});

  // Setup fbAsyncInit BEFORE the SDK script loads (Meta requires this order)
  useEffect(() => {
    if (!META_APP_ID) {
      console.error(
        "[EmbeddedSignup] Missing NEXT_PUBLIC_META_PLATFORM_APP_ID",
      );
      setError("Configuração do Facebook SDK ausente");
      return;
    }

    // Define fbAsyncInit — the SDK calls this automatically after loading
    window.fbAsyncInit = () => {
      console.log("[EmbeddedSignup] fbAsyncInit called by SDK");
      window.FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      setSdkReady(true);
      console.log("[EmbeddedSignup] Facebook SDK initialized via fbAsyncInit");
    };

    // If FB was already loaded (hot reload / re-mount), init directly
    if (window.FB) {
      console.log("[EmbeddedSignup] FB already exists, calling init directly");
      window.FB.init({
        appId: META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
      setSdkReady(true);
    }
  }, []);

  // Listen for session logging messages from the Embedded Signup popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.type === "WA_EMBEDDED_SIGNUP") {
          const { data: sessionData } = data;

          if (sessionData) {
            sessionInfoRef.current = {
              waba_id: sessionData.waba_id,
              phone_number_id: sessionData.phone_number_id,
              business_id: sessionData.business_id,
              event: sessionData.event,
            };

            console.log("[EmbeddedSignup] Session data received:", {
              event: sessionData.event,
              waba_id: sessionData.waba_id,
              phone_number_id: sessionData.phone_number_id,
            });

            if (sessionData.event === "CANCEL") {
              setIsLoading(false);
              onCancel?.();
            }
          }
        }
      } catch {
        // Not a JSON message or not from Facebook — ignore
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onCancel]);

  // Handle the FB.login callback
  const handleFBLoginResponse = useCallback(
    async (response: FBLoginResponse) => {
      if (response.status !== "connected" || !response.authResponse?.code) {
        console.log("[EmbeddedSignup] Login not completed:", response.status);
        setIsLoading(false);

        if (response.status === "not_authorized") {
          const msg =
            "Autorização negada. Tente novamente e aceite as permissões.";
          setError(msg);
          onError?.(msg);
        }
        return;
      }

      const code = response.authResponse.code;
      const sessionInfo = sessionInfoRef.current;

      console.log("[EmbeddedSignup] Login successful, sending to backend:", {
        hasCode: true,
        event: sessionInfo.event,
        waba_id: sessionInfo.waba_id,
        phone_number_id: sessionInfo.phone_number_id,
      });

      try {
        // Send code + session data to backend
        const res = await fetch("/api/auth/meta/embedded-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            waba_id: sessionInfo.waba_id || null,
            phone_number_id: sessionInfo.phone_number_id || null,
            business_id: sessionInfo.business_id || null,
            event_type: sessionInfo.event || "FINISH",
            client_id: clientId || null,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Falha ao processar signup");
        }

        console.log("[EmbeddedSignup] Backend processed successfully:", result);
        setError(null);
        onSuccess?.({
          clientId: result.client_id,
          wabaId: result.waba_id,
          displayPhone: result.display_phone,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao processar signup";
        console.error("[EmbeddedSignup] Backend error:", msg);
        setError(msg);
        onError?.(msg);
      } finally {
        setIsLoading(false);
        // Reset session info for next attempt
        sessionInfoRef.current = {};
      }
    },
    [clientId, onSuccess, onError],
  );

  // Launch the Embedded Signup popup
  const handleClick = useCallback(() => {
    console.log("[EmbeddedSignup] Button clicked", {
      sdkReady,
      hasFB: !!window.FB,
      configId: META_CONFIG_ID ? "set" : "missing",
      appId: META_APP_ID ? "set" : "missing",
    });

    if (!sdkReady || !window.FB) {
      setError("Facebook SDK ainda não carregou. Tente novamente.");
      return;
    }

    if (!META_CONFIG_ID) {
      setError("Config ID do Embedded Signup não configurado.");
      return;
    }

    setIsLoading(true);
    setError(null);
    sessionInfoRef.current = {};

    console.log(
      "[EmbeddedSignup] Calling FB.login with config_id:",
      META_CONFIG_ID,
    );

    // FB.login requires a synchronous callback — wrap the async handler
    window.FB.login(
      (response: FBLoginResponse) => {
        handleFBLoginResponse(response);
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          version: "v4",
          featureType: "whatsapp_business_app_onboarding",
        },
      },
    );
  }, [sdkReady, handleFBLoginResponse]);

  return (
    <div className="flex flex-col gap-2">
      {/* Load Facebook SDK — must use afterInteractive so fbAsyncInit is found */}
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />

      <Button
        onClick={handleClick}
        disabled={isLoading || !sdkReady}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Conectando...
          </>
        ) : !sdkReady ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Carregando SDK...
          </>
        ) : (
          <>
            <MessageSquare className="mr-2 h-4 w-4" />
            {children || "Conectar WhatsApp Business"}
          </>
        )}
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        O WhatsApp Business App no celular continuará funcionando normalmente.
      </p>
    </div>
  );
};
