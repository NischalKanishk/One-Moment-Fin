import { z } from "zod";

/** ========= Types & Validation ========= */
export const SipInputSchema = z.object({
  monthlyInvestment: z.number().positive().max(10_00_00_000), // up to ₹10Cr/month
  years: z.number().int().min(1).max(60),
  expectedAnnualReturn: z.number().min(0).max(1), // decimal e.g. 0.12 for 12%
  inflation: z.number().min(0).max(1).default(0), // decimal
});

export type SipInput = z.infer<typeof SipInputSchema>;

export type YearPoint = { year: number; nominal: number; real: number };

export type SipForecast = {
  input: SipInput;
  fvNominal: number;
  fvReal: number;
  yearly: YearPoint[];
};

/** ========= Helpers ========= */
function toMonthlyRate(annual: number) {
  return annual / 12;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Future value of SIP with monthly contribution P, annual rate r, years n.
 * FV = P * [((1+i)^m - 1)/i] * (1+i) where i = r/12, m = 12*n
 * Edge: if i ~ 0, FV = P * m
 */
export function fvSip(monthlyInvestment: number, annualReturn: number, years: number) {
  const m = Math.max(0, Math.floor(years * 12));
  const i = toMonthlyRate(annualReturn);
  if (Math.abs(i) < 1e-12) return monthlyInvestment * m;
  const factor = (Math.pow(1 + i, m) - 1) / i;
  return monthlyInvestment * factor * (1 + i);
}

/** Convert nominal annual to real (inflation-adjusted) annual */
export function realAnnualRate(nominal: number, inflation: number) {
  return (1 + nominal) / (1 + inflation) - 1;
}

/** Yearly projection (1..years) for charting */
export function projectSipYearly(input: SipInput): YearPoint[] {
  const { monthlyInvestment, years, expectedAnnualReturn, inflation } = input;
  const rReal = realAnnualRate(expectedAnnualReturn, inflation);
  const out: YearPoint[] = [];
  for (let y = 1; y <= years; y++) {
    const nominal = fvSip(monthlyInvestment, expectedAnnualReturn, y);
    const real = fvSip(monthlyInvestment, rReal, y);
    out.push({ year: y, nominal: round2(nominal), real: round2(real) });
  }
  return out;
}

/** Main compute function */
export function computeSipForecast(raw: unknown): SipForecast {
  const input = SipInputSchema.parse(raw);
  const fvNominal = round2(fvSip(input.monthlyInvestment, input.expectedAnnualReturn, input.years));
  const fvReal = round2(fvSip(input.monthlyInvestment, realAnnualRate(input.expectedAnnualReturn, input.inflation), input.years));
  const yearly = projectSipYearly(input);
  return { input, fvNominal, fvReal, yearly };
}

/** Convenience: percent inputs to decimals */
export function toDecimalsFromPerc({
  monthlyInvestment,
  years,
  expectedAnnualReturnPct,
  inflationPct = 0,
}: {
  monthlyInvestment: number;
  years: number;
  expectedAnnualReturnPct: number; // 12 -> 0.12
  inflationPct?: number;
}): SipInput {
  return {
    monthlyInvestment,
    years,
    expectedAnnualReturn: expectedAnnualReturnPct / 100,
    inflation: inflationPct / 100,
  };
}
