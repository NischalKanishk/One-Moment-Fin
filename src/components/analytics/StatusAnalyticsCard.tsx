import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";

interface StatusAnalytics {
  lead: number;
  assessment_done: number;
  meeting_scheduled: number;
  converted: number;
  dropped: number;
  halted?: number;
  rejected?: number;
}

interface StatusAnalyticsCardProps {
  statusAnalytics: StatusAnalytics;
  loading?: boolean;
  viewType?: 'pie' | 'bar' | 'progress';
}

const statusConfig = {
  lead: { label: 'New Leads', color: '#3B82F6', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  assessment_done: { label: 'Assessed', color: '#10B981', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  meeting_scheduled: { label: 'Meetings', color: '#F59E0B', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  converted: { label: 'Converted', color: '#8B5CF6', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  dropped: { label: 'Dropped', color: '#EF4444', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  halted: { label: 'Halted', color: '#6B7280', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
  rejected: { label: 'Rejected', color: '#DC2626', bgColor: 'bg-red-200', textColor: 'text-red-900' },
};

export function StatusAnalyticsCard({ statusAnalytics, loading = false, viewType = 'pie' }: StatusAnalyticsCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Lead Status Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = Object.values(statusAnalytics).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Lead Status Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-2">No data available</div>
            <p className="text-sm text-muted-foreground">Add some leads to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for charts
  const chartData = Object.entries(statusAnalytics)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      name: statusConfig[status as keyof StatusAnalytics]?.label || status,
      value: count,
      color: statusConfig[status as keyof StatusAnalytics]?.color || '#6B7280',
      status
    }));

  const renderPieChart = () => (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [value, name]}
            labelStyle={{ color: '#374151' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value) => <span className="text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const renderBarChart = () => (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            formatter={(value, name) => [value, name]}
            labelStyle={{ color: '#374151' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const renderProgressView = () => (
    <div className="space-y-4">
      {Object.entries(statusAnalytics)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => {
          const config = statusConfig[status as keyof StatusAnalytics];
          const percentage = (count / total) * 100;
          
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={`text-xs px-2 py-1 ${config?.bgColor} ${config?.textColor}`}>
                    {config?.label || status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {count} leads ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <span className="font-semibold text-sm">{count}</span>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                style={{ 
                  background: `linear-gradient(to right, ${config?.color} ${percentage}%, #E5E7EB ${percentage}%)`
                }}
              />
            </div>
          );
        })}
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Lead Status Analytics</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {total} Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {viewType === 'pie' && renderPieChart()}
        {viewType === 'bar' && renderBarChart()}
        {viewType === 'progress' && renderProgressView()}
        
        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {((statusAnalytics.converted / total) * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Conversion Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {statusAnalytics.assessment_done + statusAnalytics.meeting_scheduled}
              </div>
              <div className="text-xs text-muted-foreground">Active Pipeline</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
