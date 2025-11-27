import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ContentTask, User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User as UserIcon, 
  Calendar, 
  Building2, 
  Flag,
  GripVertical,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskDetailsDialog } from "./task-details-dialog";
import { AddContentTaskDialog } from "./add-content-task-dialog";

const STATUS_COLUMNS = [
  { id: "TO BE STARTED", title: "To Be Started", color: "bg-muted" },
  { id: "IN PROGRESS", title: "In Progress", color: "bg-primary/10" },
  { id: "COMPLETED", title: "Completed", color: "bg-emerald-500/10" },
];

const priorityConfig = {
  low: { className: "text-muted-foreground" },
  medium: { className: "text-blue-600 dark:text-blue-400" },
  high: { className: "text-amber-600 dark:text-amber-400" },
  urgent: { className: "text-destructive" },
};

function parseDate(dueDate: string): Date | null {
  try {
    let date: Date;
    
    // Handle dates like "Nov 30" (without year) - assume current year
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

interface KanbanCardProps {
  task: ContentTask;
  onDragStart: (e: React.DragEvent, task: ContentTask) => void;
  onClick: (task: ContentTask) => void;
}

function KanbanCard({ task, onDragStart, onClick }: KanbanCardProps) {
  const taskIsOverdue = isOverdue(task.dueDate, task.status);
  const priorityStyle = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig];

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onClick(task)}
      className={cn(
        "cursor-pointer hover-elevate active-elevate-2 transition-all",
        taskIsOverdue && "border-destructive/50 bg-destructive/5"
      )}
      data-testid={`kanban-card-${task.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" />
          <p className="text-sm font-medium flex-1 line-clamp-2">
            {task.description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {task.priority && task.priority !== "medium" && (
            <div className={cn("flex items-center gap-1 text-xs", priorityStyle.className)}>
              <Flag className="w-3 h-3" />
              <span className="capitalize">{task.priority}</span>
            </div>
          )}
          {task.assignedTo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <UserIcon className="w-3 h-3" />
              <span className="truncate max-w-[80px]">{task.assignedTo}</span>
            </div>
          )}
          {task.dueDate && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              taskIsOverdue ? "text-destructive" : "text-muted-foreground"
            )}>
              {taskIsOverdue ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <Calendar className="w-3 h-3" />
              )}
              <span>{task.dueDate}</span>
            </div>
          )}
          {task.client && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[60px]">{task.client}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  column: typeof STATUS_COLUMNS[0];
  tasks: ContentTask[];
  onDragStart: (e: React.DragEvent, task: ContentTask) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onTaskClick: (task: ContentTask) => void;
}

function KanbanColumn({ 
  column, 
  tasks, 
  onDragStart, 
  onDragOver, 
  onDrop,
  onTaskClick 
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div 
      className="flex flex-col min-w-[300px] w-[300px]"
      data-testid={`kanban-column-${column.id.toLowerCase().replace(/ /g, '-')}`}
    >
      <div className={cn("p-3 rounded-t-lg", column.color)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <ScrollArea 
        className={cn(
          "flex-1 min-h-[400px] max-h-[calc(100vh-300px)] rounded-b-lg border border-t-0 bg-muted/30 transition-colors",
          isDragOver && "bg-primary/5 border-primary/30"
        )}
        onDragOver={(e) => {
          onDragOver(e);
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          onDrop(e, column.id);
          setIsDragOver(false);
        }}
      >
        <div className="p-2 space-y-2">
          {tasks.map((task) => (
            <KanbanCard 
              key={task.id} 
              task={task} 
              onDragStart={onDragStart}
              onClick={onTaskClick}
            />
          ))}
          {tasks.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function KanbanView() {
  const { toast } = useToast();
  const [draggedTask, setDraggedTask] = useState<ContentTask | null>(null);
  const [viewingTask, setViewingTask] = useState<ContentTask | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ContentTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PUT", `/api/content-tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({
        title: "Task updated",
        description: "Task status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (e: React.DragEvent, task: ContentTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTaskMutation.mutate({ id: draggedTask.id, status: newStatus });
    }
    setDraggedTask(null);
  };

  const handleTaskClick = (task: ContentTask) => {
    setViewingTask(task);
    setIsDetailsDialogOpen(true);
  };

  const handleTaskEdit = (task: ContentTask) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setViewingTask(null);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col min-w-[300px] w-[300px]">
            <Skeleton className="h-12 rounded-t-lg" />
            <Skeleton className="h-[400px] rounded-b-lg mt-0" />
          </div>
        ))}
      </div>
    );
  }

  const getTasksByStatus = (status: string) => {
    return tasks?.filter(t => t.status === status) || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksByStatus(column.id)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onTaskClick={handleTaskClick}
          />
        ))}
      </div>

      <TaskDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={handleDetailsDialogClose}
        task={viewingTask}
        onEdit={handleTaskEdit}
        currentUserId={currentUser?.id}
      />

      <AddContentTaskDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        task={editingTask || undefined}
      />
    </div>
  );
}
