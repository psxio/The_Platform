import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Check, Clock, Circle, Trash2, Loader2, Globe, Lock } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Task } from "@shared/schema";

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

export default function Todo() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    enabled: isAuthenticated,
  });

  const { data: publicTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/public"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/tasks", { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNewTaskTitle("");
      toast({ title: "Task added" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to add tasks",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Failed to add task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status, isPublic }: { id: number; status?: string; isPublic?: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { status, isPublic });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/public"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/public"] });
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

  const cycleStatus = (task: Task) => {
    const statusOrder = ["pending", "in_progress", "done"];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTaskMutation.mutate({ id: task.id, status: nextStatus });
  };

  const togglePublic = (task: Task) => {
    updateTaskMutation.mutate({ id: task.id, isPublic: !task.isPublic });
  };

  const groupedTasks = {
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    pending: tasks.filter((t) => t.status === "pending"),
    done: tasks.filter((t) => t.status === "done"),
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            To Do
          </h1>
          <p className="text-muted-foreground">
            {isAuthenticated ? `${user?.firstName || user?.email || "Your"}'s task board` : "Personal task boards"}
          </p>
        </div>

        {!isAuthenticated ? (
          <Card className="mb-8">
            <CardContent className="py-8 text-center">
              <SiGoogle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-medium mb-2">Sign in to manage your tasks</h2>
              <p className="text-muted-foreground mb-4">
                Create your personal to-do list and optionally share items publicly.
              </p>
              <Button asChild>
                <a href="/api/auth/google" data-testid="button-login" className="flex items-center gap-2">
                  <SiGoogle className="w-4 h-4" />
                  Sign in with Google
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {user?.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <a href="/api/logout" data-testid="button-logout">
                  Sign Out
                </a>
              </Button>
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
                          onTogglePublic={togglePublic}
                          onDelete={(id) => deleteTaskMutation.mutate(id)}
                          isDeleting={deleteTaskMutation.isPending}
                          isOwner={true}
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
                          onTogglePublic={togglePublic}
                          onDelete={(id) => deleteTaskMutation.mutate(id)}
                          isDeleting={deleteTaskMutation.isPending}
                          isOwner={true}
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
                          onTogglePublic={togglePublic}
                          onDelete={(id) => deleteTaskMutation.mutate(id)}
                          isDeleting={deleteTaskMutation.isPending}
                          isOwner={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {publicTasks.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Shared Tasks
            </h2>
            <div className="space-y-2">
              {publicTasks.map((task) => (
                <TaskItem
                  key={`public-${task.id}`}
                  task={task}
                  onCycleStatus={() => {}}
                  onTogglePublic={() => {}}
                  onDelete={() => {}}
                  isDeleting={false}
                  isOwner={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onCycleStatus,
  onTogglePublic,
  onDelete,
  isDeleting,
  isOwner,
}: {
  task: Task;
  onCycleStatus: (task: Task) => void;
  onTogglePublic: (task: Task) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  isOwner: boolean;
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
          disabled={!isOwner}
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

        {isOwner && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTogglePublic(task)}
              className={`shrink-0 ${task.isPublic ? "text-blue-500" : "text-muted-foreground"}`}
              title={task.isPublic ? "Shared publicly" : "Private"}
              data-testid={`button-share-${task.id}`}
            >
              {task.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </Button>

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
          </>
        )}
      </CardContent>
    </Card>
  );
}
