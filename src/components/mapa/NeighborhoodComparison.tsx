/**
 * Antes: comparador de ROI/ocupação entre bairros (produto de investimento).
 * Agora: lista simples "O que tem perto" do Vila Park, por categoria.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { VILA_PARK_POIS, POI_CATEGORY_META, type PoiCategory } from "@/components/mapa/SaoPauloMap";

interface NeighborhoodComparisonProps {
  onClose: () => void;
}

const CATEGORY_ORDER: PoiCategory[] = ["leisure", "mobility", "education", "services", "gastronomy"];

export default function NeighborhoodComparison({ onClose }: NeighborhoodComparisonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-border rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">O que tem perto</h3>
          <p className="text-xs text-muted-foreground font-body">O que tem no quarteirão do Vila Park</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}><X size={16} /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORY_ORDER.map((cat) => {
          const meta = POI_CATEGORY_META[cat];
          const Icon = meta.icon;
          const items = VILA_PARK_POIS.filter((p) => p.category === cat);
          return (
            <Card key={cat} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: meta.color }}>
                    <Icon size={12} className="text-white" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground">{meta.label}</h4>
                </div>
                <ul className="space-y-1">
                  {items.map((poi) => (
                    <li key={poi.name} className="flex items-center justify-between text-xs font-body">
                      <span className="text-foreground">{poi.name}</span>
                      <span className="text-muted-foreground">{poi.distance}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
