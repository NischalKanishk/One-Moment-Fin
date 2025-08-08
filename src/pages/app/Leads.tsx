import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const rows = [
  {name:'Rohit Sharma', contact:'+91 90000 11111', age: 36, source:'Link', risk:'Balanced', meeting:'Scheduled', kyc:'Pending', value:'₹3.2L', notes:'Prefers SIP'},
  {name:'Nisha Verma', contact:'+91 90000 22222', age: 29, source:'Referral', risk:'Conservative', meeting:'Not set', kyc:'Not started', value:'₹0', notes:'New lead'},
  {name:'Amit Patel', contact:'+91 90000 33333', age: 41, source:'WhatsApp', risk:'Aggressive', meeting:'Done', kyc:'Complete', value:'₹12.4L', notes:'High equity'},
]

export default function Leads(){
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Leads – OneMFin</title>
        <meta name="description" content="Manage leads with filters, bulk actions and quick scheduling." />
      </Helmet>

      <div className="flex flex-col md:flex-row gap-3 items-center md:items-end">
        <div className="flex-1">
          <Input placeholder="Search leads…" />
        </div>
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="cons">Conservative</SelectItem>
            <SelectItem value="bal">Balanced</SelectItem>
            <SelectItem value="agg">Aggressive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">Export CSV</Button>
        <Button variant="cta">Send KYC link</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {['Name','Contact','Age','Source','Risk','Meeting','KYC','Portfolio','Notes','Actions'].map(h => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r)=> (
              <TableRow key={r.name} className="hover:bg-secondary/60">
                <TableCell className="font-medium"><a href="/app/leads/1" className="underline">{r.name}</a></TableCell>
                <TableCell>{r.contact}</TableCell>
                <TableCell>{r.age}</TableCell>
                <TableCell>{r.source}</TableCell>
                <TableCell><span className="px-2 py-0.5 text-xs rounded bg-secondary">{r.risk}</span></TableCell>
                <TableCell>{r.meeting}</TableCell>
                <TableCell>{r.kyc}</TableCell>
                <TableCell>{r.value}</TableCell>
                <TableCell className="text-muted-foreground">{r.notes}</TableCell>
                <TableCell className="space-x-2"><Button size="sm" variant="outline">Call</Button><Button size="sm" variant="outline">Meet</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
