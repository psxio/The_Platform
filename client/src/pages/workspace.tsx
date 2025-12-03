import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
} from "lucide-react";
import type { ContentTask, ContentOrder } from "@shared/schema";

interface QuickActionProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  testId: string;
}

function QuickAction({ icon: Icon, title, description, href, testId }: QuickActionProps) {
  return (
    <Link href={href}>
      <Card className="hover-elevate cursor-pointer transition-all h-full" data-testid={testId}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="p-2 rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground truncate">{description}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

function TasksSummary() {
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
  const dueTodayTasks = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  if (isLoading) {
    return <Skeleton className="h-[200px]" />;
  }

  return (
    <Card data-testid="card-tasks-summary">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">My Tasks</CardTitle>
          <CardDescription>Tasks assigned to you</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild data-testid="button-view-all-tasks">
          <Link href="/content-dashboard">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-md bg-muted/50">
            <p className="text-2xl font-bold" data-testid="count-active-tasks">
              {myTasks.length}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center p-3 rounded-md bg-destructive/10">
            <p
              className="text-2xl font-bold text-destructive"
              data-testid="count-overdue-tasks"
            >
              {overdueTasks.length}
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="text-center p-3 rounded-md bg-amber-500/10">
            <p
              className="text-2xl font-bold text-amber-600"
              data-testid="count-due-today-tasks"
            >
              {dueTodayTasks.length}
            </p>
            <p className="text-xs text-muted-foreground">Due Today</p>
          </div>
        </div>

        {myTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            No active tasks assigned to you
          </p>
        ) : (
          <div className="space-y-2">
            {myTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                data-testid={`task-preview-${task.id}`}
              >
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{task.description}</span>
                {task.dueDate && new Date(task.dueDate) < new Date() && (
                  <Badge variant="destructive">Overdue</Badge>
                )}
                {task.priority === "high" && (
                  <Badge variant="default">High</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityCard() {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery<ContentOrder[]>({
    queryKey: ["/api/content-orders/recent"],
    enabled: !!user,
  });

  if (isLoading) {
    return <Skeleton className="h-[200px]" />;
  }

  return (
    <Card data-testid="card-recent-activity">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest updates and orders</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                data-testid={`activity-order-${order.id}`}
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{order.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.status}
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

function Web3ToolsSummary() {
  const { data: history = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/history"],
  });

  const { data: collections = [] } = useQuery<any[]>({
    queryKey: ["/api/collections"],
  });

  if (isLoading) {
    return <Skeleton className="h-[200px]" />;
  }

  const recentComparisons = history.slice(0, 3);

  return (
    <Card data-testid="card-web3-tools">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Onchain Tools</CardTitle>
          <CardDescription>Recent comparisons and collections</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild data-testid="button-view-all-comparisons">
          <Link href="/web3/history">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 rounded-md bg-muted/50">
            <p className="text-2xl font-bold" data-testid="count-comparisons">
              {history.length}
            </p>
            <p className="text-xs text-muted-foreground">Comparisons</p>
          </div>
          <div className="text-center p-3 rounded-md bg-primary/10">
            <p className="text-2xl font-bold text-primary" data-testid="count-collections">
              {collections.length}
            </p>
            <p className="text-xs text-muted-foreground">Collections</p>
          </div>
        </div>

        {recentComparisons.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Target className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comparisons yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentComparisons.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                data-testid={`comparison-${item.id}`}
              >
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">
                  {item.list1Name || "List 1"} vs {item.list2Name || "List 2"}
                </span>
                <Badge variant="outline">{item.matchCount || 0} matches</Badge>
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
        <div>
          <CardTitle className="text-lg">Saved Items</CardTitle>
          <CardDescription>Pinned for quick access</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {savedItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bookmark className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved items yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
                data-testid={`saved-item-${item.id}`}
              >
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-sm truncate">{item.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Workspace() {
  const { user } = useAuth();

  const showContent = user?.role === "content" || user?.role === "admin";
  const showWeb3 = user?.role === "web3" || user?.role === "admin";

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.firstName || user?.email?.split("@")[0] || "there";

  return (
    <div className="container py-6 max-w-6xl">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          data-testid="heading-workspace"
        >
          {greeting()}, {firstName}
        </h1>
        <p className="text-muted-foreground">
          Here's what needs your attention today
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {showContent && (
          <QuickAction
            icon={CheckSquare}
            title="Tasks"
            description="View and manage your tasks"
            href="/content-dashboard"
            testId="quick-action-tasks"
          />
        )}
        {showWeb3 && (
          <QuickAction
            icon={Target}
            title="Compare Addresses"
            description="Compare wallet address lists"
            href="/web3/compare"
            testId="quick-action-compare"
          />
        )}
        <QuickAction
          icon={Calendar}
          title="Calendar"
          description="View your schedule"
          href="/content-dashboard?tab=calendar"
          testId="quick-action-calendar"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {showContent && <TasksSummary />}
        {showWeb3 && <Web3ToolsSummary />}
        <RecentActivityCard />
        <SavedItemsPreview />
      </div>
    </div>
  );
}
