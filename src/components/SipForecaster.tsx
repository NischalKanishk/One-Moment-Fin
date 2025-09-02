"use client";

import { useMemo, useState } from "react";
import { computeSipForecast, toDecimalsFromPerc } from "@/lib/sip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

/** Simple currency formatter (₹ by default). Tweak as needed. */
const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface SipForecasterProps {
  defaultMonthly?: number;
  defaultYears?: number;
  defaultReturnPct?: number;
  defaultInflationPct?: number;
  currencyFormatter?: (n: number) => string;
  className?: string;
  onSave?: (values: { monthly: number; years: number; returnPct: number; inflationPct: number }) => void;
  isSaving?: boolean;
  showSaveButton?: boolean;
}

export default function SipForecaster({
  defaultMonthly = 10000,
  defaultYears = 10,
  defaultReturnPct = 12,
  defaultInflationPct = 5,
  currencyFormatter = fmtINR,
  className = "",
  onSave,
  isSaving = false,
  showSaveButton = true,
}: SipForecasterProps) {
  const [monthly, setMonthly] = useState<number>(defaultMonthly);
  const [years, setYears] = useState<number>(defaultYears);
  const [retPct, setRetPct] = useState<number>(defaultReturnPct);
  const [inflPct, setInflPct] = useState<number>(defaultInflationPct);

  const data = useMemo(() => {
    const payload = toDecimalsFromPerc({
      monthlyInvestment: monthly,
      years,
      expectedAnnualReturnPct: retPct,
      inflationPct: inflPct,
    });
    const res = computeSipForecast(payload);
    // recharts expects plain objects
    return {
      fvNominal: res.fvNominal,
      fvReal: res.fvReal,
      yearly: res.yearly.map((d) => ({ year: d.year, Nominal: d.nominal, Real: d.real })),
    };
  }, [monthly, years, retPct, inflPct]);

  const handleSave = () => {
    if (onSave) {
      onSave({
        monthly,
        years,
        returnPct: retPct,
        inflationPct: inflPct,
      });
    }
  };

  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <span className="text-2xl">📈</span>
            SIP Forecaster
          </CardTitle>
          {showSaveButton && onSave && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? 'Saving...' : 'Save Forecast'}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Monthly Investment" suffix="₹">
            <Input
              type="number"
              inputMode="numeric"
              value={monthly}
              onChange={(e) => setMonthly(Math.max(0, Number(e.target.value || 0)))}
              className="text-lg"
            />
          </Field>

          <Field label="Investment Period (Years)">
            <div className="flex items-center gap-3">
              <div className="w-full">
                <Slider 
                  value={[years]} 
                  min={1} 
                  max={60} 
                  step={1} 
                  onValueChange={([v]) => setYears(v)} 
                  className="w-full"
                />
              </div>
              <Input 
                className="w-20 text-center" 
                type="number"
                value={years} 
                onChange={(e) => setYears(Math.max(1, Math.min(60, Number(e.target.value || 1))))} 
              />
            </div>
          </Field>

          <Field label="Expected Annual Return (%)">
            <div className="flex items-center gap-3">
              <div className="w-full">
                <Slider 
                  value={[retPct]} 
                  min={0} 
                  max={30} 
                  step={0.5} 
                  onValueChange={([v]) => setRetPct(v)} 
                  className="w-full"
                />
              </div>
              <Input 
                className="w-24 text-center" 
                type="number"
                step="0.1"
                value={retPct} 
                onChange={(e) => setRetPct(Math.max(0, Math.min(30, Number(e.target.value || 0))))} 
              />
            </div>
          </Field>

          <Field label="Inflation Rate (%)">
            <div className="flex items-center gap-3">
              <div className="w-full">
                <Slider 
                  value={[inflPct]} 
                  min={0} 
                  max={15} 
                  step={0.5} 
                  onValueChange={([v]) => setInflPct(v)} 
                  className="w-full"
                />
              </div>
              <Input 
                className="w-24 text-center" 
                type="number"
                step="0.1"
                value={inflPct} 
                onChange={(e) => setInflPct(Math.max(0, Math.min(15, Number(e.target.value || 0))))} 
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard 
            title="Future Value (Nominal)" 
            value={currencyFormatter(data.fvNominal)}
            subtitle="Before inflation adjustment"
            className="bg-blue-50 border-blue-200"
          />
          <StatCard 
            title="Future Value (Real)" 
            value={currencyFormatter(data.fvReal)}
            subtitle="After inflation adjustment"
            className="bg-green-50 border-green-200"
          />
          <StatCard 
            title="Total Invested" 
            value={currencyFormatter(monthly * years * 12)}
            subtitle="Principal amount"
            className="bg-gray-50 border-gray-200"
          />
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-medium">Investment Growth Over Time</h4>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.yearly} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#666' }}
                />
                <YAxis 
                  tickFormatter={(v) => currencyFormatter(v as number)} 
                  width={100}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#666' }}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    currencyFormatter(v), 
                    name === 'Nominal' ? 'Nominal Value' : 'Real Value (Inflation Adjusted)'
                  ]}
                  labelFormatter={(y) => `Year ${y}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Nominal" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={false}
                  name="Nominal Value"
                />
                <Line 
                  type="monotone" 
                  dataKey="Real" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Real Value"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">{label}{suffix ? ` (${suffix})` : ""}</Label>
      {children}
    </div>
  );
}

function StatCard({ title, value, subtitle, className = "" }: { 
  title: string; 
  value: string; 
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <div className="text-sm text-muted-foreground mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );
}
