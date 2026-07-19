import { MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WHATSAPP_PHONE } from "@/data/surroundings";

export default function WhatsAppFloat() {
  const { t } = useTranslation();
  const href = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(t("whatsapp.message"))}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp.float")}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-foreground/95 text-background pl-3 pr-3 py-3 min-h-[48px] min-w-[48px] shadow-md shadow-black/15 ring-1 ring-white/10 backdrop-blur-sm hover:bg-foreground transition-all"
    >
      <MessageCircle className="h-5 w-5 shrink-0" />
      <span className="hidden md:inline-block max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium tracking-tight opacity-0 transition-all duration-200 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-0.5">
        WhatsApp
      </span>
    </a>
  );
}
