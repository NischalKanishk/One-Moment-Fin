import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AssessmentComplete() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center shadow-xl">
        <CardHeader className="pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">
            Assessment Complete!
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Thank you for completing the risk assessment. Our team will analyze your responses 
            and get back to you with personalized investment recommendations.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>What happens next?</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 text-left">
              <li>• We'll review your assessment</li>
              <li>• Generate personalized recommendations</li>
              <li>• Contact you within 24-48 hours</li>
            </ul>
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={() => navigate("/")}
              className="w-full"
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            Redirecting automatically in {countdown} seconds...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
