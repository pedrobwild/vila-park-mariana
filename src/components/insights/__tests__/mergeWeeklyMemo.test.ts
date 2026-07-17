import { describe, it, expect, beforeEach } from "vitest";
import {
  mergeWeekly,
  __memoInternals,
  type BrokerSeries,
} from "../MultiBrokerWeeklySparkline";

const { memoizedMergeWeekly, buildSeriesSignature, clear } = __memoInternals;

function makeSeries(): BrokerSeries[] {
  return [
    {
      name: "Amanda",
      weekly: [
        { weekStart: "2025-01-06", label: "06/01", meetings: 4, avgScore: 70 },
        { weekStart: "2025-01-13", label: "13/01", meetings: 6, avgScore: 75 },
      ],
    },
    {
      name: "Rodrigo",
      weekly: [
        { weekStart: "2025-01-06", label: "06/01", meetings: 3, avgScore: 80 },
        { weekStart: "2025-01-13", label: "13/01", meetings: 0, avgScore: 0 },
      ],
    },
  ];
}

describe("memoizedMergeWeekly", () => {
  beforeEach(() => clear());

  it("returns the SAME reference when called with the same array reference", () => {
    const series = makeSeries();
    const a = memoizedMergeWeekly(series);
    const b = memoizedMergeWeekly(series);
    expect(a).toBe(b); // ref-equality cache hit
  });

  it("returns the SAME reference when called with a new array but identical content", () => {
    const a = memoizedMergeWeekly(makeSeries());
    const b = memoizedMergeWeekly(makeSeries()); // fresh array, same data
    expect(a).toBe(b); // signature cache hit
  });

  it("returns a NEW result when broker data actually changes", () => {
    const s1 = makeSeries();
    const a = memoizedMergeWeekly(s1);

    const s2 = makeSeries();
    s2[0].weekly![0].meetings = 99; // mutate one value
    const b = memoizedMergeWeekly(s2);

    expect(a).not.toBe(b);
    expect(b).toEqual(mergeWeekly(s2));
  });

  it("returns a NEW result when a broker's name changes", () => {
    const s1 = makeSeries();
    const a = memoizedMergeWeekly(s1);

    const s2 = makeSeries();
    s2[1].name = "Outro Corretor";
    const b = memoizedMergeWeekly(s2);

    expect(a).not.toBe(b);
  });

  it("produces output identical to the non-memoized mergeWeekly", () => {
    const series = makeSeries();
    expect(memoizedMergeWeekly(series)).toEqual(mergeWeekly(series));
  });

  it("buildSeriesSignature is stable and content-addressable", () => {
    const sig1 = buildSeriesSignature(makeSeries());
    const sig2 = buildSeriesSignature(makeSeries());
    expect(sig1).toBe(sig2);

    const mutated = makeSeries();
    mutated[0].weekly![0].avgScore = 71;
    expect(buildSeriesSignature(mutated)).not.toBe(sig1);
  });
});
