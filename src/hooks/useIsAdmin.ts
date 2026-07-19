import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useIsAdmin() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const check = async (s: Session | null) => {
      if (!s) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", s.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (mounted) {
        setIsAdmin(!!data);
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

  return { session, isAdmin, loading };
}
