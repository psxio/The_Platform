import type { ContentTask, Campaign } from "@shared/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, User, Building2, Paperclip, UserCheck, AlertTriangle, Flag, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

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
    threeDaysFromNow.setHours(23, 59, 59, 999);
    return due >= today && due <= threeDaysFromNow;
  } catch {
    return false;
  }
}

interface ContentTaskCardProps {
  task: ContentTask;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  onEdit?: (task: ContentTask) => void;
}

const statusConfig = {
  "TO BE STARTED": {
    variant: "outline" as const,
    className: "border-muted-foreground/30 bg-background text-muted-foreground",
  },
  "IN PROGRESS": {
    variant: "default" as const,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  "COMPLETED": {
    variant: "default" as const,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
};

const priorityConfig = {
  low: {
    className: "text-muted-foreground",
    icon: "opacity-50",
  },
  medium: {
    className: "text-blue-600 dark:text-blue-400",
    icon: "",
  },
  high: {
    className: "text-amber-600 dark:text-amber-400",
    icon: "",
  },
  urgent: {
    className: "text-destructive",
    icon: "animate-pulse",
  },
};

export function ContentTaskCard({ task, isSelected, onSelectionChange, onEdit }: ContentTaskCardProps) {
  const statusStyle = statusConfig[task.status as keyof typeof statusConfig] || statusConfig["TO BE STARTED"];
  const priorityStyle = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig] || priorityConfig.medium;
  const taskIsOverdue = isOverdue(task.dueDate, task.status);
  const taskIsDueSoon = isDueSoon(task.dueDate, task.status);

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const campaign = campaigns?.find(c => c.id === task.campaignId);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-radix-collection-item]')) {
      return;
    }
    if (onEdit) {
      onEdit(task);
    }
  };

  return (
    <Card
      className={cn(
        "hover-elevate active-elevate-2 transition-all",
        onEdit && "cursor-pointer",
        isSelected && "ring-2 ring-primary",
        taskIsOverdue && "border-destructive/50 bg-destructive/5",
        taskIsDueSoon && !taskIsOverdue && "border-amber-500/50 bg-amber-500/5"
      )}
      onClick={handleCardClick}
      data-testid={`card-content-task-${task.id}`}
    >
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant={statusStyle.variant}
              className={cn("text-xs font-medium", statusStyle.className)}
              data-testid={`badge-status-${task.id}`}
            >
              {task.status}
            </Badge>
            {task.priority && task.priority !== "medium" && (
              <div className={cn("flex items-center gap-1 text-xs", priorityStyle.className)}>
                <Flag className={cn("w-3 h-3", priorityStyle.icon)} />
                <span className="capitalize">{task.priority}</span>
              </div>
            )}
          </div>
          {onSelectionChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              data-testid={`checkbox-select-task-${task.id}`}
            />
          )}
        </div>
        {campaign && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: campaign.color || "#3B82F6" }}
            />
            <span>{campaign.name}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p
          className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem]"
          title={task.description}
          data-testid={`text-description-${task.id}`}
        >
          {task.description}
        </p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {task.assignedTo && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate" data-testid={`text-assignee-${task.id}`}>
                {task.assignedTo}
              </span>
            </div>
          )}

          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-2",
              taskIsOverdue ? "text-destructive" : taskIsDueSoon ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}>
              {taskIsOverdue ? (
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="truncate" data-testid={`text-duedate-${task.id}`}>
                {task.dueDate}
                {taskIsOverdue && " (Overdue)"}
                {taskIsDueSoon && !taskIsOverdue && " (Due Soon)"}
              </span>
            </div>
          )}

          {task.client && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate" data-testid={`text-client-${task.id}`}>
                {task.client}
              </span>
            </div>
          )}

          {task.assignedBy && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate" data-testid={`text-assignedby-${task.id}`}>
                {task.assignedBy}
              </span>
            </div>
          )}
        </div>

        {task.notes && (
          <p
            className="text-xs italic text-muted-foreground line-clamp-2 border-t border-border pt-3"
            title={task.notes}
            data-testid={`text-notes-${task.id}`}
          >
            {task.notes}
          </p>
        )}

        {task.deliverable && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
            <Paperclip className="w-3.5 h-3.5" />
            <span className="truncate" data-testid={`text-deliverable-${task.id}`}>
              {task.deliverable}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
