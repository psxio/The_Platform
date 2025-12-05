import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, differenceInDays } from "date-fns";
import {
  CheckSquare,
  Clock,
  Calendar,
  Star,
  ArrowRight,
  Target,
  Activity,
  Bookmark,
  Bell,
  LucideIcon,
  ChevronRight,
  LayoutGrid,
  Wallet,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Rocket,
  Lightbulb,
  Crown,
  Briefcase,
  FileText,
  Plus,
  Eye,
  Zap,
} from "lucide-react";
import type { ContentTask, TeamTask, Notification } from "@shared/schema";

interface QuickActionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number;
  variant?: "default" | "primary" | "warning";
}

function QuickAction({ icon: Icon, title, description, href, testId, badge, variant = "default" }: QuickActionProps) {
  const bgColors = {
    default: "bg-primary/10",
    primary: "bg-primary/20",
    warning: "bg-amber-500/20",
  };
  const iconColors = {
    default: "text-primary",
    primary: "text-primary",
    warning: "text-amber-600",
  };

  return (
    <Link href={href}>
      <Card className="hover-elevate cursor-pointer transition-all h-full group" data-testid={testId}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn("p-2.5 rounded-lg", bgColors[variant])}>
            <Icon className={cn("h-5 w-5", iconColors[variant])} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{title}</p>
              {badge !== undefined && (
                <Badge variant={variant === "warning" ? "destructive" : "secondary"} className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </CardContent>
      </Card>
    </Link>
  );
}

function NotificationsPreview() {
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
  });

  const recentNotifications = notifications.slice(0, 4);

  if (isLoading) {
    return <Skeleton className="h-[180px]" />;
  }

  return (
    <Card data-testid="card-notifications">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Notifications</CardTitle>
          {(unreadCount?.count || 0) > 0 && (
            <Badge variant="destructive" className="text-xs h-5">
              {unreadCount?.count}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notifications">
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recentNotifications.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentNotifications.map((notif) => (
              <div
                key={notif.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md text-sm",
                  !notif.read && "bg-primary/5"
                )}
                data-testid={`notification-${notif.id}`}
              >
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", !notif.read ? "bg-primary" : "bg-muted")} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {notif.createdAt ? format(new Date(notif.createdAt), "MMM d, h:mm a") : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamTasksSummary() {
  const { user } = useAuth();
  
  const { data: tasks = [], isLoading } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks"],
  });

  const myTasks = tasks.filter(t => t.assigneeId === user?.id);
  const inProgressTasks = myTasks.filter(t => t.status === "in_progress");
  const todoTasks = myTasks.filter(t => t.status === "todo");
  const completedTasks = myTasks.filter(t => t.status === "done");
  
  const overdueTasks = myTasks.filter(t => {
    if (!t.dueDate || t.status === "done") return false;
    return isPast(new Date(t.dueDate));
  });

  const dueSoonTasks = myTasks.filter(t => {
    if (!t.dueDate || t.status === "done") return false;
    const dueDate = new Date(t.dueDate);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    return daysUntilDue >= 0 && daysUntilDue <= 3;
  });

  const totalActive = inProgressTasks.length + todoTasks.length;
  const progressPercent = totalActive > 0 
    ? Math.round((completedTasks.length / (completedTasks.length + totalActive)) * 100) 
    : 0;

  if (isLoading) {
    return <Skeleton className="h-[280px]" />;
  }

  return (
    <Card data-testid="card-team-tasks-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            My Tasks
          </CardTitle>
          <CardDescription>Your assigned tasks across all boards</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild data-testid="button-view-tasks">
          <Link href="/tasks">
            Open Board
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Circle className="h-3 w-3 text-blue-500" />
              <span className="text-lg font-bold">{todoTasks.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">To Do</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-amber-500" />
              <span className="text-lg font-bold">{inProgressTasks.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-lg font-bold">{completedTasks.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
        </div>

        {overdueTasks.length > 0 && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-2">
              <AlertTriangle className="h-4 w-4" />
              {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? "s" : ""}
            </div>
            <div className="space-y-1">
              {overdueTasks.slice(0, 2).map(task => (
                <p key={task.id} className="text-xs text-muted-foreground truncate">
                  • {task.title}
                </p>
              ))}
            </div>
          </div>
        )}

        {overdueTasks.length === 0 && dueSoonTasks.length > 0 && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-2">
              <Clock className="h-4 w-4" />
              {dueSoonTasks.length} Task{dueSoonTasks.length > 1 ? "s" : ""} Due Soon
            </div>
            <div className="space-y-1">
              {dueSoonTasks.slice(0, 2).map(task => (
                <p key={task.id} className="text-xs text-muted-foreground truncate">
                  • {task.title}
                </p>
              ))}
            </div>
          </div>
        )}

        {myTasks.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks assigned to you</p>
            <Button variant="ghost" size="sm" asChild className="mt-1 text-primary">
              <Link href="/tasks">Browse all tasks</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingDeadlines() {
  const { data: tasks = [], isLoading } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks"],
  });

  const upcomingTasks = tasks
    .filter(t => t.dueDate && t.status !== "done")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  if (isLoading) {
    return <Skeleton className="h-[200px]" />;
  }

  const formatDueDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    if (isPast(d)) return "Overdue";
    return format(d, "MMM d");
  };

  const getDueDateColor = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isPast(d)) return "text-destructive";
    if (isToday(d)) return "text-amber-600";
    if (isTomorrow(d)) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <Card data-testid="card-upcoming-deadlines">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingTasks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                data-testid={`deadline-${task.id}`}
              >
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  isPast(new Date(task.dueDate!)) ? "bg-destructive" :
                  isToday(new Date(task.dueDate!)) ? "bg-amber-500" : "bg-primary"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{task.title}</p>
                </div>
                <span className={cn("text-xs font-medium shrink-0", getDueDateColor(task.dueDate!))}>
                  {formatDueDate(task.dueDate!)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContentTasksSummary() {
  const { user } = useAuth();
  
  const { data: tasks = [], isLoading } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
    enabled: !!user && (user.role === "content" || user.role === "admin"),
  });

  const userEmail = user?.email || "";
  const myTasks = tasks.filter(
    (t) => t.assignedTo === userEmail && t.status !== "COMPLETED"
  );
  const overdueTasks = myTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  );

  if (isLoading) {
    return <Skeleton className="h-[180px]" />;
  }

  return (
    <Card data-testid="card-content-tasks">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Content Tasks</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/content-dashboard">
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold" data-testid="count-my-content-tasks">
              {myTasks.length}
            </p>
            <p className="text-xs text-muted-foreground">Active Tasks</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive" data-testid="count-overdue-content">
              {overdueTasks.length}
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
        </div>

        {myTasks.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-2">
            No active content tasks
          </p>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                data-testid={`content-task-${task.id}`}
              >
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-sm">{task.description}</span>
                {task.dueDate && new Date(task.dueDate) < new Date() && (
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Web3ToolsSummary() {
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/history"],
  });

  const { data: collections = [] } = useQuery<any[]>({
    queryKey: ["/api/collections"],
  });

  if (isLoading) {
    return <Skeleton className="h-[180px]" />;
  }

  const recentComparisons = history.slice(0, 3);

  return (
    <Card data-testid="card-web3-tools">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Onchain Tools</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild data-testid="button-view-web3">
          <Link href="/onchain-ops">
            Dashboard
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold" data-testid="count-comparisons">
              {history.length}
            </p>
            <p className="text-xs text-muted-foreground">Comparisons</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary" data-testid="count-collections">
              {collections.length}
            </p>
            <p className="text-xs text-muted-foreground">Collections</p>
          </div>
        </div>

        {recentComparisons.length === 0 ? (
          <div className="text-center py-2 text-muted-foreground">
            <p className="text-sm">No recent comparisons</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentComparisons.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                data-testid={`comparison-${item.id}`}
              >
                <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-sm">
                  {item.list1Name || "List 1"} vs {item.list2Name || "List 2"}
                </span>
                <Badge variant="outline" className="text-xs">{item.matchCount || 0}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DaoSummary() {
  const { data: projects = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dao/projects"],
  });

  const { data: wallets = [] } = useQuery<any[]>({
    queryKey: ["/api/dao/safe-wallets"],
  });

  const activeProjects = projects.filter(p => p.status === "active" || p.status === "in_progress");

  if (isLoading) {
    return <Skeleton className="h-[180px]" />;
  }

  return (
    <Card data-testid="card-dao-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">DAO Hub</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dao">
            Open
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold" data-testid="count-dao-projects">
              {activeProjects.length}
            </p>
            <p className="text-xs text-muted-foreground">Active Projects</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-2xl font-bold text-primary" data-testid="count-dao-wallets">
              {wallets.length}
            </p>
            <p className="text-xs text-muted-foreground">Safe Wallets</p>
          </div>
        </div>

        {activeProjects.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-2">
            No active DAO projects
          </p>
        ) : (
          <div className="space-y-2">
            {activeProjects.slice(0, 2).map((project: any) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
              >
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate text-sm">{project.projectName}</span>
                <Badge variant="outline" className="text-xs capitalize">{project.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SavedItemsPreview() {
  const { data: savedItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/saved-items"],
  });

  if (isLoading) {
    return <Skeleton className="h-[150px]" />;
  }

  return (
    <Card data-testid="card-saved-items">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Saved Items</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {savedItems.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Star className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No saved items</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
                data-testid={`saved-item-${item.id}`}
              >
                <Star className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm truncate">{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WelcomeHeader({ firstName, role }: { firstName: string; role: string }) {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-workspace">
            {greeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {role} Role
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default function Workspace() {
  const { user } = useAuth();

  const showContent = user?.role === "content" || user?.role === "admin";
  const showWeb3 = user?.role === "web3" || user?.role === "admin";
  const showDao = user?.role === "web3" || user?.role === "admin";

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
  const userRole = user?.role || "content";

  const { data: tasks = [] } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks"],
  });

  const myTasks = tasks.filter(t => t.assigneeId === user?.id);
  const overdueTasks = myTasks.filter(t => {
    if (!t.dueDate || t.status === "done") return false;
    return isPast(new Date(t.dueDate));
  });

  return (
    <div className="container py-6 max-w-7xl">
      <WelcomeHeader firstName={firstName} role={userRole} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <QuickAction
          icon={LayoutGrid}
          title="Kanban Board"
          description="View all tasks"
          href="/tasks"
          testId="quick-action-kanban"
          badge={myTasks.filter(t => t.status !== "done").length || undefined}
        />
        {showContent && (
          <QuickAction
            icon={Briefcase}
            title="Content Studio"
            description="Production hub"
            href="/content-dashboard"
            testId="quick-action-content"
          />
        )}
        {showWeb3 && (
          <QuickAction
            icon={Wallet}
            title="Onchain Ops"
            description="Web3 tools"
            href="/onchain-ops"
            testId="quick-action-web3"
          />
        )}
        {overdueTasks.length > 0 ? (
          <QuickAction
            icon={AlertTriangle}
            title="Overdue Tasks"
            description="Needs attention"
            href="/tasks"
            testId="quick-action-overdue"
            badge={overdueTasks.length}
            variant="warning"
          />
        ) : (
          <QuickAction
            icon={Plus}
            title="Create Task"
            description="Add a new task"
            href="/tasks?create=true"
            testId="quick-action-create"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <TeamTasksSummary />
          
          <div className="grid gap-6 md:grid-cols-2">
            {showContent && <ContentTasksSummary />}
            {showWeb3 && <Web3ToolsSummary />}
            {showDao && <DaoSummary />}
            {!showContent && !showWeb3 && <SavedItemsPreview />}
          </div>
        </div>

        <div className="space-y-6">
          <NotificationsPreview />
          <UpcomingDeadlines />
          <SavedItemsPreview />
        </div>
      </div>
    </div>
  );
}
