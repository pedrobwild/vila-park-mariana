import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { trackGlobal } from "@/hooks/useGuideAnalytics";

interface SectionBlockProps {
  id: string;
  title: string;
  takeaway: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionBlock({ id, title, takeaway, children, className }: SectionBlockProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          trackGlobal("section_enter", { section_id: id });
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [id]);

  return (
    <section ref={sectionRef} id={id} className={`scroll-mt-24 py-16 md:py-20 ${className ?? ""}`}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground text-lg mb-6">{takeaway}</p>
        {children}
      </motion.div>
    </section>
  );
}
