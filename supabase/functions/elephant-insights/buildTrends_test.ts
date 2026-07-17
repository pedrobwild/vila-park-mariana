// Tests for buildTrends() — validates 30/60/90d windows, deltas, and top objections
// Runs without network/Elephan dependency.

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildTrends } from "./index.ts";

// ─── Helpers ────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString();
}

interface MockOpts {
  daysAgo: number;
  answersAvg?: number; // 0-10 scale (drives computeLeadScore)
  positivePerc?: number; // 0-100
  objections?: string[];
}

let idCounter = 0;
function mockTranscribe(opts: MockOpts) {
  const reasons = (opts.objections || []).map((d) => ({
    type: "objection",
    description: d,
  }));

  // Build minimal answers structure that computeLeadScore can read.
  // computeLeadScore looks at t.questionsAndAnswers[].answers[].score.
  const answers = opts.answersAvg !== undefined
    ? [
        {
          answers: [{ score: opts.answersAvg }],
        },
      ]
    : [];

  const sentimentTotal = opts.positivePerc !== undefined
    ? [
        { sentimental: "positive", perc: opts.positivePerc, total: 1 },
        { sentimental: "negative", perc: 100 - opts.positivePerc, total: 1 },
      ]
    : [];

  return {
    id: `t-${++idCounter}`,
    dateIncluded: daysAgo(opts.daysAgo),
    reasons,
    questionsAndAnswers: answers,
    sentimentAnalysis: { totalSentiment: sentimentTotal },
    duration: 1800,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

Deno.test("buildTrends: empty input returns zeroed windows and deltas", () => {
  const r = buildTrends([]);
  assertEquals(r.windows.length, 3);
  assertEquals(r.windows.map((w) => w.windowDays), [30, 60, 90]);
  for (const w of r.windows) {
    assertEquals(w.meetings, 0);
    assertEquals(w.avgScore, 0);
    assertEquals(w.positiveSentimentPct, 0);
    assertEquals(w.topObjections, []);
  }
  assertEquals(r.delta30vs60, { meetings: 0, avgScore: 0, positiveSentimentPct: 0 });
});

Deno.test("buildTrends: window classification — 30/60/90 boundaries", () => {
  const data = [
    mockTranscribe({ daysAgo: 5 }),   // in 30, 60, 90
    mockTranscribe({ daysAgo: 25 }),  // in 30, 60, 90
    mockTranscribe({ daysAgo: 45 }),  // in 60, 90 only
    mockTranscribe({ daysAgo: 75 }),  // in 90 only
    mockTranscribe({ daysAgo: 120 }), // outside all
  ];
  const r = buildTrends(data);
  const [w30, w60, w90] = r.windows;
  assertEquals(w30.meetings, 2);
  assertEquals(w60.meetings, 3);
  assertEquals(w90.meetings, 4);
});

Deno.test("buildTrends: ignores invalid / missing dateIncluded", () => {
  const data = [
    mockTranscribe({ daysAgo: 5 }),
    { id: "x", dateIncluded: null, reasons: [], questionsAndAnswers: [], sentimentAnalysis: {} },
    { id: "y", dateIncluded: "not-a-date", reasons: [], questionsAndAnswers: [], sentimentAnalysis: {} },
    { id: "z", reasons: [], questionsAndAnswers: [], sentimentAnalysis: {} },
  ];
  const r = buildTrends(data);
  assertEquals(r.windows[0].meetings, 1);
  assertEquals(r.windows[2].meetings, 1);
});

Deno.test("buildTrends: top objections aggregate and rank by count, max 3", () => {
  const data = [
    mockTranscribe({ daysAgo: 1, objections: ["Preço alto", "Localização"] }),
    mockTranscribe({ daysAgo: 2, objections: ["Preço alto", "Reforma cara"] }),
    mockTranscribe({ daysAgo: 3, objections: ["Preço alto"] }),
    mockTranscribe({ daysAgo: 4, objections: ["Localização", "Prazo de entrega", "Outra objeção"] }),
  ];
  const r = buildTrends(data);
  const top = r.windows[0].topObjections;
  assert(top.length <= 3);
  assertEquals(top[0], { objection: "Preço alto", count: 3 });
  assertEquals(top[1], { objection: "Localização", count: 2 });
  // Third place is one of the count=1 objections
  assertEquals(top[2].count, 1);
});

Deno.test("buildTrends: positive sentiment averaged across meetings in window", () => {
  const data = [
    mockTranscribe({ daysAgo: 5, positivePerc: 80 }),
    mockTranscribe({ daysAgo: 10, positivePerc: 40 }),
    mockTranscribe({ daysAgo: 50, positivePerc: 20 }), // outside 30d
  ];
  const r = buildTrends(data);
  // 30d window: avg(80, 40) = 60
  assertEquals(r.windows[0].positiveSentimentPct, 60);
  // 60d window: avg(80, 40, 20) ≈ 47
  assertEquals(r.windows[1].positiveSentimentPct, 47);
});

Deno.test("buildTrends: delta30vs60 compares 30d window to preceding 30-60d window", () => {
  // 30d window: 3 meetings, all high-quality answers (score ~9 → boosts lead score)
  const recent = [
    mockTranscribe({ daysAgo: 5, answersAvg: 9, positivePerc: 80 }),
    mockTranscribe({ daysAgo: 10, answersAvg: 9, positivePerc: 80 }),
    mockTranscribe({ daysAgo: 20, answersAvg: 9, positivePerc: 80 }),
  ];
  // Preceding 30-60d window: 1 meeting, lower quality
  const prev = [
    mockTranscribe({ daysAgo: 45, answersAvg: 3, positivePerc: 20 }),
  ];
  const r = buildTrends([...recent, ...prev]);

  // Meetings delta: 3 - 1 = 2
  assertEquals(r.delta30vs60.meetings, 2);
  // Recent window should have higher score than previous
  assert(r.delta30vs60.avgScore > 0, `expected positive score delta, got ${r.delta30vs60.avgScore}`);
  // Recent window should have higher positive sentiment
  assertEquals(r.delta30vs60.positiveSentimentPct, 80 - 20);
});

Deno.test("buildTrends: delta is negative when recent window underperforms", () => {
  const recent = [mockTranscribe({ daysAgo: 5, positivePerc: 30 })];
  const prev = [
    mockTranscribe({ daysAgo: 40, positivePerc: 90 }),
    mockTranscribe({ daysAgo: 50, positivePerc: 90 }),
  ];
  const r = buildTrends([...recent, ...prev]);
  assertEquals(r.delta30vs60.meetings, -1);
  assertEquals(r.delta30vs60.positiveSentimentPct, 30 - 90);
});

Deno.test("buildTrends: objections truncated to 80 chars as dedup key", () => {
  const longA = "a".repeat(100);
  const longB = "a".repeat(80) + "DIFFERENT_SUFFIX";
  const data = [
    mockTranscribe({ daysAgo: 1, objections: [longA] }),
    mockTranscribe({ daysAgo: 2, objections: [longB] }),
  ];
  const r = buildTrends(data);
  // Both should collapse to the same 80-char key → count 2
  assertEquals(r.windows[0].topObjections[0].count, 2);
  assertEquals(r.windows[0].topObjections[0].objection.length, 80);
});

Deno.test("buildTrends: objection rows without description are skipped", () => {
  const data = [
    {
      id: "a",
      dateIncluded: daysAgo(2),
      reasons: [
        { type: "objection", description: "" },
        { type: "objection" },
        { type: "objection", description: "Real objection" },
        { type: "interest", description: "Não conta" },
      ],
      questionsAndAnswers: [],
      sentimentAnalysis: {},
    },
  ];
  const r = buildTrends(data);
  assertEquals(r.windows[0].topObjections.length, 1);
  assertEquals(r.windows[0].topObjections[0].objection, "Real objection");
});

Deno.test("buildTrends: weekly returns 12 buckets, oldest → newest, anchored to UTC Monday", () => {
  const r = buildTrends([]);
  assertEquals(r.weekly.length, 12);
  for (const w of r.weekly) {
    const d = new Date(w.weekStart + "T00:00:00Z");
    assertEquals(d.getUTCDay(), 1, `weekStart ${w.weekStart} is not a Monday`);
    assert(typeof w.label === "string" && w.label.length >= 5);
    assertEquals(w.meetings, 0);
    assertEquals(w.avgScore, 0);
  }
  for (let i = 1; i < r.weekly.length; i++) {
    assert(r.weekly[i - 1].weekStart < r.weekly[i].weekStart);
  }
});

Deno.test("buildTrends: weekly aggregates meetings inside 12-week range, ignores older", () => {
  const data = [
    mockTranscribe({ daysAgo: 3, answersAvg: 9, positivePerc: 80 }),
    mockTranscribe({ daysAgo: 10, answersAvg: 7, positivePerc: 60 }),
    mockTranscribe({ daysAgo: 30, answersAvg: 5, positivePerc: 40 }),
    mockTranscribe({ daysAgo: 200, answersAvg: 9 }),
  ];
  const r = buildTrends(data);
  const totalMeetingsInWeekly = r.weekly.reduce((s, w) => s + w.meetings, 0);
  assertEquals(totalMeetingsInWeekly, 3);
  assert(r.weekly.some((w) => w.avgScore > 0));
});
