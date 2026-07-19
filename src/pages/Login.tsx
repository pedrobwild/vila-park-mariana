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
    const target = isAdmin ? (from && from !== "/login" ? from : "/admin") : "/admin";
    navigate(target, { replace: true });
  }, [session, isAdmin, loading, navigate, location.state]);

  return <LoginScreen />;
}
