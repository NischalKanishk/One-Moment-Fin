import { Helmet } from "react-helmet-async";
export default function Admin(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Admin Console – OneMFin</title>
        <meta name="description" content="Metrics, user management and plan control." />
      </Helmet>
      <div className="border rounded-lg p-4">Admin metrics & controls</div>
    </div>
  )
}
