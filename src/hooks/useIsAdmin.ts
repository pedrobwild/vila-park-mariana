import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "incorporadora";

export function useRole() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async (s: Session | null) => {
      if (!s) {
        if (mounted) {
          setRole(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .in("role", ["admin", "incorporadora"])
        .maybeSingle();
      if (mounted) {
        setRole((data?.role as AppRole | undefined) ?? null);
        setLoading(false);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => {
      setSession(s);
      setLoading(true);
      check(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      check(data.session);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, role, loading };
}

/**
 * Back-compat: `isAdmin` here means "any staff role" (admin OR incorporadora),
 * used by route guards that gate the entire admin area. For Bewild-only access,
 * check `role === 'admin'` explicitly.
 */
export function useIsAdmin() {
  const { session, role, loading } = useRole();
  return { session, role, isAdmin: role === "admin" || role === "incorporadora", loading };
}
