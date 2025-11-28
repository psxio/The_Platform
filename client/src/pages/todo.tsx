import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Check, Clock, Circle, Trash2, Loader2, Globe, Lock, FileText, Calendar, FolderOpen, X } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
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

interface ParsedTask {
  title: string;
  projectTag?: string;
  dueDate?: string;
}

export default function Todo() {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [parsedTasks, setParsedTasks] = useState<(ParsedTask & { originalIndex: number })[]>([]);
  const [excludedIndices, setExcludedIndices] = useState<number[]>([]);
  const [tasksPerDay, setTasksPerDay] = useState(3);
  const [isParsing, setIsParsing] = useState(false);
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

  const confirmBulkMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/tasks/bulk-import/confirm", { 
        rawText: bulkText, 
        tasksPerDay,
        excludeIndices: excludedIndices
      });
      return response.json();
    },
    onSuccess: (data: { success: boolean; createdCount: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setBulkImportOpen(false);
      setBulkText("");
      setParsedTasks([]);
      setExcludedIndices([]);
      toast({ 
        title: "Tasks imported", 
        description: `Successfully added ${data.createdCount} tasks` 
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please log in",
          description: "You need to be logged in to import tasks",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Failed to import tasks", variant: "destructive" });
    },
  });

  const handleParseTasks = async () => {
    if (!bulkText.trim()) return;
    
    setIsParsing(true);
    setExcludedIndices([]); // Reset excluded indices for new parse
    try {
      const response = await apiRequest("POST", "/api/tasks/bulk-import", { 
        rawText: bulkText, 
        tasksPerDay 
      });
      const data = await response.json() as { preview: (ParsedTask & { originalIndex: number })[]; totalTasks: number; daysSpanned: number };
      // Preserve the server-issued originalIndex for accurate exclusion
      setParsedTasks(data.preview);
    } catch (error) {
      toast({ title: "Failed to parse tasks", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const removeTaskFromPreview = (originalIndex: number) => {
    setExcludedIndices(prev => [...prev, originalIndex]);
    setParsedTasks(prev => prev.filter(t => t.originalIndex !== originalIndex));
  };

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
              <CardContent className="pt-6 space-y-4">
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
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setBulkImportOpen(true)}
                  data-testid="button-bulk-import"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Bulk Import Tasks
                </Button>
              </CardContent>
            </Card>

            <Dialog open={bulkImportOpen} onOpenChange={setBulkImportOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Bulk Import Tasks
                  </DialogTitle>
                  <DialogDescription>
                    Paste your task list below. Use [Project] prefix to tag tasks. Tasks will be spaced across days automatically.
                  </DialogDescription>
                </DialogHeader>

                {parsedTasks.length === 0 ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Paste your tasks</Label>
                      <Textarea
                        placeholder={`[4444] portal upgrade / finalize
[Fireside] Volume will tick off
[Internal] Finish content app
create scatter csv whitelist...`}
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        className="min-h-[200px] font-mono text-sm"
                        data-testid="textarea-bulk-import"
                      />
                    </div>
                    
                    <div>
                      <Label className="mb-2 block">Tasks per day: {tasksPerDay}</Label>
                      <Slider
                        value={[tasksPerDay]}
                        onValueChange={(v) => setTasksPerDay(v[0])}
                        min={1}
                        max={10}
                        step={1}
                        className="w-full"
                        data-testid="slider-tasks-per-day"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Spread tasks across days to avoid overloading
                      </p>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setBulkImportOpen(false)}
                        data-testid="button-cancel-import"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleParseTasks}
                        disabled={!bulkText.trim() || isParsing}
                        data-testid="button-parse-tasks"
                      >
                        {isParsing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          <>Preview Tasks</>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">
                        {parsedTasks.length} tasks parsed
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setParsedTasks([])}
                        data-testid="button-edit-text"
                      >
                        Edit Text
                      </Button>
                    </div>
                    
                    <ScrollArea className="flex-1 border rounded-md">
                      <div className="p-3 space-y-2">
                        {parsedTasks.map((task, index) => (
                          <div 
                            key={index} 
                            className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                            data-testid={`preview-task-${index}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.projectTag && (
                                  <Badge variant="secondary" className="shrink-0">
                                    <FolderOpen className="w-3 h-3 mr-1" />
                                    {task.projectTag}
                                  </Badge>
                                )}
                                <span className="text-sm truncate">{task.title}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-6 w-6"
                              onClick={() => removeTaskFromPreview(task.originalIndex)}
                              data-testid={`button-remove-preview-${index}`}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    <div className="flex gap-2 justify-end mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setBulkImportOpen(false);
                          setParsedTasks([]);
                        }}
                        data-testid="button-cancel-confirm"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => confirmBulkMutation.mutate()}
                        disabled={parsedTasks.length === 0 || confirmBulkMutation.isPending}
                        data-testid="button-confirm-import"
                      >
                        {confirmBulkMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>Import {parsedTasks.length} Tasks</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

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

        <div className={`flex-1 min-w-0 ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
          <div className="flex items-center gap-2 flex-wrap">
            {task.projectTag && (
              <Badge variant="outline" className="shrink-0 text-xs">
                <FolderOpen className="w-3 h-3 mr-1" />
                {task.projectTag}
              </Badge>
            )}
            <span className="truncate">{task.title}</span>
          </div>
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Calendar className="w-3 h-3" />
              {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>

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
