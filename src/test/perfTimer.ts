/**
 * Adaptive timing helper for performance tests.
 *
 * Why this exists
 * ---------------
 * Single-run `performance.now()` measurements are dominated by GC pauses and
 * OS scheduler jitter, which makes pass/fail thresholds flaky on CI. This
 * helper:
 *   1. Warms up the JIT.
 *   2. Interleaves two implementations per iteration so transient noise
 *      hits both samples symmetrically.
 *   3. Stops as soon as the relative standard error (RSE) of both sample
 *      sets falls below a target (or hits a max-runs cap).
 *   4. Reports MEDIAN per-call timing, which is robust to outliers — much
 *      more stable than mean or sum-of-runs.
 *
 * Designed to be dependency-free and usable from both Node and jsdom.
 */

export interface SampleStats {
  samples: number[];
  median: number;
  min: number;
  max: number;
  mean: number;
  /** Relative standard error of the mean (stdev / √n / mean). Unitless. */
  rse: number;
}

export interface AdaptiveTimingResult<A extends string, B extends string> {
  /** Per-impl statistics, keyed by the labels you passed in. */
  stats: Record<A | B, SampleStats>;
  /** Number of interleaved iterations actually executed. */
  iterations: number;
  /** True if RSE convergence was reached before maxRuns. */
  stoppedEarly: boolean;
  /** Speedup of `a` over `b` based on medians (b.median / a.median). */
  ratioMedian: number;
}

export interface AdaptiveTimingOptions {
  /** Floor on iterations before convergence is even checked. Default 12. */
  minRuns?: number;
  /** Hard cap on iterations. Default 80. */
  maxRuns?: number;
  /** RSE threshold considered "stable" (e.g. 0.05 = 5%). Default 0.05. */
  targetRSE?: number;
  /** JIT warm-up iterations executed (and discarded) before sampling. Default 3. */
  warmups?: number;
}

// ─── Internal stats helpers ─────────────────────────────────────────────────
function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((acc, v) => acc + (v - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Relative standard error of the mean. Returns Infinity for n<2 or mean=0. */
function rse(xs: number[]): number {
  if (xs.length < 2) return Infinity;
  const m = mean(xs);
  if (m === 0) return Infinity;
  return stdev(xs) / Math.sqrt(xs.length) / m;
}

function buildStats(samples: number[]): SampleStats {
  return {
    samples,
    median: median(samples),
    min: samples.length ? Math.min(...samples) : 0,
    max: samples.length ? Math.max(...samples) : 0,
    mean: mean(samples),
    rse: rse(samples),
  };
}

/**
 * Run two functions side-by-side under adaptive timing and return per-call
 * median (plus min/max/mean/RSE) for each.
 *
 * @example
 *   const { stats, ratioMedian } = adaptiveCompare(
 *     { optimized: () => mergeWeekly(s), naive: () => mergeWeeklyNaive(s) },
 *     "optimized",
 *     "naive",
 *     { targetRSE: 0.05, maxRuns: 80 }
 *   );
 *   expect(stats.optimized.median).toBeLessThan(budgetMs);
 *   expect(ratioMedian).toBeGreaterThan(1.2);
 */
export function adaptiveCompare<A extends string, B extends string>(
  fns: Record<A | B, () => unknown>,
  labelA: A,
  labelB: B,
  options: AdaptiveTimingOptions = {}
): AdaptiveTimingResult<A, B> {
  const minRuns = Math.max(3, Math.round(options.minRuns ?? 12));
  const maxRuns = Math.max(minRuns, Math.round(options.maxRuns ?? 80));
  const targetRSE = options.targetRSE ?? 0.05;
  const warmups = Math.max(0, Math.round(options.warmups ?? 3));

  const fnA = fns[labelA];
  const fnB = fns[labelB];

  // Warm-up: stabilize JIT before recording samples.
  for (let i = 0; i < warmups; i++) {
    fnA();
    fnB();
  }

  const aSamples: number[] = [];
  const bSamples: number[] = [];
  let iterations = 0;
  let stoppedEarly = false;

  while (iterations < maxRuns) {
    // Interleave: a then b each iteration so transient jitter is symmetric.
    const t0 = performance.now();
    fnA();
    aSamples.push(performance.now() - t0);

    const t1 = performance.now();
    fnB();
    bSamples.push(performance.now() - t1);

    iterations++;
    if (iterations >= minRuns && rse(aSamples) <= targetRSE && rse(bSamples) <= targetRSE) {
      stoppedEarly = true;
      break;
    }
  }

  const aStats = buildStats(aSamples);
  const bStats = buildStats(bSamples);

  return {
    stats: { [labelA]: aStats, [labelB]: bStats } as Record<A | B, SampleStats>,
    iterations,
    stoppedEarly,
    // ratio > 1 ⇒ a is faster than b (a.median is smaller).
    ratioMedian: aStats.median > 0 ? bStats.median / aStats.median : Infinity,
  };
}

/** Format helpers exported for diagnostics output in callers. */
export const fmt = {
  ms: (n: number) => `${n.toFixed(3)} ms`,
  pct: (n: number) =>
    Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : "n/a",
};
