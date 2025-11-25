import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContentTask, Campaign } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  Flag,
  TrendingUp,
  Calendar,
  ListTodo,
  Target
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from "@/lib/utils";

function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "COMPLETED") return false;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  } catch {
    return false;
  }
}

function isDueSoon(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "COMPLETED") return false;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due >= today && due <= threeDaysFromNow;
  } catch {
    return false;
  }
}

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({ title, value, description, icon, className }: StatCardProps) {
  return (
    <Card className={className} data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_COLORS: Record<string, string> = {
  "TO BE STARTED": "#94a3b8",
  "IN PROGRESS": "#3b82f6",
  "COMPLETED": "#22c55e",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#94a3b8",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

export function AnalyticsDashboard() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const stats = useMemo(() => {
    if (!tasks) return null;

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === "COMPLETED").length;
    const inProgress = tasks.filter(t => t.status === "IN PROGRESS").length;
    const toBeStarted = tasks.filter(t => t.status === "TO BE STARTED").length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    const dueSoon = tasks.filter(t => isDueSoon(t.dueDate, t.status)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const byStatus = [
      { name: "To Be Started", value: toBeStarted, fill: STATUS_COLORS["TO BE STARTED"] },
      { name: "In Progress", value: inProgress, fill: STATUS_COLORS["IN PROGRESS"] },
      { name: "Completed", value: completed, fill: STATUS_COLORS["COMPLETED"] },
    ].filter(s => s.value > 0);

    const priorityCount: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    tasks.forEach(t => {
      const p = (t.priority || "medium") as string;
      if (p in priorityCount) priorityCount[p]++;
    });

    const byPriority = Object.entries(priorityCount)
      .filter(([_, count]) => count > 0)
      .map(([priority, count]) => ({
        name: priority.charAt(0).toUpperCase() + priority.slice(1),
        value: count,
        fill: PRIORITY_COLORS[priority],
      }));

    const assigneeCounts: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.assignedTo) {
        assigneeCounts[t.assignedTo] = (assigneeCounts[t.assignedTo] || 0) + 1;
      }
    });

    const byAssignee = Object.entries(assigneeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.split(' ')[0], fullName: name, count }));

    const clientCounts: Record<string, number> = {};
    tasks.forEach(t => {
      if (t.client) {
        clientCounts[t.client] = (clientCounts[t.client] || 0) + 1;
      }
    });

    const byClient = Object.entries(clientCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const campaignStats = campaigns?.map(campaign => {
      const campaignTasks = tasks.filter(t => t.campaignId === campaign.id);
      const campaignCompleted = campaignTasks.filter(t => t.status === "COMPLETED").length;
      const progress = campaignTasks.length > 0 
        ? Math.round((campaignCompleted / campaignTasks.length) * 100) 
        : 0;
      return {
        name: campaign.name,
        total: campaignTasks.length,
        completed: campaignCompleted,
        progress,
      };
    }) || [];

    return {
      total,
      completed,
      inProgress,
      toBeStarted,
      overdue,
      dueSoon,
      completionRate,
      byStatus,
      byPriority,
      byAssignee,
      byClient,
      campaignStats,
    };
  }, [tasks, campaigns]);

  if (tasksLoading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="analytics-dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tasks"
          value={stats.total}
          description={`${campaigns?.length || 0} campaigns`}
          icon={<ListTodo className="w-4 h-4" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          description={`${stats.completed} of ${stats.total} completed`}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          description="Tasks being worked on"
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          description={`${stats.dueSoon} due soon`}
          icon={<AlertTriangle className="w-4 h-4" />}
          className={stats.overdue > 0 ? "border-destructive/50" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-status-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Task Status Distribution
            </CardTitle>
            <CardDescription>
              Overview of tasks by current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {stats.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No task data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-priority-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Priority Breakdown
            </CardTitle>
            <CardDescription>
              Tasks organized by priority level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byPriority.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.byPriority} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {stats.byPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No priority data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-team-workload">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Tasks by Team Member
            </CardTitle>
            <CardDescription>
              Workload distribution across assignees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byAssignee.length > 0 ? (
              <div className="space-y-3">
                {stats.byAssignee.map((assignee, index) => {
                  const maxCount = stats.byAssignee[0]?.count || 1;
                  const percentage = (assignee.count / maxCount) * 100;
                  
                  return (
                    <div key={index} className="space-y-1" data-testid={`assignee-bar-${index}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]" title={assignee.fullName}>
                          {assignee.fullName}
                        </span>
                        <Badge variant="secondary">{assignee.count}</Badge>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No assigned tasks yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-client-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Tasks by Client
            </CardTitle>
            <CardDescription>
              Distribution of tasks across clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byClient.length > 0 ? (
              <div className="space-y-3">
                {stats.byClient.map((client, index) => {
                  const maxCount = stats.byClient[0]?.count || 1;
                  const percentage = (client.count / maxCount) * 100;
                  
                  return (
                    <div key={index} className="space-y-1" data-testid={`client-bar-${index}`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[200px]">{client.name}</span>
                        <Badge variant="secondary">{client.count}</Badge>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No client data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.campaignStats.length > 0 && (
        <Card data-testid="card-campaign-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Campaign Progress
            </CardTitle>
            <CardDescription>
              Completion progress for each campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-4">
                {stats.campaignStats.map((campaign, index) => (
                  <div key={index} className="space-y-2" data-testid={`campaign-progress-${index}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {campaign.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {campaign.completed}/{campaign.total}
                        </span>
                        <Badge variant={campaign.progress === 100 ? "default" : "secondary"}>
                          {campaign.progress}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={campaign.progress} className="h-2" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-quick-summary">
        <CardHeader>
          <CardTitle>Quick Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <div className="text-3xl font-bold text-muted-foreground">{stats.toBeStarted}</div>
              <div className="text-sm text-muted-foreground">Not Started</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <div className="text-3xl font-bold text-primary">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-500/10">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className={cn(
              "text-center p-4 rounded-lg",
              stats.overdue > 0 ? "bg-destructive/10" : "bg-muted/30"
            )}>
              <div className={cn(
                "text-3xl font-bold",
                stats.overdue > 0 ? "text-destructive" : "text-muted-foreground"
              )}>{stats.overdue}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
