import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";

export default function LazyMapaBairrosEmbed() {
  const [visible, setVisible] = useState(false);
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    import("@/components/mapa/MapaBairrosEmbed").then((mod) => {
      setComponent(() => mod.default);
    });
  }, [visible]);

  if (!visible || !Component) {
    return (
      <div ref={sentinelRef} className="bg-muted rounded-xl h-[400px] flex flex-col items-center justify-center gap-3">
        <MapPin size={32} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground font-body">Carregando mapa...</p>
        {visible && (
          <div className="h-4 w-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        )}
      </div>
    );
  }

  return <Component />;
}
