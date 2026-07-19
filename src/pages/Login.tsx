import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import LoginScreen from "@/components/auth/LoginScreen";

export default function Login() {
  const { session, loading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate("/comercial", { replace: true });
  }, [session, loading, navigate]);

  return <LoginScreen />;
}
