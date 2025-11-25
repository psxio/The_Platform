import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  Users,
  Briefcase
} from "lucide-react";

interface TaskAnalytics {
  totalTasks: number;
  byStatus: Record<string, number>;
  byClient: Record<string, number>;
  byAssignee: Record<string, number>;
  overdueTasks: number;
  completedThisWeek: number;
  completionRate: number;
}

export function AnalyticsDashboard() {
  const { data: analytics, isLoading, error } = useQuery<TaskAnalytics>({
    queryKey: ["/api/analytics/tasks"],
  });

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-analytics-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load analytics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" data-testid={`skeleton-stat-${i}`} />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const statusColors: Record<string, string> = {
    "TO BE STARTED": "bg-slate-500",
    "IN PROGRESS": "bg-blue-500",
    "IN REVIEW": "bg-purple-500",
    "APPROVED": "bg-green-500",
    "COMPLETED": "bg-emerald-500",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.completedThisWeek} completed this week
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <Progress value={analytics.completionRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card data-testid="card-stat-overdue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{analytics.overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-in-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {analytics.byStatus["IN PROGRESS"] || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-status-breakdown">
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Tasks by current status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div key={status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${statusColors[status] || "bg-gray-500"}`}
                    style={{
                      width: `${analytics.totalTasks ? (count / analytics.totalTasks) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="card-team-workload">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Workload
            </CardTitle>
            <CardDescription>Tasks assigned per team member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.byAssignee).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No assigned tasks yet
              </p>
            ) : (
              Object.entries(analytics.byAssignee)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([assignee, count]) => (
                  <div key={assignee} className="flex items-center justify-between">
                    <span className="text-sm">{assignee}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{
                            width: `${
                              Math.max(
                                ...Object.values(analytics.byAssignee)
                              )
                                ? (count /
                                    Math.max(
                                      ...Object.values(analytics.byAssignee)
                                    )) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-client-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Client Overview
            </CardTitle>
            <CardDescription>Tasks by client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.byClient).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No clients assigned yet
              </p>
            ) : (
              Object.entries(analytics.byClient)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([client, count]) => (
                  <div key={client} className="flex items-center justify-between">
                    <span className="text-sm">{client}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-secondary"
                          style={{
                            width: `${
                              Math.max(
                                ...Object.values(analytics.byClient)
                              )
                                ? (count /
                                    Math.max(
                                      ...Object.values(analytics.byClient)
                                    )) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
