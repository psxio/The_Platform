import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Check, Clock, Circle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PortalTask } from "@shared/schema";

const STATUS_CONFIG = {
  done: {
    label: "Done",
    icon: Check,
    variant: "default" as const,
    className: "bg-green-600 hover:bg-green-700",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    variant: "default" as const,
    className: "bg-yellow-600 hover:bg-yellow-700",
  },
  pending: {
    label: "Pending",
    icon: Circle,
    variant: "secondary" as const,
    className: "",
  },
};

export default function Portal() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<PortalTask[]>({
    queryKey: ["/api/portal-tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/portal-tasks", { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal-tasks"] });
      setNewTaskTitle("");
      toast({ title: "Task added" });
    },
    onError: () => {
      toast({ title: "Failed to add task", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/portal-tasks/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal-tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/portal-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal-tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      createTaskMutation.mutate(newTaskTitle.trim());
    }
  };

  const cycleStatus = (task: PortalTask) => {
    const statusOrder = ["pending", "in_progress", "done"];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateStatusMutation.mutate({ id: task.id, status: nextStatus });
  };

  const groupedTasks = {
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    pending: tasks.filter((t) => t.status === "pending"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            4444 Portal
          </h1>
          <p className="text-muted-foreground">
            Development task tracker
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <form onSubmit={handleAddTask} className="flex gap-2">
              <Input
                placeholder="Add a new task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1"
                data-testid="input-new-task"
              />
              <Button
                type="submit"
                disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                data-testid="button-add-task"
              >
                {createTaskMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No tasks yet. Add your first task above.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedTasks.in_progress.length > 0 && (
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide text-yellow-600 mb-3">
                  In Progress ({groupedTasks.in_progress.length})
                </h2>
                <div className="space-y-2">
                  {groupedTasks.in_progress.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onCycleStatus={cycleStatus}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      isDeleting={deleteTaskMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedTasks.pending.length > 0 && (
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  Pending ({groupedTasks.pending.length})
                </h2>
                <div className="space-y-2">
                  {groupedTasks.pending.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onCycleStatus={cycleStatus}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      isDeleting={deleteTaskMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedTasks.done.length > 0 && (
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide text-green-600 mb-3">
                  Done ({groupedTasks.done.length})
                </h2>
                <div className="space-y-2">
                  {groupedTasks.done.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onCycleStatus={cycleStatus}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      isDeleting={deleteTaskMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onCycleStatus,
  onDelete,
  isDeleting,
}: {
  task: PortalTask;
  onCycleStatus: (task: PortalTask) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const config = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <Card
      className={`transition-opacity ${task.status === "done" ? "opacity-60" : ""}`}
      data-testid={`task-item-${task.id}`}
    >
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCycleStatus(task)}
          className="shrink-0"
          data-testid={`button-status-${task.id}`}
        >
          <Icon className={`w-5 h-5 ${task.status === "done" ? "text-green-600" : task.status === "in_progress" ? "text-yellow-600" : "text-muted-foreground"}`} />
        </Button>

        <span
          className={`flex-1 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
        >
          {task.title}
        </span>

        <Badge
          variant={config.variant}
          className={`shrink-0 ${config.className}`}
        >
          {config.label}
        </Badge>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task.id)}
          disabled={isDeleting}
          className="shrink-0 text-muted-foreground hover:text-destructive"
          data-testid={`button-delete-${task.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
