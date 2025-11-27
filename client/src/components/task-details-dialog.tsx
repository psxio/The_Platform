import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { ContentTask, Subtask, Campaign } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  User, 
  Building2, 
  UserCheck,
  Flag,
  CheckCircle2,
  ListTodo,
  X,
  Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskComments } from "./task-comments";
import { TaskActivityTimeline } from "./task-activity-timeline";
import { TaskTimeTracking } from "./task-time-tracking";
import { TaskWatchers } from "./task-watchers";
import { TaskApprovals } from "./task-approvals";

interface TaskDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ContentTask | null;
  onEdit?: (task: ContentTask) => void;
  currentUserId?: string;
}

const statusConfig = {
  "TO BE STARTED": {
    className: "border-muted-foreground/30 bg-background text-muted-foreground",
  },
  "IN PROGRESS": {
    className: "bg-primary/10 text-primary border-primary/20",
  },
  "COMPLETED": {
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
};

const priorityConfig = {
  low: { className: "text-muted-foreground", label: "Low" },
  medium: { className: "text-blue-600 dark:text-blue-400", label: "Medium" },
  high: { className: "text-amber-600 dark:text-amber-400", label: "High" },
  urgent: { className: "text-destructive", label: "Urgent" },
};

export function TaskDetailsDialog({ open, onOpenChange, task, onEdit, currentUserId }: TaskDetailsDialogProps) {
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const { data: subtasks, isLoading: subtasksLoading } = useQuery<Subtask[]>({
    queryKey: ["/api/content-tasks", task?.id, "subtasks"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/content-tasks/${task.id}/subtasks`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch subtasks");
      return response.json();
    },
    enabled: !!task && open,
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    enabled: open,
  });

  const campaign = campaigns?.find(c => c.id === task?.campaignId);

  const createSubtaskMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!task) throw new Error("No task selected");
      return apiRequest("POST", `/api/content-tasks/${task.id}/subtasks`, { 
        title,
        order: (subtasks?.length || 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", task?.id, "subtasks"] });
      setNewSubtaskTitle("");
      setIsAddingSubtask(false);
      toast({
        title: "Subtask added",
        description: "The subtask has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add subtask.",
        variant: "destructive",
      });
    },
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/subtasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", task?.id, "subtasks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subtask.",
        variant: "destructive",
      });
    },
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/subtasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", task?.id, "subtasks"] });
      toast({
        title: "Subtask removed",
        description: "The subtask has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove subtask.",
        variant: "destructive",
      });
    },
  });

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    createSubtaskMutation.mutate(newSubtaskTitle.trim());
  };

  const completedSubtasks = subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  if (!task) return null;

  const statusStyle = statusConfig[task.status as keyof typeof statusConfig] || statusConfig["TO BE STARTED"];
  const priorityStyle = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="dialog-task-details">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-xs", statusStyle.className)}>
                  {task.status}
                </Badge>
                {task.priority && (
                  <div className={cn("flex items-center gap-1 text-xs", priorityStyle.className)}>
                    <Flag className="w-3 h-3" />
                    <span>{priorityStyle.label}</span>
                  </div>
                )}
              </div>
              <DialogTitle className="text-xl" data-testid="text-task-title">
                {task.description}
              </DialogTitle>
              {campaign && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: campaign.color || "#3B82F6" }}
                  />
                  <span>{campaign.name}</span>
                </div>
              )}
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(task);
                }}
                data-testid="button-edit-task"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {task.assignedTo && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span data-testid="text-task-assignee">{task.assignedTo}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-task-duedate">{task.dueDate}</span>
              </div>
            )}
            {task.client && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span data-testid="text-task-client">{task.client}</span>
              </div>
            )}
            {task.assignedBy && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <UserCheck className="w-4 h-4" />
                <span data-testid="text-task-assignedby">{task.assignedBy}</span>
              </div>
            )}
          </div>

          {task.notes && (
            <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground">
              <p data-testid="text-task-notes">{task.notes}</p>
            </div>
          )}

          {currentUserId && (
            <TaskWatchers taskId={task.id} currentUserId={currentUserId} />
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold">Subtasks</h3>
                {totalSubtasks > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({completedSubtasks}/{totalSubtasks})
                  </span>
                )}
              </div>
              {!isAddingSubtask && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingSubtask(true)}
                  data-testid="button-add-subtask"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Subtask
                </Button>
              )}
            </div>

            {totalSubtasks > 0 && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right">{progress}% complete</p>
              </div>
            )}

            {isAddingSubtask && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Enter subtask title..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubtask();
                    if (e.key === "Escape") {
                      setIsAddingSubtask(false);
                      setNewSubtaskTitle("");
                    }
                  }}
                  autoFocus
                  data-testid="input-new-subtask"
                />
                <Button 
                  size="sm"
                  onClick={handleAddSubtask}
                  disabled={!newSubtaskTitle.trim() || createSubtaskMutation.isPending}
                  data-testid="button-save-subtask"
                >
                  {createSubtaskMutation.isPending ? "Adding..." : "Add"}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setIsAddingSubtask(false);
                    setNewSubtaskTitle("");
                  }}
                  data-testid="button-cancel-subtask"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {subtasksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : subtasks && subtasks.length > 0 ? (
              <div className="space-y-2">
                {subtasks
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((subtask) => (
                    <div 
                      key={subtask.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md border bg-card",
                        subtask.completed && "bg-muted/30"
                      )}
                      data-testid={`subtask-item-${subtask.id}`}
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={(checked) => {
                          updateSubtaskMutation.mutate({
                            id: subtask.id,
                            completed: !!checked,
                          });
                        }}
                        data-testid={`checkbox-subtask-${subtask.id}`}
                      />
                      <span 
                        className={cn(
                          "flex-1 text-sm",
                          subtask.completed && "line-through text-muted-foreground"
                        )}
                        data-testid={`text-subtask-${subtask.id}`}
                      >
                        {subtask.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                        data-testid={`button-delete-subtask-${subtask.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground" data-testid="empty-subtasks">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No subtasks yet</p>
                <p className="text-xs">Add subtasks to break down this task into smaller steps</p>
              </div>
            )}
          </div>

          <Separator />

          {currentUserId && (
            <TaskApprovals taskId={task.id} currentUserId={currentUserId} />
          )}

          <Separator />

          <TaskTimeTracking taskId={task.id} currentUserId={currentUserId} />

          <Separator />

          {currentUserId && (
            <TaskComments taskId={task.id} currentUserId={currentUserId} />
          )}

          <Separator />

          <TaskActivityTimeline taskId={task.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
