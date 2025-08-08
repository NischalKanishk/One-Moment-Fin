import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const clients = [
  { name: "Rohit Sharma", risk: "Balanced", products: ["Balanced Growth", "Debt+"], invested: "₹5.0L", current: "₹5.6L", returns: "+12%", mix: "60/40" },
  { name: "Neha Gupta", risk: "Conservative", products: ["Income Fund"], invested: "₹2.2L", current: "₹2.3L", returns: "+5%", mix: "30/70" },
  { name: "Amit Patel", risk: "Aggressive", products: ["High Alpha Equity"], invested: "₹10.0L", current: "₹11.8L", returns: "+18%", mix: "85/15" },
];

export default function Portfolio(){
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Portfolio – OneMFin</title>
        <meta name="description" content="Holdings, NAV, allocation and AUM view with exports." />
        <link rel="canonical" href="/app/portfolio" />
      </Helmet>

      {/* Aggregate */}
      <div className="grid gap-4 md:grid-cols-3">
        {[{t:"Total Investment",v:"₹17.2L"},{t:"Current Value",v:"₹19.7L"},{t:"Overall Returns",v:"+14.5%"}].map((s)=> (
          <Card key={s.t} className="shadow-[var(--shadow-card)]"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{s.t}</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{s.v}</CardContent></Card>
        ))}
      </div>

      {/* Clients */}
      <div className="grid gap-4 md:grid-cols-3">
        {clients.map((c)=> (
          <Card key={c.name} className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-2"><CardTitle className="text-base">{c.name}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Risk: <Badge variant="secondary">{c.risk}</Badge></div>
              <div>Products: {c.products.join(", ")}</div>
              <div>Invested: {c.invested} • Current: {c.current} • Returns: {c.returns}</div>
              <div>Mix (Equity/Debt): {c.mix}</div>
              <div className="pt-2 space-x-2">
                <Button size="sm" variant="cta">Add New Investment</Button>
                <Button size="sm" variant="outline">Download Report</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
