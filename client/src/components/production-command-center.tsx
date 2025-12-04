import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Activity,
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  TrendingUp,
  Calendar,
  FileCheck,
  Zap,
  Target,
  BarChart3,
  ArrowUpRight,
  Circle,
  Timer,
  PlayCircle,
  PauseCircle,
  Rocket,
  RefreshCw,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface TeamMember {
  id: number;
  userId?: string | null;
  person: string;
  skill: string | null;
  email?: string | null;
  evmAddress?: string | null;
  client?: string | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
  isScreenSharing?: boolean;
}

interface ContentTask {
  id: number;
  description: string;
  title?: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  dueDate: string | null;
  client?: string | null;
  clientType?: string | null;
  contentType: string | null;
  campaignId: number | null;
  estimatedHours: number | null;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Campaign {
  id: number;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  taskCount?: number;
  completedTasks?: number;
}

interface Deliverable {
  id: number;
  title: string;
  taskId: number;
  status: string;
  createdAt: string;
}

interface ActivityLog {
  id: number;
  taskId: number | null;
  userId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

const normalizeStatus = (status: string): string => 
  status.toUpperCase().replace(/[-_]/g, ' ');

const statusColors: { [key: string]: string } = {
  "PENDING": "bg-amber-500",
  "IN PROGRESS": "bg-blue-500",
  "TO BE STARTED": "bg-slate-400",
  "REVIEW": "bg-purple-500",
  "IN REVIEW": "bg-purple-500",
  "COMPLETED": "bg-emerald-500",
  "BLOCKED": "bg-destructive",
};

const getStatusColor = (status: string): string => 
  statusColors[normalizeStatus(status)] || "bg-muted";

const priorityConfig = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  high: { label: "High", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  urgent: { label: "Urgent", className: "bg-destructive/10 text-destructive" },
};

export function ProductionCommandCenter() {
  const { data: tasks, isLoading: tasksLoading } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: team, isLoading: teamLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/directory"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: deliverables } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const { data: activity } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity"],
    queryFn: async () => {
      const response = await fetch("/api/activity?limit=10", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: discordPresence } = useQuery<{ userId: string; isScreenSharing: boolean }[]>({
    queryKey: ["/api/discord/presence"],
    queryFn: async () => {
      const response = await fetch("/api/discord/presence", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    refetchInterval: 30000,
  });

  const activeTasks = tasks?.filter(t => normalizeStatus(t.status) !== "COMPLETED") || [];
  const inProgressTasks = tasks?.filter(t => normalizeStatus(t.status) === "IN PROGRESS") || [];
  const reviewTasks = tasks?.filter(t => normalizeStatus(t.status) === "REVIEW" || normalizeStatus(t.status) === "IN REVIEW") || [];
  const blockedTasks = tasks?.filter(t => normalizeStatus(t.status) === "BLOCKED") || [];
  const completedToday = tasks?.filter(t => {
    if (normalizeStatus(t.status) !== "COMPLETED") return false;
    return true;
  }) || [];

  const overdueTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const dueThisWeek = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= weekFromNow;
  });

  const activeWorkers = team?.filter(m => {
    if (!m.userId) return false;
    const presence = discordPresence?.find(p => p.userId === m.userId);
    return presence?.isScreenSharing;
  }) || [];

  const activeCampaigns = campaigns?.filter(c => normalizeStatus(c.status) === "ACTIVE") || [];

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (tasksLoading || teamLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-command-center">
            <Rocket className="h-5 w-5 text-primary" />
            Production Command Center
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time overview of production status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <PlayCircle className="h-4 w-4" />
              In Progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" data-testid="stat-in-progress">
                {inProgressTasks.length}
              </span>
              <span className="text-sm text-muted-foreground">tasks</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              In Review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold" data-testid="stat-in-review">
                {reviewTasks.length}
              </span>
              <span className="text-sm text-muted-foreground">tasks</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("hover-elevate", blockedTasks.length > 0 && "border-destructive/50")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <PauseCircle className="h-4 w-4" />
              Blocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-3xl font-bold",
                blockedTasks.length > 0 && "text-destructive"
              )} data-testid="stat-blocked">
                {blockedTasks.length}
              </span>
              <span className="text-sm text-muted-foreground">tasks</span>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("hover-elevate", overdueTasks.length > 0 && "border-amber-500/50")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Overdue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-3xl font-bold",
                overdueTasks.length > 0 && "text-amber-600 dark:text-amber-400"
              )} data-testid="stat-overdue">
                {overdueTasks.length}
              </span>
              <span className="text-sm text-muted-foreground">tasks</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Workstream - What everyone is working on */}
      <Card data-testid="live-workstream-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Live Workstream
            </span>
            <Badge variant="outline" className="text-xs">
              {tasks?.filter(t => normalizeStatus(t.status) === "IN PROGRESS").length || 0} active
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time view of what the team is working on
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-3">
              {tasks
                ?.filter(t => normalizeStatus(t.status) !== "COMPLETED")
                .sort((a, b) => {
                  const statusOrder: Record<string, number> = { 
                    "IN PROGRESS": 0, 
                    "BLOCKED": 1, 
                    "IN REVIEW": 2, 
                    "REVIEW": 2,
                    "TO BE STARTED": 3,
                    "PENDING": 3
                  };
                  return (statusOrder[normalizeStatus(a.status)] ?? 99) - (statusOrder[normalizeStatus(b.status)] ?? 99);
                })
                .slice(0, 20)
                .map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-card",
                      normalizeStatus(task.status) === "BLOCKED" && "border-destructive/30 bg-destructive/5",
                      task.dueDate && new Date(task.dueDate) < new Date() && normalizeStatus(task.status) !== "COMPLETED" && "border-amber-500/30"
                    )}
                    data-testid={`workstream-task-${task.id}`}
                  >
                    <div className={cn(
                      "w-1.5 h-full min-h-[48px] rounded-full flex-shrink-0",
                      getStatusColor(task.status)
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm line-clamp-2">{task.description}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {task.assignedTo && (
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[10px]">
                                    {task.assignedTo.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground">{task.assignedTo}</span>
                              </div>
                            )}
                            {task.client && (
                              <Badge variant="secondary" className="text-xs">
                                {task.client}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              normalizeStatus(task.status) === "IN PROGRESS" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
                              normalizeStatus(task.status) === "BLOCKED" && "bg-destructive/10 text-destructive border-destructive/20",
                              normalizeStatus(task.status) === "IN REVIEW" && "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
                              (normalizeStatus(task.status) === "TO BE STARTED" || normalizeStatus(task.status) === "PENDING") && "bg-muted"
                            )}
                          >
                            {task.status}
                          </Badge>
                          {task.dueDate && (
                            <span className={cn(
                              "text-xs",
                              new Date(task.dueDate) < new Date() && normalizeStatus(task.status) !== "COMPLETED" 
                                ? "text-amber-600 dark:text-amber-400 font-medium" 
                                : "text-muted-foreground"
                            )}>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {(!tasks || tasks.filter(t => normalizeStatus(t.status) !== "COMPLETED").length === 0) && (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active work items</p>
                  <p className="text-xs mt-1">Team members can add their work from the Tasks tab</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Priority Tasks
              </span>
              <Link href="/content-dashboard">
                <Button variant="ghost" size="sm">
                  View All <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {activeTasks
                  .filter(t => t.priority === "urgent" || t.priority === "high" || overdueTasks.includes(t))
                  .slice(0, 10)
                  .map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-md border bg-card hover-elevate"
                      data-testid={`priority-task-${task.id}`}
                    >
                      <div className={cn(
                        "w-1 h-10 rounded-full",
                        getStatusColor(task.status)
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.description}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={priorityConfig[task.priority as keyof typeof priorityConfig]?.className || ""}>
                            {priorityConfig[task.priority as keyof typeof priorityConfig]?.label || task.priority}
                          </Badge>
                          {task.contentType && (
                            <Badge variant="secondary" className="text-xs">
                              {task.contentType}
                            </Badge>
                          )}
                          {task.dueDate && new Date(task.dueDate) < new Date() && (
                            <Badge variant="outline" className="text-xs text-destructive border-destructive/20">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                      {task.dueDate && (
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                {activeTasks.filter(t => t.priority === "urgent" || t.priority === "high" || overdueTasks.includes(t)).length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No high priority tasks</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active Workers
            </CardTitle>
            <CardDescription>
              Currently screen sharing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeWorkers.length > 0 ? (
                activeWorkers.map(worker => (
                  <div key={worker.id} className="flex items-center gap-3 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={worker.user?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(worker.person)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{worker.person}</p>
                      <p className="text-xs text-muted-foreground">{worker.skill || "Team Member"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                      <Circle className="h-2 w-2 mr-1 fill-current animate-pulse" />
                      Live
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active workers</p>
                  <p className="text-xs">Team members sharing screens will appear here</p>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Team Overview</p>
              <div className="flex items-center gap-2 flex-wrap">
                {team?.slice(0, 8).map(member => (
                  <Tooltip key={member.id}>
                    <TooltipTrigger asChild>
                      <Avatar className={cn(
                        "h-8 w-8 cursor-default",
                        activeWorkers.some(w => w.id === member.id) && "ring-2 ring-emerald-500"
                      )}>
                        <AvatarImage src={member.user?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.person)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.person}</p>
                      <p className="text-xs text-muted-foreground">{member.skill || "Team Member"}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {(team?.length || 0) > 8 && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    +{(team?.length || 0) - 8}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCampaigns.length > 0 ? (
                activeCampaigns.slice(0, 4).map(campaign => {
                  const campaignTasks = tasks?.filter(t => t.campaignId === campaign.id) || [];
                  const completedCount = campaignTasks.filter(t => normalizeStatus(t.status) === "COMPLETED").length;
                  const progress = campaignTasks.length > 0 ? (completedCount / campaignTasks.length) * 100 : 0;
                  
                  return (
                    <div key={campaign.id} className="space-y-2" data-testid={`campaign-${campaign.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{campaign.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {campaignTasks.length} tasks
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      {campaign.endDate && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(campaign.endDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active campaigns</p>
                </div>
              )}
            </div>
          </CardContent>
          {activeCampaigns.length > 4 && (
            <CardFooter className="pt-0">
              <Link href="/content-dashboard" className="w-full">
                <Button variant="ghost" size="sm" className="w-full">
                  View all {activeCampaigns.length} campaigns <ArrowUpRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {activity && activity.length > 0 ? (
                  activity.map(log => (
                    <div key={log.id} className="flex gap-3 text-sm" data-testid={`activity-${log.id}`}>
                      <div className="flex-shrink-0 w-16 text-xs text-muted-foreground">
                        {formatTimeAgo(log.createdAt)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          <span className="font-medium capitalize">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          {log.details && (
                            <span className="text-muted-foreground">
                              {" "}- {log.details}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <FileCheck className="h-4 w-4" />
              Pending Deliverables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="stat-pending-deliverables">
                {deliverables?.filter(d => normalizeStatus(d.status) === "PENDING").length || 0}
              </span>
              <span className="text-sm text-muted-foreground">awaiting review</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Due This Week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="stat-due-this-week">
                {dueThisWeek.length}
              </span>
              <span className="text-sm text-muted-foreground">tasks</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Total Active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="stat-total-active">
                {activeTasks.length}
              </span>
              <span className="text-sm text-muted-foreground">tasks in pipeline</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
