import { Helmet } from "react-helmet-async";
export default function Meetings(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Meetings – OneMFin</title>
        <meta name="description" content="Calendar and agenda view with booking flow." />
      </Helmet>
      <div className="border rounded-lg p-4">Calendar & meeting list</div>
    </div>
  )
}
