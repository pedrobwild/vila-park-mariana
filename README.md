# Welcome to your Lovable project

TODO: Document your project here

## Performance test tuning — `mergeWeekly`

The chart-data merge function powering `MultiBrokerWeeklySparkline` has an
adaptive performance test that measures per-call timing (median of N samples)
across three dataset sizes — `small`, `medium`, `large` — and asserts both a
hard per-call budget AND a minimum speedup vs. the naïve baseline.

The sampler interleaves both implementations per iteration and keeps adding
samples until the relative standard error (RSE) stabilizes, so it is
naturally resilient to GC pauses and OS scheduler noise. When CI runners
are slower than usual you can still raise the limits via env vars instead
of weakening the test code.

### Env vars

| Variable                         | What it controls                                          | Local default | CI default |
| -------------------------------- | --------------------------------------------------------- | ------------- | ---------- |
| `MERGE_WEEKLY_PERF_BUDGET_MS`    | Per-call median ceiling (ms) — applies to **every** size  | per-size¹     | per-size¹  |
| `MERGE_WEEKLY_PERF_RATIO`        | Required `naive ÷ optimized` median speedup, all sizes    | `1.20`        | `1.05`     |
| `MERGE_WEEKLY_PERF_RUNS`         | Iteration count (legacy — alias for `_MIN_RUNS`)          | `12`          | `12`       |
| `MERGE_WEEKLY_PERF_MIN_RUNS`     | Floor on iterations before convergence is checked         | `12`          | `12`       |
| `MERGE_WEEKLY_PERF_MAX_RUNS`     | Hard cap on iterations                                    | `80`          | `120`      |
| `MERGE_WEEKLY_PERF_TARGET_RSE`   | RSE considered "stable" (e.g. `0.05` = 5%)                | `0.05`        | `0.07`     |
| `VERBOSE=1`                      | Always print the per-size diagnostics block, even on pass | off           | off        |

¹ Per-size budgets (override individually with `MERGE_WEEKLY_PERF_BUDGET_MS_SMALL`, `_MEDIUM`, `_LARGE`):

| Size   | W × B      | Local budget | CI budget | Min speedup (local / CI) |
| ------ | ---------- | ------------ | --------- | ------------------------ |
| small  | 25 × 3     | 5 ms         | 15 ms     | 1.05× / 1.00×            |
| medium | 150 × 6    | 20 ms        | 60 ms     | 1.20× / 1.05×            |
| large  | 800 × 12   | 75 ms        | 200 ms    | 1.20× / 1.05×            |

### Recommended values

**Local development** — leave defaults as-is. The 1.20× speedup gate and tight
budgets are deliberately strict so a real algorithmic regression (e.g. an
accidental return to `O(W·B·P)` per-row scans) fails loudly.

**Standard CI runners** (GitHub Actions, GitLab shared runners): defaults
already auto-relax when `CI=true` is set in the environment. No overrides
needed in most cases.

**Slow / shared CI runners** — if the `large` bucket flakes occasionally
without any code change, raise its ceiling rather than the global one:

```sh
MERGE_WEEKLY_PERF_BUDGET_MS_LARGE=350 npm test
```

**Reproducing a CI failure locally**:

```sh
CI=true VERBOSE=1 npm test -- mergeWeekly
```

### Manual benchmark

For ad-hoc regression hunting outside the test runner:

```sh
npm run bench:merge-weekly
# or with custom config:
BENCH_RUNS=50 BENCH_WEEKS=1200 BENCH_BROKERS=16 npm run bench:merge-weekly
```

Reports avg / p50 / p95 / min / max timings, ops/s, output size, and the
optimized-vs-naive speedup ratio. Exits non-zero on shape divergence or a
sub-1× ratio.
