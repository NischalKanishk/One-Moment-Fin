import { Helmet } from "react-helmet-async";
export default function Portfolio(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Portfolio – OneMFin</title>
        <meta name="description" content="Holdings, NAV, allocation and AUM view with exports." />
      </Helmet>
      <div className="border rounded-lg p-4">Portfolio tables & allocation charts</div>
    </div>
  )
}
