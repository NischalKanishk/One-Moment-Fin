import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Users,
  Target,
  Activity
} from "lucide-react";

interface TotalStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
}

interface WeeklyStatsCardProps {
  totalStats: TotalStats;
  loading?: boolean;
}

export function WeeklyStatsCard({ totalStats, loading = false }: WeeklyStatsCardProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Weekly Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate growth rates
  const weeklyGrowthRate = totalStats.total > 0 
    ? ((totalStats.thisWeek / totalStats.total) * 100)
    : 0;

  const monthlyGrowthRate = totalStats.total > 0 
    ? ((totalStats.thisMonth / totalStats.total) * 100)
    : 0;

  // Calculate weekly target (assuming 25% of total should come weekly)
  const weeklyTarget = Math.ceil(totalStats.total * 0.25);
  const weeklyProgress = totalStats.thisWeek / Math.max(weeklyTarget, 1) * 100;

  const stats = [
    {
      label: "This Week",
      value: totalStats.thisWeek,
      icon: Calendar,
      trend: weeklyGrowthRate,
      subtitle: `${weeklyGrowthRate.toFixed(1)}% of total`,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      label: "This Month", 
      value: totalStats.thisMonth,
      icon: Activity,
      trend: monthlyGrowthRate,
      subtitle: `${monthlyGrowthRate.toFixed(1)}% of total`,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      label: "All Time",
      value: totalStats.total,
      icon: Users,
      trend: null,
      subtitle: "Total leads generated",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
          <Badge 
            variant={weeklyProgress >= 100 ? "default" : "secondary"}
            className="text-xs"
          >
            {weeklyProgress >= 100 ? "Target Met" : "In Progress"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stats.map((stat, index) => (
            <div key={index} className={`p-4 rounded-lg ${stat.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="font-medium text-sm">{stat.label}</span>
                </div>
                {stat.trend !== null && (
                  <div className="flex items-center space-x-1">
                    {stat.trend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${
                      stat.trend > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(stat.trend).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.subtitle}</div>
            </div>
          ))}

          {/* Weekly Target Progress */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Weekly Target</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalStats.thisWeek} / {weeklyTarget}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  weeklyProgress >= 100 ? 'bg-green-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {weeklyProgress >= 100 
                ? `🎉 Exceeded target by ${(weeklyProgress - 100).toFixed(1)}%!`
                : `${(100 - weeklyProgress).toFixed(1)}% to reach weekly target`
              }
            </div>
          </div>

          {/* Quick Insights */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Quick Insights</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {totalStats.thisWeek > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                  <span>Added {totalStats.thisWeek} leads this week</span>
                </div>
              )}
              {totalStats.thisMonth > totalStats.thisWeek && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 rounded-full bg-green-500"></div>
                  <span>{totalStats.thisMonth - totalStats.thisWeek} leads from earlier this month</span>
                </div>
              )}
              {totalStats.total > totalStats.thisMonth && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                  <span>{totalStats.total - totalStats.thisMonth} leads from previous months</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
