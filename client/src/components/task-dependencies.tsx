import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Link2,
  ArrowRight,
  ArrowLeft,
  GitBranch,
  Copy,
  ExternalLink,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskDependency, ContentTask, TeamTask } from "@shared/schema";

interface TaskDependenciesProps {
  taskType: "content" | "team";
  taskId: number;
  canEdit?: boolean;
}

const dependencyTypes = [
  {
    value: "blocks",
    label: "Blocks",
    description: "This task blocks another task",
    icon: ArrowRight,
    color: "text-red-500",
  },
  {
    value: "blocked_by",
    label: "Blocked By",
    description: "This task is blocked by another task",
    icon: ArrowLeft,
    color: "text-orange-500",
  },
  {
    value: "relates_to",
    label: "Relates To",
    description: "This task is related to another task",
    icon: Link2,
    color: "text-blue-500",
  },
  {
    value: "duplicates",
    label: "Duplicates",
    description: "This task duplicates another task",
    icon: Copy,
    color: "text-purple-500",
  },
  {
    value: "parent_of",
    label: "Parent Of",
    description: "This task is a parent of another task",
    icon: GitBranch,
    color: "text-green-500",
  },
  {
    value: "child_of",
    label: "Child Of",
    description: "This task is a child of another task",
    icon: GitBranch,
    color: "text-teal-500",
  },
];

export function TaskDependencies({
  taskType,
  taskId,
  canEdit = true,
}: TaskDependenciesProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("relates_to");
  const [selectedTargetTaskType, setSelectedTargetTaskType] = useState<"content" | "team">(taskType);
  const [selectedTargetTask, setSelectedTargetTask] = useState<number | null>(null);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);

  const { data: dependencies, isLoading } = useQuery<TaskDependency[]>({
    queryKey: ["/api/task-dependencies", taskType, taskId],
    enabled: !!taskId,
  });

  const { data: contentTasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
    enabled: isAddDialogOpen && selectedTargetTaskType === "content",
  });

  const { data: teamTasks } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-tasks"],
    enabled: isAddDialogOpen && selectedTargetTaskType === "team",
  });

  const availableTasks = selectedTargetTaskType === "content" 
    ? contentTasks?.filter(t => !(t.id === taskId && taskType === "content"))
    : teamTasks?.filter(t => !(t.id === taskId && taskType === "team"));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTargetTask) throw new Error("No target task selected");
      return apiRequest("POST", "/api/task-dependencies", {
        taskType,
        sourceTaskId: taskId,
        targetTaskType: selectedTargetTaskType,
        targetTaskId: selectedTargetTask,
        dependencyType: selectedType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-dependencies", taskType, taskId] });
      setIsAddDialogOpen(false);
      setSelectedTargetTask(null);
      toast({
        title: "Dependency added",
        description: "The task dependency has been created.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create dependency.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/task-dependencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-dependencies", taskType, taskId] });
      toast({
        title: "Dependency removed",
        description: "The task dependency has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete dependency.",
        variant: "destructive",
      });
    },
  });

  const getDependencyConfig = (type: string) => {
    return dependencyTypes.find((d) => d.value === type) || dependencyTypes[2];
  };

  const getLinkedTaskTitle = (dep: TaskDependency): string => {
    const isSource = dep.sourceTaskId === taskId && dep.taskType === taskType;
    if (isSource) {
      return `${dep.targetTaskType === "content" ? "Content" : "Team"} Task #${dep.targetTaskId}`;
    } else {
      return `${dep.taskType === "content" ? "Content" : "Team"} Task #${dep.sourceTaskId}`;
    }
  };

  const getDisplayType = (dep: TaskDependency): string => {
    const isSource = dep.sourceTaskId === taskId && dep.taskType === taskType;
    if (isSource) {
      return dep.dependencyType;
    } else {
      if (dep.dependencyType === "blocks") return "blocked_by";
      if (dep.dependencyType === "blocked_by") return "blocks";
      if (dep.dependencyType === "parent_of") return "child_of";
      if (dep.dependencyType === "child_of") return "parent_of";
      return dep.dependencyType;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Dependencies</h3>
          {dependencies && dependencies.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {dependencies.length}
            </Badge>
          )}
        </div>
        {canEdit && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-add-dependency">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task Dependency</DialogTitle>
                <DialogDescription>
                  Link this task to another task to show their relationship
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Relationship Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger data-testid="select-dependency-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dependencyTypes.map((dt) => {
                        const Icon = dt.icon;
                        return (
                          <SelectItem key={dt.value} value={dt.value}>
                            <div className="flex items-center gap-2">
                              <Icon className={cn("w-4 h-4", dt.color)} />
                              <span>{dt.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {dependencyTypes.find((d) => d.value === selectedType)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Task Type</label>
                  <Select
                    value={selectedTargetTaskType}
                    onValueChange={(v) => {
                      setSelectedTargetTaskType(v as "content" | "team");
                      setSelectedTargetTask(null);
                    }}
                  >
                    <SelectTrigger data-testid="select-target-task-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content">Content Task</SelectItem>
                      <SelectItem value="team">Team Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Task</label>
                  <Popover open={taskSearchOpen} onOpenChange={setTaskSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={taskSearchOpen}
                        className="w-full justify-between"
                        data-testid="button-select-target-task"
                      >
                        {selectedTargetTask
                          ? availableTasks?.find((t) => t.id === selectedTargetTask)?.description?.slice(0, 50) ||
                            `Task #${selectedTargetTask}`
                          : "Select a task..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search tasks..." />
                        <CommandList>
                          <CommandEmpty>No tasks found.</CommandEmpty>
                          <CommandGroup>
                            {availableTasks?.map((task) => (
                              <CommandItem
                                key={task.id}
                                value={task.description || `Task ${task.id}`}
                                onSelect={() => {
                                  setSelectedTargetTask(task.id);
                                  setTaskSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTargetTask === task.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm">
                                    #{task.id}: {task.description?.slice(0, 50)}
                                    {task.description && task.description.length > 50 ? "..." : ""}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {task.status}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!selectedTargetTask || createMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-dependency"
                >
                  {createMutation.isPending ? "Adding..." : "Add Dependency"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {dependencies && dependencies.length > 0 ? (
        <div className="space-y-2">
          {dependencies.map((dep) => {
            const displayType = getDisplayType(dep);
            const config = getDependencyConfig(displayType);
            const Icon = config.icon;

            return (
              <div
                key={dep.id}
                className="flex items-center justify-between p-2 rounded-md border bg-card"
                data-testid={`dependency-${dep.id}`}
              >
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "p-1.5 rounded-md bg-muted/50",
                          config.color
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{config.label}</TooltipContent>
                  </Tooltip>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {getLinkedTaskTitle(dep)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {config.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        data-testid={`button-view-dependency-${dep.id}`}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View linked task</TooltipContent>
                  </Tooltip>
                  
                  {canEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(dep.id)}
                          data-testid={`button-delete-dependency-${dep.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove dependency</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-4 text-center text-muted-foreground border rounded-md bg-muted/10" data-testid="empty-dependencies">
          <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No dependencies</p>
          <p className="text-xs">Link this task to related tasks</p>
        </div>
      )}
    </div>
  );
}
