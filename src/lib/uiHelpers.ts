/**
 * Shared UI helpers for the Intelligence module.
 * Prevents duplication of grade color maps, formatters, etc.
 */

import { DISCLAIMERS } from "@/lib/productFoundation";

// ── Grade color mapping (used in Dashboard, Ranking, AnalysisSummary) ──
export const GRADE_STYLES: Record<string, string> = {
  "text-emerald-600": "bg-emerald-100 text-emerald-800",
  "text-blue-600": "bg-blue-100 text-blue-800",
  "text-amber-600": "bg-amber-100 text-amber-800",
  "text-orange-600": "bg-orange-100 text-orange-800",
  "text-red-600": "bg-red-100 text-red-800",
};

export function getGradeStyle(gradeColor: string): string {
  return GRADE_STYLES[gradeColor] || "bg-muted text-foreground";
}

// ── Shared disclaimer text ──────────────────────────────────────
export const FOOTER_DISCLAIMER = DISCLAIMERS.general;
export const SCORES_DISCLAIMER = DISCLAIMERS.scores;
export const DATA_SOURCE_DISCLAIMER = DISCLAIMERS.dataSource;
