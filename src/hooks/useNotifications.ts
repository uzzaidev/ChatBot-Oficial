import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseNotificationsOptions {
    enabled?: boolean;
    sound?: boolean;
    soundUrl?: string;
}

interface UseNotificationsResult {
    permissionStatus: NotificationPermission | "unsupported";
    requestPermission: () => Promise<boolean>;
    notify: (title: string, options?: NotificationOptions) => void;
    playSound: () => void;
    isSupported: boolean;
}

/**
 * useNotifications - Hook para gerenciar notificações
 *
 * Funcionalidades:
 * - Browser Notifications API (desktop/mobile)
 * - Som de alerta customizável
 * - Toast fallback se notificações bloqueadas
 * - Auto-request de permissão
 *
 * @example
 * const { notify, playSound } = useNotifications({ enabled: true, sound: true })
 *
 * // Nova mensagem
 * notify('Nova mensagem de João', {
 *   body: 'Olá, tudo bem?',
 *   icon: '/icon.png',
 *   tag: 'whatsapp-message'
 * })
 */
export const useNotifications = ({
    enabled = true,
    sound = true,
    soundUrl = "/notification.mp3", // Você precisa adicionar este arquivo em /public
}: UseNotificationsOptions = {}): UseNotificationsResult => {
    const [permissionStatus, setPermissionStatus] = useState<
        NotificationPermission | "unsupported"
    >("default");
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    // Verificar se Notifications API é suportada
    const isSupported = typeof window !== "undefined" &&
        "Notification" in window;

    // Inicializar áudio
    useEffect(() => {
        if (sound && typeof window !== "undefined") {
            audioRef.current = new Audio(soundUrl);
            audioRef.current.volume = 0.5; // 50% volume
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [sound, soundUrl]);

    // Atualizar status de permissão
    useEffect(() => {
        if (isSupported) {
            setPermissionStatus(Notification.permission);
        } else {
            setPermissionStatus("unsupported");
        }
    }, [isSupported]);

    // Solicitar permissão
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn("[Notifications] Notification API not supported");
            return false;
        }

        if (Notification.permission === "granted") {
            return true;
        }

        if (Notification.permission === "denied") {
            console.warn("[Notifications] Permission denied by user");
            toast({
                title: "Notificações bloqueadas",
                description:
                    "Você bloqueou as notificações. Habilite nas configurações do navegador.",
                variant: "destructive",
            });
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);

            if (permission === "granted") {
                toast({
                    title: "🔔 Notificações ativadas",
                    description: "Você receberá alertas de novas mensagens.",
                });
                return true;
            } else {
                toast({
                    title: "Notificações negadas",
                    description:
                        "Você não receberá alertas de novas mensagens.",
                    variant: "destructive",
                });
                return false;
            }
        } catch (error) {
            console.error(
                "[Notifications] Error requesting permission:",
                error,
            );
            return false;
        }
    }, [isSupported, toast]);

    // Tocar som de notificação
    const playSound = useCallback(() => {
        if (!sound || !audioRef.current) return;

        try {
            // Reset audio to start
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((error) => {
                console.warn("[Notifications] Could not play sound:", error);
            });
        } catch (error) {
            console.error("[Notifications] Error playing sound:", error);
        }
    }, [sound]);

    // Enviar notificação
    const notify = useCallback(
        (title: string, options?: NotificationOptions) => {
            if (!enabled) return;

            // Tocar som se habilitado
            if (sound) {
                playSound();
            }

            // Se não suportado ou sem permissão, mostrar toast
            if (!isSupported || Notification.permission !== "granted") {
                toast({
                    title,
                    description: options?.body,
                });
                return;
            }

            try {
                // Criar notificação do navegador
                const notification = new Notification(title, {
                    icon: options?.icon || "/icon-192x192.png",
                    badge: options?.badge || "/icon-96x96.png",
                    tag: options?.tag || "whatsapp-message",
                    requireInteraction: false,
                    silent: true, // Som customizado já tocou
                    ...options,
                });

                // Focar na aba quando clicar na notificação
                notification.onclick = (event) => {
                    event.preventDefault();
                    window.focus();
                    notification.close();

                    // Se tiver URL específica no options.data, navegar
                    if (options?.data?.url) {
                        window.location.href = options.data.url;
                    }
                };

                // Auto-fechar após 5 segundos
                setTimeout(() => {
                    notification.close();
                }, 5000);
            } catch (error) {
                console.error(
                    "[Notifications] Error showing notification:",
                    error,
                );
                // Fallback para toast
                toast({
                    title,
                    description: options?.body,
                });
            }
        },
        [enabled, sound, isSupported, playSound, toast],
    );

    return {
        permissionStatus,
        requestPermission,
        notify,
        playSound,
        isSupported,
    };
};
