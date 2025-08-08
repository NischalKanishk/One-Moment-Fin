import { Helmet } from "react-helmet-async";
import { DayPicker } from "react-day-picker";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const meetings = [
  { title: "Call with Akash", date: "Aug 12, 3 PM", where: "Google Meet", source: "Google", status: "Upcoming" },
  { title: "Follow-up with Tina", date: "Aug 10, 11 AM", where: "Phone", source: "Manual", status: "Completed" },
];

export default function Meetings(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Meetings – OneMFin</title>
        <meta name="description" content="Calendar and agenda view with booking flow." />
        <link rel="canonical" href="/app/meetings" />
      </Helmet>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Calendar</CardTitle></CardHeader>
          <CardContent>
            <DayPicker mode="single" />
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Agenda</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {meetings.map((m) => (
              <div key={m.title} className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-sm text-muted-foreground">{m.date} • {m.where} • Source: {m.source}</div>
                  </div>
                  <Badge variant={m.status === 'Upcoming' ? 'secondary' : 'default'}>{m.status}</Badge>
                </div>
                <div className="mt-3 space-x-2">
                  <Button size="sm" variant="outline">Reschedule</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                  <Button size="sm" variant="cta">Notes</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
