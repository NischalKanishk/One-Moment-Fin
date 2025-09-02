import { describe, expect, it } from "vitest";
import { fvSip, realAnnualRate, computeSipForecast, toDecimalsFromPerc } from "./sip";

describe("SIP math", () => {
  it("handles zero rate as simple sum of contributions", () => {
    const fv = fvSip(1000, 0, 2); // 24 months * 1000
    expect(fv).toBe(24000);
  });

  it("computes future value with positive rate", () => {
    const fv = fvSip(10000, 0.12, 10);
    // sanity bounds (should be around 23L for ₹10k/10y/12%)
    expect(fv).toBeGreaterThan(20_00_000);
    expect(fv).toBeLessThan(30_00_000);
  });

  it("computes real rate from nominal & inflation", () => {
    const rr = realAnnualRate(0.12, 0.05);
    expect(rr).toBeCloseTo((1.12 / 1.05) - 1, 10);
  });

  it("computeSipForecast returns yearly series", () => {
    const input = toDecimalsFromPerc({
      monthlyInvestment: 10000,
      years: 5,
      expectedAnnualReturnPct: 10,
      inflationPct: 5,
    });
    const out = computeSipForecast(input);
    expect(out.yearly.length).toBe(5);
    expect(out.fvNominal).toBeGreaterThan(out.fvReal);
  });

  it("handles edge case of very small rates", () => {
    const fv = fvSip(1000, 0.0001, 1);
    expect(fv).toBeGreaterThan(12000); // Should be close to 12 * 1000
    expect(fv).toBeLessThan(13000);
  });

  it("validates input schema correctly", () => {
    expect(() => {
      computeSipForecast({
        monthlyInvestment: -1000, // negative should fail
        years: 10,
        expectedAnnualReturn: 0.12,
        inflation: 0.05
      });
    }).toThrow();

    expect(() => {
      computeSipForecast({
        monthlyInvestment: 1000,
        years: 0, // zero years should fail
        expectedAnnualReturn: 0.12,
        inflation: 0.05
      });
    }).toThrow();
  });

  it("converts percentage inputs to decimals correctly", () => {
    const input = toDecimalsFromPerc({
      monthlyInvestment: 10000,
      years: 10,
      expectedAnnualReturnPct: 12,
      inflationPct: 5,
    });

    expect(input.monthlyInvestment).toBe(10000);
    expect(input.years).toBe(10);
    expect(input.expectedAnnualReturn).toBe(0.12);
    expect(input.inflation).toBe(0.05);
  });
});
