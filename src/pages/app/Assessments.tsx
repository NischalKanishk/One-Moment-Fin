import { Helmet } from "react-helmet-async";
export default function Assessments(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Assessment Builder – OneMFin</title>
        <meta name="description" content="Create and edit risk assessments with AI generation." />
      </Helmet>
      <div className="border rounded-lg p-4">Assessment templates and editor</div>
    </div>
  )
}
