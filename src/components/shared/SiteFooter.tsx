import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import { PROPERTY } from "@/data/propertyData";

export default function SiteFooter() {
  const { t } = useTranslation();
  const wa = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(t("whatsapp.message"))}`;
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl leading-none">
              <span className="text-foreground">Vila</span>
              <span className="text-accent"> Park</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm leading-relaxed">
              {PROPERTY.address} — {PROPERTY.neighborhood}, {PROPERTY.city}. {PROPERTY.incorporator}.
            </p>
          </div>

          <nav aria-label={t("footer.ariaLabel")} className="text-sm">
            <p className="eyebrow mb-4">{t("footer.navigate", "Navegar")}</p>
            <ul className="space-y-2">
              <li><Link to="/oportunidades" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.opportunities", "Oportunidades")}</Link></li>
              <li><Link to="/guia-investidor" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.guideInvestor")}</Link></li>
              <li><Link to="/ferramentas" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.ferramentas")}</Link></li>
            </ul>
          </nav>

          <div className="text-sm">
            <p className="eyebrow mb-4">{t("footer.contact", "Contato")}</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("footer.talkSpecialist", "Falar com especialista")}
            </a>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-xs text-muted-foreground">{t("footer.rights")}</p>
          <p className="text-[11px] text-muted-foreground max-w-3xl leading-relaxed">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
