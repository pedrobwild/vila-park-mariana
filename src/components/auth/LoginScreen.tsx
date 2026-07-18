import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export default function LoginScreen() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en");
  const t = {
    title: isEn ? "Restricted area" : "Área restrita",
    subtitle: isEn
      ? "Sign in to access the internal panel."
      : "Faça login para acessar o painel interno.",
    email: "E-mail",
    password: isEn ? "Password" : "Senha",
    submit: isEn ? "Sign in" : "Entrar",
    submitting: isEn ? "Signing in…" : "Entrando…",
    error: isEn ? "Invalid credentials." : "Credenciais inválidas.",
    hint: isEn
      ? "Access is granted by the administrator."
      : "O acesso é liberado pela administração.",
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(t.error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm space-y-6"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t.submitting : t.submit}
        </Button>

        <p className="text-xs text-muted-foreground text-center">{t.hint}</p>
      </form>
    </div>
  );
}
