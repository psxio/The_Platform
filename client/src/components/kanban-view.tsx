import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ContentTask, User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User as UserIcon, 
  Calendar, 
  Building2, 
  Flag,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskDetailsDialog } from "./task-details-dialog";
import { AddContentTaskDialog } from "./add-content-task-dialog";

const STATUS_COLUMNS = [
  { id: "TO BE STARTED", title: "To Do", color: "bg-slate-100 dark:bg-slate-800/50", icon: Clock },
  { id: "IN PROGRESS", title: "In Progress", color: "bg-blue-50 dark:bg-blue-950/30", icon: PlayCircle },
  { id: "COMPLETED", title: "Done", color: "bg-emerald-50 dark:bg-emerald-950/30", icon: CheckCircle2 },
];

const priorityConfig = {
  low: { 
    className: "text-muted-foreground",
    borderColor: "border-l-slate-300 dark:border-l-slate-600",
  },
  medium: { 
    className: "text-blue-600 dark:text-blue-400",
    borderColor: "border-l-blue-400 dark:border-l-blue-500",
  },
  high: { 
    className: "text-amber-600 dark:text-amber-400",
    borderColor: "border-l-amber-400 dark:border-l-amber-500",
  },
  urgent: { 
    className: "text-destructive",
    borderColor: "border-l-red-500 dark:border-l-red-400",
  },
};

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

interface KanbanCardProps {
  task: ContentTask;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: ContentTask) => void;
  onDragEnd: () => void;
  onClick: (task: ContentTask) => void;
}

function KanbanCard({ task, isDragging, onDragStart, onDragEnd, onClick }: KanbanCardProps) {
  const taskIsOverdue = isOverdue(task.dueDate, task.status);
  const priorityStyle = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig];

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(task)}
      className={cn(
        "cursor-pointer transition-all duration-200 overflow-hidden",
        "border-l-4",
        priorityStyle.borderColor,
        isDragging 
          ? "opacity-50 scale-95 rotate-2 shadow-xl ring-2 ring-primary" 
          : "hover-elevate active-elevate-2",
        taskIsOverdue && "border-l-destructive bg-destructive/5"
      )}
      data-testid={`kanban-card-${task.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5 cursor-grab hover:text-muted-foreground transition-colors" />
          <p className="text-sm font-medium flex-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap pl-6">
          {task.priority && task.priority !== "medium" && (
            <div className={cn("flex items-center gap-1 text-xs", priorityStyle.className)}>
              <Flag className="w-3 h-3" />
              <span className="capitalize">{task.priority}</span>
            </div>
          )}
          {task.assignedTo && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-2.5 h-2.5 text-primary" />
              </div>
              <span className="truncate max-w-[70px]">{task.assignedTo}</span>
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
  draggedTaskId: number | null;
  onDragStart: (e: React.DragEvent, task: ContentTask) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onTaskClick: (task: ContentTask) => void;
}

function KanbanColumn({ 
  column, 
  tasks, 
  draggedTaskId,
  onDragStart, 
  onDragEnd,
  onDragOver, 
  onDrop,
  onTaskClick 
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);
  const IconComponent = column.icon;

  return (
    <div 
      ref={columnRef}
      className="flex flex-col min-w-[320px] w-[320px]"
      data-testid={`kanban-column-${column.id.toLowerCase().replace(/ /g, '-')}`}
    >
      <div className={cn("p-4 rounded-t-xl", column.color)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs font-medium px-2">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <ScrollArea 
        className={cn(
          "flex-1 min-h-[400px] max-h-[calc(100vh-280px)] rounded-b-xl border border-t-0 transition-all duration-200",
          isDragOver 
            ? "bg-primary/5 border-primary/40 shadow-inner" 
            : "bg-muted/20"
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
        <div className="p-3 space-y-3">
          {tasks.map((task) => (
            <KanbanCard 
              key={task.id} 
              task={task} 
              isDragging={draggedTaskId === task.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClick={onTaskClick}
            />
          ))}
          {tasks.length === 0 && (
            <div className={cn(
              "py-12 text-center rounded-lg border-2 border-dashed transition-colors",
              isDragOver ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20"
            )}>
              <p className="text-sm text-muted-foreground">
                {isDragOver ? "Drop here" : "No tasks"}
              </p>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseXRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

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
        title: "Task moved",
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

  const checkEdgeScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const edgeSize = 80;
    const maxSpeed = 10;

    const distFromLeft = mouseXRef.current - rect.left;
    const distFromRight = rect.right - mouseXRef.current;

    if (distFromLeft < edgeSize && distFromLeft > 0) {
      const speed = Math.max(2, maxSpeed * (1 - distFromLeft / edgeSize));
      container.scrollLeft -= speed;
    } else if (distFromRight < edgeSize && distFromRight > 0) {
      const speed = Math.max(2, maxSpeed * (1 - distFromRight / edgeSize));
      container.scrollLeft += speed;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const handleDragStart = (e: React.DragEvent, task: ContentTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
    
    const ghost = document.createElement('div');
    ghost.style.opacity = '0';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => ghost.remove(), 0);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    mouseXRef.current = e.clientX;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(checkEdgeScroll);
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTaskMutation.mutate({ id: draggedTask.id, status: newStatus });
    }
    setDraggedTask(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
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
          <div key={column.id} className="flex flex-col min-w-[320px] w-[320px]">
            <Skeleton className="h-14 rounded-t-xl" />
            <Skeleton className="h-[400px] rounded-b-xl mt-0" />
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
      <div 
        ref={containerRef}
        className="flex gap-5 overflow-x-auto pb-4 scroll-smooth"
      >
        {STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={getTasksByStatus(column.id)}
            draggedTaskId={draggedTask?.id || null}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
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
