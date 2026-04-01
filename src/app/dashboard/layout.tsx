"use client";
import { AuthMonitor } from "@/components/AuthMonitor";
import { DashboardLayoutClient } from "@/components/DashboardLayoutClient";
import { createClientBrowser } from "@/lib/supabase";
import { useEffect, useState } from "react";

/**
 * Dashboard Layout - Client Component (Mobile Compatible)
 *
 * FASE 3 (Mobile): Convertido para Client Component
 * Motivo: Static Export não suporta Server Components com cookies (getCurrentUser)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClientBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("role")
            .eq("id", user.id)
            .single();
          setUserRole(profile?.role ?? null);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <>
      <AuthMonitor />
      <DashboardLayoutClient
        userName={userName}
        userEmail={user?.email}
        userRole={userRole}
      >
        {children}
      </DashboardLayoutClient>
    </>
  );
}
