import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

interface Question {
  id: string;
  label: string;
  type: "text" | "number" | "mcq" | "dropdown" | "scale";
  options?: string[];
}

const defaultQuestions: Question[] = [
  { id: "q1", label: "Investment horizon", type: "dropdown", options: ["< 1 year", "1–3 years", "> 3 years"] },
  { id: "q2", label: "Risk appetite", type: "mcq", options: ["Low", "Medium", "High"] },
  { id: "q3", label: "Monthly investable amount (₹)", type: "number" },
  { id: "q4", label: "Experience with equities", type: "mcq", options: ["New", "Some", "Experienced"] },
  { id: "q5", label: "Comfort with short-term volatility", type: "scale", options: ["1","2","3","4","5"] },
];

export default function Assessments() {
  const [questions, setQuestions] = useState<Question[]>(defaultQuestions);
  const [aiOn, setAiOn] = useState(true);

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    const n = { id: `q${Date.now()}`, label: "New question", type: "text" as const };
    setQuestions((qs) => [...qs, n]);
  };

  return (
    <div className="space-y-4">
      <Helmet>
        <title>Assessment Builder – OneMFin</title>
        <meta name="description" content="Create and edit risk assessments with AI generation." />
        <link rel="canonical" href="/app/assessments" />
      </Helmet>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Switch checked={aiOn} onCheckedChange={setAiOn} id="ai-logic" />
          <label htmlFor="ai-logic" className="text-sm">AI Risk Logic — {aiOn ? "On" : "Off"}</label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Save Template</Button>
          <Button variant="cta">Publish to Live Link</Button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Builder */}
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Questions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="border rounded-md p-3 space-y-2">
                <Input value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} />
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={q.type} onValueChange={(v: Question["type"]) => updateQuestion(q.id, { type: v })}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Field type" /></SelectTrigger>
                    <SelectContent className="z-50 bg-popover">
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="mcq">MCQ</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="scale">Scale (1–5)</SelectItem>
                    </SelectContent>
                  </Select>
                  {(q.type === "mcq" || q.type === "dropdown") && (
                    <Textarea
                      placeholder="Comma-separated options"
                      value={(q.options || []).join(", ")}
                      onChange={(e) => updateQuestion(q.id, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="bg-secondary/50 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2"><CardTitle className="text-base">Live preview</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="space-y-1">
                  <label className="text-sm text-muted-foreground">{q.label}</label>
                  {q.type === "text" && <Input placeholder="Type here" />}
                  {q.type === "number" && <Input type="number" placeholder="0" />}
                  {q.type === "mcq" && (
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {(q.options || []).map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {q.type === "dropdown" && (
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent className="z-50 bg-popover">
                        {(q.options || []).map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  )}
                  {q.type === "scale" && (
                    <div className="flex gap-2">
                      {(q.options || ["1","2","3","4","5"]).map((o) => (
                        <Button key={o} type="button" variant="outline" size="sm">{o}</Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </form>
          </CardContent>
        </Card>
      </div>

      <Button onClick={addQuestion} size="lg" variant="cta" className="fixed bottom-6 right-6 shadow-[var(--shadow-card)]"><Plus className="mr-2 h-4 w-4" />Add question</Button>
    </div>
  );
}
