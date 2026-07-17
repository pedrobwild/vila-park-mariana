import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const HEADER_HEIGHT = 64; // sticky header h-16
const NAV_HEIGHT = 44;
const SCROLL_OFFSET = HEADER_HEIGHT + NAV_HEIGHT + 8;

export default function MobileQuickNav() {
  const { t } = useTranslation();
  const NAV_ITEMS = [
    { id: "tipologias", label: t("quickNav.plantas") },
    { id: "comparativo", label: t("quickNav.comparativo") },
    { id: "guia", label: t("quickNav.guia") },
  ] as const;
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const heroEl = document.querySelector<HTMLElement>("section[class*='min-h-']");
    const guiaEl = document.getElementById("guia");
    if (!heroEl) return;

    let heroOut = false;
    let pastGuia = false;

    const update = () => setVisible(heroOut && !pastGuia);

    const heroObs = new IntersectionObserver(
      ([e]) => { heroOut = !e.isIntersecting; update(); },
      { threshold: 0 }
    );

    // Hide after guia section ends (use bottom sentinel)
    const guiaObs = new IntersectionObserver(
      ([e]) => { pastGuia = !e.isIntersecting && (e.boundingClientRect.top < 0); update(); },
      { threshold: 0 }
    );

    heroObs.observe(heroEl);
    if (guiaEl) guiaObs.observe(guiaEl);

    // Scrollspy: determine active section
    const handleScroll = () => {
      let current: string | null = null;
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= SCROLL_OFFSET + 40) current = item.id;
      }
      setActiveId(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      heroObs.disconnect();
      guiaObs.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={navRef}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-16 inset-x-0 z-30 md:hidden"
        >
          <nav className="glass-nav border-b border-border/40 px-5 py-2" aria-label={t("quickNav.ariaLabel")}>
            <div className="flex gap-1.5 justify-center" role="tablist">
              {NAV_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={t("quickNav.goTo", { label: item.label })}
                    onClick={() => scrollTo(item.id)}
                    className={`relative px-5 py-2.5 rounded-full text-xs font-semibold transition-all min-h-[40px] focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none active:scale-[0.95] ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-sm shadow-accent/20"
                        : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
