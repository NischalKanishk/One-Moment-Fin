import { Helmet } from "react-helmet-async";

export default function FormBuilder(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Public Lead Form – OneMFin</title>
        <meta name="description" content="Build your lead form, reorder questions and preview the public link." />
      </Helmet>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">Form builder (drag to reorder, field types)</div>
        <div className="border rounded-lg p-4 bg-secondary">Live preview (desktop & mobile)</div>
      </div>
    </div>
  )
}
