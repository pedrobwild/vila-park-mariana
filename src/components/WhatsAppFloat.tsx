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
      className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}
