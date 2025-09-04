import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function Meetings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Meeting Management
          </h1>
          <p className="text-lg text-gray-600">
            Professional meeting scheduling and management for your financial advisory business
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-800">
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-700 text-lg">
              We are actively building new features to include on our platform. We will keep you posted once we launch it.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
