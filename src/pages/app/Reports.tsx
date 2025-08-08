import { Helmet } from "react-helmet-async";
export default function Reports(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Reports – OneMFin</title>
        <meta name="description" content="Quarterly report templates with AUM trend, conversion funnel and exports." />
      </Helmet>
      <div className="border rounded-lg p-4">Reporting dashboard & PDF export</div>
    </div>
  )
}
