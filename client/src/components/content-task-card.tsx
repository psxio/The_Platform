import type { ContentTask, Campaign } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, User, Building2, AlertTriangle, Flag, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

function parseDate(dueDate: string): Date | null {
  try {
    let date: Date;
    
    if (/^[A-Za-z]{3}\s+\d{1,2}$/.test(dueDate.trim())) {
      const currentYear = new Date().getFullYear();
      date = new Date(`${dueDate.trim()}, ${currentYear}`);
    } else {
      date = new Date(dueDate);
    }
    
    if (isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  } catch {
    return null;
  }
}

function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "COMPLETED") return false;
  
  const due = parseDate(dueDate);
  if (!due) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return due < today;
}

function isDueSoon(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "COMPLETED") return false;
  
  const due = parseDate(dueDate);
  if (!due) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);
  threeDaysFromNow.setHours(23, 59, 59, 999);
  
  return due >= today && due <= threeDaysFromNow;
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
    borderColor: "border-l-slate-300 dark:border-l-slate-600",
    icon: "opacity-50",
  },
  medium: {
    className: "text-blue-600 dark:text-blue-400",
    borderColor: "border-l-blue-400 dark:border-l-blue-500",
    icon: "",
  },
  high: {
    className: "text-amber-600 dark:text-amber-400",
    borderColor: "border-l-amber-400 dark:border-l-amber-500",
    icon: "",
  },
  urgent: {
    className: "text-destructive",
    borderColor: "border-l-red-500 dark:border-l-red-400",
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
        "hover-elevate active-elevate-2 transition-all overflow-hidden",
        "border-l-4",
        priorityStyle.borderColor,
        onEdit && "cursor-pointer",
        isSelected && "ring-2 ring-primary ring-offset-2",
        taskIsOverdue && "border-l-destructive bg-destructive/5",
        taskIsDueSoon && !taskIsOverdue && "border-l-amber-500 bg-amber-500/5"
      )}
      onClick={handleCardClick}
      data-testid={`card-content-task-${task.id}`}
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={statusStyle.variant}
                className={cn("text-xs font-medium", statusStyle.className)}
                data-testid={`badge-status-${task.id}`}
              >
                {task.status}
              </Badge>
              {task.priority && task.priority !== "medium" && (
                <Badge 
                  variant="outline" 
                  className={cn("text-xs gap-1 border-0", priorityStyle.className)}
                >
                  <Flag className={cn("w-3 h-3", priorityStyle.icon)} />
                  <span className="capitalize">{task.priority}</span>
                </Badge>
              )}
            </div>
            
            {campaign && (
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: campaign.color || "#3B82F6" }}
                />
                <span className="text-xs text-muted-foreground font-medium">
                  {campaign.name}
                </span>
              </div>
            )}
          </div>
          
          {onSelectionChange && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className="flex-shrink-0"
              data-testid={`checkbox-select-task-${task.id}`}
            />
          )}
        </div>

        <p
          className="text-sm font-medium text-foreground leading-relaxed line-clamp-2"
          title={task.description}
          data-testid={`text-description-${task.id}`}
        >
          {task.description}
        </p>

        <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground pt-1">
          {task.assignedTo && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
              <span className="truncate max-w-[100px]" data-testid={`text-assignee-${task.id}`}>
                {task.assignedTo}
              </span>
            </div>
          )}

          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1.5",
              taskIsOverdue ? "text-destructive" : taskIsDueSoon ? "text-amber-600 dark:text-amber-400" : ""
            )}>
              {taskIsOverdue ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              <span data-testid={`text-duedate-${task.id}`}>
                {task.dueDate}
              </span>
            </div>
          )}

          {task.client && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate max-w-[80px]" data-testid={`text-client-${task.id}`}>
                {task.client}
              </span>
            </div>
          )}
        </div>

        {task.notes && (
          <p
            className="text-xs text-muted-foreground/80 line-clamp-1 italic border-t border-border/50 pt-3"
            title={task.notes}
            data-testid={`text-notes-${task.id}`}
          >
            {task.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
