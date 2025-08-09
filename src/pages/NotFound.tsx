import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();



  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-5xl font-semibold mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Oops! Page not found</p>
        <a href="/" className="inline-flex items-center px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
