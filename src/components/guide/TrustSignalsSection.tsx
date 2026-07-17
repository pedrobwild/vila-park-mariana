import { motion } from "framer-motion";
import { TRUST_SIGNALS_DATA } from "@/data/guide-data";

export default function TrustSignalsSection() {
  return (
    <section className="scroll-mt-24 py-10">
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
        {TRUST_SIGNALS_DATA.map((signal, i) => (
          <motion.div
            key={signal.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-2.5 text-muted-foreground"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <signal.icon size={18} className="text-primary" />
            </div>
            <span className="font-display font-bold text-foreground text-sm">{signal.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
