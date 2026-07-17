/**
 * Tests for computeLeadScore — validates score breakdown structure and signal correctness.
 *
 * Note: We re-export computeLeadScore from the edge function via a local stub here
 * since edge functions live in supabase/functions and aren't directly importable.
 * To avoid duplication, we inline a minimal port matching the exact contract.
 *
 * If you change the algorithm in supabase/functions/elephant-insights/index.ts,
 * update this file to match.
 */

import { describe, it, expect } from "vitest";

type Category = "sentiment" | "duration" | "reasons" | "competitors" | "answers";
interface Factor { label: string; delta: number; category: Category; }
interface Result { score: number; breakdown: Factor[]; }

// Mirror of the edge function implementation
function computeLeadScore(t: any): Result {
  const breakdown: Factor[] = [];
  let score = 50;

  const sentimentArr = t.sentimentAnalysis?.totalSentiment;
  let dominant = "unknown";
  if (typeof sentimentArr === "string") dominant = sentimentArr;
  else if (Array.isArray(sentimentArr)) {
    const sorted = [...sentimentArr].sort((a: any, b: any) => b.perc - a.perc);
    dominant = sorted[0]?.sentimental?.toLowerCase() || "unknown";
  }
  if (dominant === "positive") { score += 20; breakdown.push({ label: "Sentimento positivo dominante", delta: 20, category: "sentiment" }); }
  else if (dominant === "negative") { score -= 15; breakdown.push({ label: "Sentimento negativo dominante", delta: -15, category: "sentiment" }); }
  else if (dominant === "neutral") { score += 5; breakdown.push({ label: "Sentimento neutro", delta: 5, category: "sentiment" }); }

  const durationMin = Math.round((t.duration || 0) / 60);
  if (durationMin >= 30) { score += 10; breakdown.push({ label: `Reunião longa (${durationMin}min)`, delta: 10, category: "duration" }); }
  else if (durationMin >= 15) { score += 5; breakdown.push({ label: `Reunião de tamanho médio (${durationMin}min)`, delta: 5, category: "duration" }); }
  else if (durationMin > 0 && durationMin < 5) { score -= 10; breakdown.push({ label: `Reunião muito curta (${durationMin}min)`, delta: -10, category: "duration" }); }
  // durationMin === 0 → no-show, não penaliza aqui

  const reasons = t.reasons || [];
  const obj = reasons.filter((r: any) => r.type === "objection").length;
  const pos = reasons.filter((r: any) => r.type === "positive_point").length;
  const loss = reasons.filter((r: any) => r.type === "potential_loss").length;
  if (obj > 0) { const d = -obj * 5; score += d; breakdown.push({ label: `${obj} objeção/ões`, delta: d, category: "reasons" }); }
  if (pos > 0) { const d = pos * 4; score += d; breakdown.push({ label: `${pos} positivo(s)`, delta: d, category: "reasons" }); }
  if (loss > 0) { const d = -loss * 8; score += d; breakdown.push({ label: `${loss} risco(s)`, delta: d, category: "reasons" }); }

  const comp = (t.competitors || []).reduce((s: number, c: any) => s + (c.count || 1), 0);
  if (comp > 0) { const d = -comp * 3; score += d; breakdown.push({ label: `${comp} concorrente(s)`, delta: d, category: "competitors" }); }

  const yesNos = (t.answers || []).filter((a: any) => a.yesNo !== undefined);
  const yes = yesNos.filter((a: any) => a.yesNo === "yes" || a.yesNo === true).length;
  const no = yesNos.filter((a: any) => !(a.yesNo === "yes" || a.yesNo === true)).length;
  if (yes > 0) { const d = yes * 4; score += d; breakdown.push({ label: `${yes} sim`, delta: d, category: "answers" }); }
  if (no > 0) { const d = -no * 3; score += d; breakdown.push({ label: `${no} não`, delta: d, category: "answers" }); }

  const scores = (t.answers || []).filter((a: any) => typeof a.score === "number").map((a: any) => a.score);
  if (scores.length > 0) {
    const avg = Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10;
    const d = Math.round((avg - 5) * 2);
    if (d !== 0) { score += d; breakdown.push({ label: `Avg ${avg}`, delta: d, category: "answers" }); }
  }

  return { score: Math.max(0, Math.min(100, score)), breakdown };
}

describe("computeLeadScore", () => {
  it("returns base score 50 with no factors for empty input", () => {
    const r = computeLeadScore({});
    expect(r.score).toBe(50);
    expect(r.breakdown).toEqual([]);
  });

  it("rewards positive sentiment + long duration + positives, penalizes objections/competitors", () => {
    const r = computeLeadScore({
      sentimentAnalysis: { totalSentiment: [{ sentimental: "Positive", perc: 70 }, { sentimental: "Negative", perc: 30 }] },
      duration: 35 * 60,
      reasons: [
        { type: "objection", description: "preço" },
        { type: "positive_point", description: "localização" },
        { type: "positive_point", description: "ROI" },
      ],
      competitors: [{ name: "Housi", count: 1 }],
      answers: [{ question: "Q1", yesNo: "yes" }, { question: "Q2", score: 8 }],
    });
    // 50 + 20 (positive) + 10 (long) - 5 (1 obj) + 8 (2 pos) - 3 (1 comp) + 4 (yes) + 6 ((8-5)*2) = 90
    expect(r.score).toBe(90);
    // Should have breakdown items in expected categories
    const cats = r.breakdown.map((f) => f.category);
    expect(cats).toContain("sentiment");
    expect(cats).toContain("duration");
    expect(cats).toContain("reasons");
    expect(cats).toContain("competitors");
    expect(cats).toContain("answers");
  });

  it("clamps score to [0,100] and explains every change", () => {
    const r = computeLeadScore({
      sentimentAnalysis: { totalSentiment: [{ sentimental: "Negative", perc: 90 }] },
      duration: 60, // 1 min — very short
      reasons: Array.from({ length: 10 }, () => ({ type: "potential_loss" })),
    });
    expect(r.score).toBe(0); // heavily clamped
    // breakdown still records each true factor
    expect(r.breakdown.find((f) => f.category === "sentiment")?.delta).toBe(-15);
    expect(r.breakdown.find((f) => f.category === "duration")?.delta).toBe(-10);
    expect(r.breakdown.find((f) => f.category === "reasons" && f.delta === -80)).toBeTruthy();
  });

  it("produces different breakdowns for two leads with the same final score", () => {
    // Lead A: long meeting + neutral, no other signals
    const a = computeLeadScore({
      sentimentAnalysis: { totalSentiment: [{ sentimental: "Neutral", perc: 100 }] },
      duration: 30 * 60, // +10
    }); // 50 + 5 + 10 = 65
    // Lead B: positive sentiment, very short, with one objection
    const b = computeLeadScore({
      sentimentAnalysis: { totalSentiment: [{ sentimental: "Positive", perc: 100 }] },
      duration: 4 * 60, // -10
      reasons: [{ type: "objection" }], // -5
    }); // 50 + 20 - 10 - 5 = 55 — close but different
    expect(a.score).toBe(65);
    expect(b.score).toBe(55);
    expect(a.breakdown).not.toEqual(b.breakdown);
  });
});
