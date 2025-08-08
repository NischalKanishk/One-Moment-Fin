import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const base = [
  { name: "Balanced Growth Fund", fit: "Medium", returns: "10-12%", by: "AI" },
  { name: "Conservative Income Fund", fit: "Low", returns: "6-7%", by: "AI" },
  { name: "High Alpha Equity", fit: "High", returns: "14-16%", by: "User" },
];

export default function Products() {
  const [aiMode, setAiMode] = useState(true);

  const AddRow = () => (
    <div className="flex flex-wrap items-center gap-2 border rounded-md p-3 mb-3">
      <Input placeholder="Product name" className="min-w-[200px]" />
      <Select>
        <SelectTrigger className="w-36"><SelectValue placeholder="Risk fit" /></SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="High">High</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Suggested returns %" className="w-40" />
      <Button variant="outline">Add product</Button>
    </div>
  );

  const TableBy = ({ level }: { level: "Low" | "Medium" | "High" }) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {["Product Name","Risk Fit","Suggested Returns","Created by","Actions"].map(h => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {base.filter(b => b.fit === level || level === "Medium").map((p) => (
            <TableRow key={p.name} className="hover:bg-secondary/60">
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell>{p.fit}</TableCell>
              <TableCell>{p.returns}</TableCell>
              <TableCell>{p.by}</TableCell>
              <TableCell className="space-x-2">
                <Button size="sm" variant="outline">Attach to Lead</Button>
                <Button size="sm" variant="cta">Send to Client</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Product Suggester – OneMFin</title>
        <meta name="description" content="Catalog of products with AI match score and risk mapping." />
        <link rel="canonical" href="/app/products" />
      </Helmet>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">Mode: <strong>{aiMode ? "AI" : "Manual"}</strong></div>
        <div className="flex items-center gap-2">
          <Switch checked={aiMode} onCheckedChange={setAiMode} id="ai-mode" />
          <label htmlFor="ai-mode" className="text-sm">AI/manual</label>
        </div>
      </div>

      <AddRow />

      <Tabs defaultValue="Medium">
        <TabsList>
          <TabsTrigger value="Low">Low Risk</TabsTrigger>
          <TabsTrigger value="Medium">Medium Risk</TabsTrigger>
          <TabsTrigger value="High">High Risk</TabsTrigger>
        </TabsList>
        <TabsContent value="Low"><TableBy level="Low" /></TabsContent>
        <TabsContent value="Medium"><TableBy level="Medium" /></TabsContent>
        <TabsContent value="High"><TableBy level="High" /></TabsContent>
      </Tabs>
    </div>
  );
}
