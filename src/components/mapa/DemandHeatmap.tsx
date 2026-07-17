import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeatPoint } from "@/data/mapaBairrosData";

interface DemandHeatmapProps {
  heatPoints: HeatPoint[];
  visible: boolean;
}

function heatColor(score: number): string {
  if (score >= 85) return "34, 197, 94";      // green
  if (score >= 65) return "245, 158, 11";      // amber
  return "156, 163, 175";                       // gray
}

function heatOpacity(score: number): number {
  return 0.15 + (score / 100) * 0.35;
}

function heatSize(score: number): number {
  return 40 + (score / 100) * 50;
}

export default function DemandHeatmap({ heatPoints, visible }: DemandHeatmapProps) {
  const [hovered, setHovered] = useState<HeatPoint | null>(null);

  return (
    <AnimatePresence>
      {visible && heatPoints.map((hp, i) => {
        const rgb = heatColor(hp.demandScore);
        const size = heatSize(hp.demandScore);
        const isHigh = hp.demandScore >= 85;
        return (
          <motion.div
            key={hp.id}
            initial={{ opacity: 0, scale: 0.2, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.2, filter: "blur(12px)" }}
            transition={{ duration: 0.6, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-[5]"
            style={{
              left: `${hp.coordinates.x}%`,
              top: `${hp.coordinates.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            onMouseEnter={() => setHovered(hp)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Outer pulse ring for high-demand areas */}
            {isHigh && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: `${size * 1.4}px`,
                  height: `${size * 1.4}px`,
                  border: `1px solid rgba(${rgb}, 0.2)`,
                }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Main glow */}
            <motion.div
              className="rounded-full pointer-events-none"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                background: `radial-gradient(circle, rgba(${rgb}, ${heatOpacity(hp.demandScore)}) 0%, rgba(${rgb}, 0.04) 60%, transparent 100%)`,
                filter: isHigh ? "blur(3px)" : "blur(6px)",
              }}
              animate={isHigh ? {
                scale: [1, 1.08, 1],
                opacity: [1, 0.85, 1],
              } : {}}
              transition={isHigh ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
            />

            {/* Center dot */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer"
              style={{ backgroundColor: `rgba(${rgb}, 0.85)` }}
              initial={{ width: 0, height: 0 }}
              animate={{ width: 8, height: 8 }}
              transition={{ delay: 0.3 + i * 0.04, type: "spring", stiffness: 300, damping: 15 }}
              whileHover={{ scale: 1.8, boxShadow: `0 0 12px rgba(${rgb}, 0.5)` }}
            />

            {/* Tooltip */}
            <AnimatePresence>
              {hovered?.id === hp.id && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-card/95 backdrop-blur-sm border border-border shadow-xl rounded-xl px-3.5 py-2.5 whitespace-nowrap z-50 pointer-events-none"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `rgb(${rgb})` }} />
                    <p className="text-[11px] font-bold text-foreground">{hp.areaName}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[9px]">
                    <div>
                      <p className="text-muted-foreground">Demanda</p>
                      <p className="font-bold text-foreground">{hp.demandScore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ocupação</p>
                      <p className="font-bold text-foreground">{hp.occupancyEstimate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ADR</p>
                      <p className="font-bold text-foreground">R${hp.adrEstimate}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
