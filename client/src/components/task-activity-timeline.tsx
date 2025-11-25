import { useQuery } from "@tanstack/react-query";
import type { ActivityLog } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  CircleDot,
  MessageCircle,
  UserPlus,
  Calendar,
  Flag,
  FileText,
  ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityWithUser extends ActivityLog {
  user?: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface TaskActivityTimelineProps {
  taskId: number;
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
}

function getActionIcon(action: string) {
  switch (action) {
    case "created":
      return <Plus className="w-3 h-3" />;
    case "updated":
    case "edited":
      return <Pencil className="w-3 h-3" />;
    case "deleted":
      return <Trash2 className="w-3 h-3" />;
    case "completed":
      return <CheckCircle2 className="w-3 h-3" />;
    case "status_changed":
      return <CircleDot className="w-3 h-3" />;
    case "commented":
    case "comment_added":
      return <MessageCircle className="w-3 h-3" />;
    case "assigned":
      return <UserPlus className="w-3 h-3" />;
    case "due_date_changed":
      return <Calendar className="w-3 h-3" />;
    case "priority_changed":
      return <Flag className="w-3 h-3" />;
    case "subtask_added":
    case "subtask_completed":
    case "subtask_uncompleted":
    case "subtask_deleted":
      return <FileText className="w-3 h-3" />;
    default:
      return <ArrowRight className="w-3 h-3" />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case "created":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "completed":
    case "subtask_completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "deleted":
      return "bg-destructive/10 text-destructive";
    case "priority_changed":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "status_changed":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "commented":
    case "comment_added":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatActivityMessage(activity: ActivityWithUser): string {
  const userName = activity.user 
    ? `${activity.user.firstName || 'Unknown'} ${activity.user.lastName || ''}`.trim()
    : 'Someone';
  
  const details = activity.details as Record<string, any> | null;
  
  switch (activity.action) {
    case "created":
      return `${userName} created this task`;
    case "updated":
    case "edited":
      if (details?.field) {
        return `${userName} updated ${details.field}`;
      }
      if (details?.fields) {
        return `${userName} updated ${details.fields.join(', ')}`;
      }
      return `${userName} updated this task`;
    case "deleted":
      return `${userName} deleted this task`;
    case "completed":
      return `${userName} marked this task as completed`;
    case "status_changed":
      if (details?.from && details?.to) {
        return `${userName} changed status from ${details.from} to ${details.to}`;
      }
      return `${userName} changed the status`;
    case "commented":
    case "comment_added":
      if (details?.preview) {
        return `${userName} commented: "${details.preview}"`;
      }
      return `${userName} added a comment`;
    case "assigned":
      if (details?.assignedTo) {
        return `${userName} assigned this task to ${details.assignedTo}`;
      }
      return `${userName} updated the assignment`;
    case "due_date_changed":
      if (details?.from && details?.to) {
        return `${userName} changed due date from ${details.from} to ${details.to}`;
      }
      if (details?.to) {
        return `${userName} set due date to ${details.to}`;
      }
      return `${userName} changed the due date`;
    case "priority_changed":
      if (details?.from && details?.to) {
        return `${userName} changed priority from ${details.from} to ${details.to}`;
      }
      return `${userName} changed the priority`;
    case "subtask_added":
      if (details?.title) {
        return `${userName} added subtask: "${details.title}"`;
      }
      return `${userName} added a subtask`;
    case "subtask_completed":
      if (details?.title) {
        return `${userName} completed subtask: "${details.title}"`;
      }
      return `${userName} completed a subtask`;
    case "subtask_uncompleted":
      if (details?.title) {
        return `${userName} unchecked subtask: "${details.title}"`;
      }
      return `${userName} unchecked a subtask`;
    case "subtask_deleted":
      if (details?.title) {
        return `${userName} deleted subtask: "${details.title}"`;
      }
      return `${userName} deleted a subtask`;
    default:
      return `${userName} performed an action`;
  }
}

function ActivityItem({ activity }: { activity: ActivityWithUser }) {
  return (
    <div className="flex gap-3" data-testid={`activity-item-${activity.id}`}>
      <div className="flex flex-col items-center">
        <div 
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
            getActionColor(activity.action)
          )}
        >
          {getActionIcon(activity.action)}
        </div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-5 h-5">
            <AvatarImage src={activity.user?.profileImageUrl || undefined} />
            <AvatarFallback className="text-[10px]">
              {getInitials(activity.user?.firstName || null, activity.user?.lastName || null)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm" data-testid={`activity-message-${activity.id}`}>
            {formatActivityMessage(activity)}
          </p>
        </div>
        <span className="text-xs text-muted-foreground mt-1 block">
          {activity.createdAt && formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

export function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
  const { data: activities, isLoading } = useQuery<ActivityWithUser[]>({
    queryKey: ["/api/content-tasks", taskId, "activity"],
    queryFn: async () => {
      const response = await fetch(`/api/content-tasks/${taskId}/activity`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Activity</h3>
        {activities && activities.length > 0 && (
          <span className="text-sm text-muted-foreground">({activities.length})</span>
        )}
      </div>

      {activities && activities.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground" data-testid="empty-activity">
          <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No activity yet</p>
          <p className="text-xs">Changes to this task will appear here</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-0">
            {activities?.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
