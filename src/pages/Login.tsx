import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import LoginScreen from "@/components/auth/LoginScreen";

type LocationState = { from?: { pathname?: string } } | null;

export default function Login() {
  const { session, isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !session) return;
    const from = (location.state as LocationState)?.from?.pathname;
    if (isAdmin) {
      navigate(from && from !== "/login" ? from : "/admin", { replace: true });
    }
    // If logged in but not admin, LoginScreen/RequireAdmin will show restricted state on /admin.
    // Keep them on /login (LoginScreen shown) unless they came from an admin path.
  }, [session, isAdmin, loading, navigate, location.state]);

  return <LoginScreen />;
}
