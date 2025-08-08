import { Helmet } from "react-helmet-async";
export default function Settings(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Settings – OneMFin</title>
        <meta name="description" content="Subscription, billing, team and integrations." />
      </Helmet>
      <div className="border rounded-lg p-4">Plan, usage & upgrade modal</div>
    </div>
  )
}
