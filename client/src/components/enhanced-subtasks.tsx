import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  User as UserIcon,
  Flag,
  Clock,
  CheckCircle2,
  ListTodo,
  X,
  GripVertical,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EnhancedSubtask, DirectoryMember, User } from "@shared/schema";

interface EnhancedSubtasksProps {
  taskType: "content" | "team";
  taskId: number;
  canEdit?: boolean;
  canAdd?: boolean;
  canDelete?: boolean;
}

const statusOptions = [
  { value: "todo", label: "To Do", color: "text-muted-foreground" },
  { value: "in_progress", label: "In Progress", color: "text-blue-500" },
  { value: "done", label: "Done", color: "text-green-500" },
];

const priorityOptions = [
  { value: "low", label: "Low", color: "text-slate-500", icon: Flag },
  { value: "normal", label: "Normal", color: "text-yellow-500", icon: Flag },
  { value: "high", label: "High", color: "text-orange-500", icon: Flag },
  { value: "urgent", label: "Urgent", color: "text-red-500", icon: Flag },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EnhancedSubtasks({
  taskType,
  taskId,
  canEdit = true,
  canAdd = true,
  canDelete = true,
}: EnhancedSubtasksProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<number>>(new Set());

  const { data: subtasks, isLoading } = useQuery<EnhancedSubtask[]>({
    queryKey: ["/api/enhanced-subtasks", taskType, taskId],
    enabled: !!taskId,
  });

  const { data: members } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: false, // Only enabled if needed
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/enhanced-subtasks", {
        title,
        parentTaskType: taskType,
        parentTaskId: taskId,
        status: "todo",
        priority: "normal",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhanced-subtasks", taskType, taskId] });
      setNewTitle("");
      setIsAdding(false);
      toast({
        title: "Subtask created",
        description: "The subtask has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create subtask.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<EnhancedSubtask> }) => {
      return apiRequest("PATCH", `/api/enhanced-subtasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhanced-subtasks", taskType, taskId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subtask.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/enhanced-subtasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enhanced-subtasks", taskType, taskId] });
      toast({
        title: "Subtask deleted",
        description: "The subtask has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete subtask.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (newTitle.trim()) {
      createMutation.mutate(newTitle.trim());
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getAssigneeName = (assigneeId: string | null): string => {
    if (!assigneeId) return "Unassigned";
    const member = members?.find((m) => m.id.toString() === assigneeId);
    return member?.person || "Unknown";
  };

  const completedCount = subtasks?.filter((s) => s.completed || s.status === "done").length || 0;
  const totalCount = subtasks?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Enhanced Subtasks</h3>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>
        {canAdd && !isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            data-testid="button-add-enhanced-subtask"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Subtask
          </Button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">{progress}% complete</p>
        </div>
      )}

      {isAdding && (
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
          <Input
            placeholder="Enter subtask title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsAdding(false);
                setNewTitle("");
              }
            }}
            autoFocus
            className="flex-1"
            data-testid="input-new-enhanced-subtask"
          />
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={!newTitle.trim() || createMutation.isPending}
            data-testid="button-save-enhanced-subtask"
          >
            {createMutation.isPending ? "Adding..." : "Add"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsAdding(false);
              setNewTitle("");
            }}
            data-testid="button-cancel-enhanced-subtask"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {subtasks && subtasks.length > 0 ? (
        <div className="space-y-2">
          {subtasks
            .sort((a, b) => a.order - b.order)
            .map((subtask) => {
              const isExpanded = expandedSubtasks.has(subtask.id);
              const statusConfig = statusOptions.find((s) => s.value === subtask.status) || statusOptions[0];
              const priorityConfig = priorityOptions.find((p) => p.value === subtask.priority) || priorityOptions[1];
              const assigneeName = getAssigneeName(subtask.assigneeId);

              return (
                <div
                  key={subtask.id}
                  className={cn(
                    "border rounded-lg bg-card transition-all",
                    subtask.completed && "bg-muted/30 opacity-75"
                  )}
                  data-testid={`enhanced-subtask-${subtask.id}`}
                >
                  <div className="flex items-center gap-2 p-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                    
                    <Checkbox
                      checked={subtask.completed}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => {
                        updateMutation.mutate({
                          id: subtask.id,
                          updates: { 
                            completed: !!checked,
                            status: checked ? "done" : "todo",
                          },
                        });
                      }}
                      data-testid={`checkbox-enhanced-subtask-${subtask.id}`}
                    />

                    <button
                      onClick={() => toggleExpand(subtask.id)}
                      className="p-0.5 hover:bg-muted rounded"
                      data-testid={`button-expand-subtask-${subtask.id}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    <span
                      className={cn(
                        "flex-1 text-sm font-medium",
                        subtask.completed && "line-through text-muted-foreground"
                      )}
                      data-testid={`text-enhanced-subtask-${subtask.id}`}
                    >
                      {subtask.title}
                    </span>

                    <div className="flex items-center gap-2">
                      {subtask.dueDate && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          {format(new Date(subtask.dueDate), "MMM d")}
                        </Badge>
                      )}

                      {subtask.assigneeId && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(assigneeName)}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{assigneeName}</TooltipContent>
                        </Tooltip>
                      )}

                      <Badge
                        variant="outline"
                        className={cn("text-xs", priorityConfig.color)}
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        {priorityConfig.label}
                      </Badge>

                      {subtask.actualMinutes && subtask.actualMinutes > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {subtask.actualMinutes}m
                        </Badge>
                      )}

                      {canDelete && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(subtask.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            Assignee
                          </label>
                          {canEdit ? (
                            <Select
                              value={subtask.assigneeId || "unassigned"}
                              onValueChange={(value) => {
                                updateMutation.mutate({
                                  id: subtask.id,
                                  updates: { assigneeId: value === "unassigned" ? null : value },
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs" data-testid={`select-subtask-assignee-${subtask.id}`}>
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {members?.map((m) => (
                                  <SelectItem key={m.id} value={m.id.toString()}>
                                    {m.person}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm">{assigneeName}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            Due Date
                          </label>
                          {canEdit ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs w-full justify-start"
                                  data-testid={`button-subtask-duedate-${subtask.id}`}
                                >
                                  {subtask.dueDate
                                    ? format(new Date(subtask.dueDate), "MMM d, yyyy")
                                    : "Set date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={subtask.dueDate ? new Date(subtask.dueDate) : undefined}
                                  onSelect={(date) => {
                                    updateMutation.mutate({
                                      id: subtask.id,
                                      updates: { dueDate: date || null },
                                    });
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <p className="text-sm">
                              {subtask.dueDate
                                ? format(new Date(subtask.dueDate), "MMM d, yyyy")
                                : "No date"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            Priority
                          </label>
                          {canEdit ? (
                            <Select
                              value={subtask.priority || "normal"}
                              onValueChange={(value) => {
                                updateMutation.mutate({
                                  id: subtask.id,
                                  updates: { priority: value as "low" | "normal" | "high" | "urgent" },
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs" data-testid={`select-subtask-priority-${subtask.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {priorityOptions.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>
                                    <div className={cn("flex items-center gap-1", p.color)}>
                                      <Flag className="w-3 h-3" />
                                      {p.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className={cn("text-sm", priorityConfig.color)}>
                              {priorityConfig.label}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Status
                          </label>
                          {canEdit ? (
                            <Select
                              value={subtask.status || "todo"}
                              onValueChange={(value) => {
                                updateMutation.mutate({
                                  id: subtask.id,
                                  updates: { 
                                    status: value,
                                    completed: value === "done",
                                  },
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs" data-testid={`select-subtask-status-${subtask.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    <div className={cn("flex items-center gap-1", s.color)}>
                                      {s.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className={cn("text-sm", statusConfig.color)}>
                              {statusConfig.label}
                            </p>
                          )}
                        </div>
                      </div>

                      {subtask.estimatedMinutes && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Estimated: {subtask.estimatedMinutes}m
                          {subtask.actualMinutes && subtask.actualMinutes > 0 && (
                            <span className="ml-2">
                              | Actual: {subtask.actualMinutes}m
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground" data-testid="empty-enhanced-subtasks">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No subtasks yet</p>
          <p className="text-xs">Add subtasks to break down this task into smaller steps</p>
        </div>
      )}
    </div>
  );
}
