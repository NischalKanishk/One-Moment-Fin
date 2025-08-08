import { Helmet } from "react-helmet-async";
export default function Products(){
  return (
    <div className="space-y-4">
      <Helmet>
        <title>Product Suggester – OneMFin</title>
        <meta name="description" content="Catalog of products with AI match score and risk mapping." />
      </Helmet>
      <div className="border rounded-lg p-4">Product cards & risk mapping UI</div>
    </div>
  )
}
