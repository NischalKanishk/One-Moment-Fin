"use client";
import { useMemo } from "react";
import { computeSipForecast, toDecimalsFromPerc } from "@/lib/sip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, Save, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Simple currency formatter (₹ by default). Tweak as needed. */
const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

interface SipForecasterReadOnlyProps {
  monthlyInvestment: number;
  years: number;
  expectedAnnualReturnPct: number;
  inflationPct: number;
  currencyFormatter?: (n: number) => string;
  className?: string;
  onEdit?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  showEditButton?: boolean;
  showSaveButton?: boolean;
}

export default function SipForecasterReadOnly({
  monthlyInvestment,
  years,
  expectedAnnualReturnPct,
  inflationPct,
  currencyFormatter = fmtINR,
  className = "",
  onEdit,
  onSave,
  isSaving = false,
  showEditButton = true,
  showSaveButton = true,
}: SipForecasterReadOnlyProps) {
  const data = useMemo(() => {
    const payload = toDecimalsFromPerc({
      monthlyInvestment,
      years,
      expectedAnnualReturnPct,
      inflationPct,
    });
    const res = computeSipForecast(payload);
    // recharts expects plain objects
    return {
      fvNominal: res.fvNominal,
      fvReal: res.fvReal,
      yearly: res.yearly.map((d) => ({ year: d.year, Nominal: d.nominal, Real: d.real })),
    };
  }, [monthlyInvestment, years, expectedAnnualReturnPct, inflationPct]);

  return (
    <Card className={`p-6 space-y-6 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">SIP Forecast Summary</CardTitle>
              <p className="text-sm text-gray-600">Investment projection based on current parameters</p>
            </div>
          </div>
          <div className="flex gap-2">
            {showEditButton && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {showSaveButton && onSave && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Forecast'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Parameters Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-600">Monthly Investment</div>
            <div className="font-semibold text-gray-900">{currencyFormatter(monthlyInvestment)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Investment Period</div>
            <div className="font-semibold text-gray-900">{years} years</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Expected Return</div>
            <div className="font-semibold text-gray-900">{expectedAnnualReturnPct}% p.a.</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600">Inflation Rate</div>
            <div className="font-semibold text-gray-900">{inflationPct}% p.a.</div>
          </div>
        </div>

        {/* Results Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
            <div className="text-sm text-emerald-700 font-medium mb-1">Future Value (Nominal)</div>
            <div className="text-2xl font-bold text-emerald-800">{currencyFormatter(data.fvNominal)}</div>
            <div className="text-xs text-emerald-600 mt-1">Total value at maturity</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="text-sm text-blue-700 font-medium mb-1">Future Value (Real)</div>
            <div className="text-2xl font-bold text-blue-800">{currencyFormatter(data.fvReal)}</div>
            <div className="text-xs text-blue-600 mt-1">Inflation-adjusted value</div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <div className="text-sm text-gray-700 font-medium mb-1">Total Invested</div>
            <div className="text-2xl font-bold text-gray-800">{currencyFormatter(monthlyInvestment * years * 12)}</div>
            <div className="text-xs text-gray-600 mt-1">Principal amount</div>
          </div>
        </div>

        {/* Growth Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Growth Projection</h4>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-gray-600">Nominal Value</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-dashed"></div>
                <span className="text-gray-600">Real Value</span>
              </div>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={data.yearly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="year" 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tickFormatter={(v) => currencyFormatter(v as number)} 
                  width={90}
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(v: number) => currencyFormatter(v)}
                  labelFormatter={(y) => `Year ${y}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Nominal" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, fill: '#10b981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Real" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
