import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WHATSAPP_PHONE } from "@/data/surroundings";

const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido — confira o endereço digitado.").max(255),
  phone: z.string().trim().min(8, "Informe um telefone com DDD").max(30),
  message: z.string().trim().max(1000).optional(),
});

type FormState = "idle" | "sending" | "success" | "error";

export default function ReservationForm() {
  const { t } = useTranslation();
  const [state, setState] = useState<FormState>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      message: String(fd.get("message") ?? ""),
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setState("sending");
    try {
      // Fallback: encaminha via WhatsApp para o time comercial. Substituir por
      // edge function quando o backend de reserva estiver configurado.
      const text = [
        `Nova reserva — Vila Park Vila Mariana`,
        `Nome: ${parsed.data.name}`,
        `E-mail: ${parsed.data.email}`,
        `Telefone: ${parsed.data.phone}`,
        parsed.data.message ? `Mensagem: ${parsed.data.message}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      window.open(
        `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(text)}`,
        "_blank",
      );
      setState("success");
      (e.target as HTMLFormElement).reset();
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="rf-name">{t("reservation.name")}</Label>
        <Input id="rf-name" name="name" autoComplete="name" required aria-invalid={!!errors.name} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="rf-email">{t("reservation.email")}</Label>
          <Input id="rf-email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rf-phone">{t("reservation.phone")}</Label>
          <Input id="rf-phone" name="phone" type="tel" autoComplete="tel" required aria-invalid={!!errors.phone} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="rf-message">{t("reservation.message")}</Label>
        <Textarea
          id="rf-message"
          name="message"
          rows={4}
          placeholder={t("reservation.messagePlaceholder")}
          maxLength={1000}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button
          type="submit"
          size="lg"
          disabled={state === "sending"}
          className="min-h-[52px] bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
        >
          <Send className="mr-2 h-4 w-4" />
          {state === "sending" ? t("reservation.sending") : t("reservation.submit")}
        </Button>
        <a
          href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="sm:w-auto"
        >
          <Button type="button" size="lg" variant="outline" className="min-h-[52px] w-full sm:w-auto">
            <MessageCircle className="mr-2 h-4 w-4" />
            {t("reservation.whatsapp")}
          </Button>
        </a>
      </div>
      {state === "success" && (
        <p className="text-sm text-accent font-medium">{t("reservation.success")}</p>
      )}
      {state === "error" && (
        <p className="text-sm text-destructive">{t("reservation.error")}</p>
      )}
    </form>
  );
}
