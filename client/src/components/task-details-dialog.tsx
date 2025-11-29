import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import type { ContentTask, Subtask, Campaign, DirectoryMember, User } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  Building2, 
  UserCheck,
  Flag,
  CheckCircle2,
  ListTodo,
  X,
  Pencil,
  Lock,
  Unlock,
  AlertTriangle,
  Shield,
  ChevronRight,
  CheckCircle,
  Circle,
  Clock,
  Save,
  RotateCcw,
  Zap,
  AlertCircle,
  FileText,
  Eye,
  MessageSquare,
  Timer
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
    icon: Circle,
    nextStatus: "IN PROGRESS",
    nextLabel: "Start Task",
  },
  "IN PROGRESS": {
    className: "bg-primary/10 text-primary border-primary/20",
    icon: Clock,
    nextStatus: "COMPLETED",
    nextLabel: "Complete Task",
  },
  "COMPLETED": {
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle,
    nextStatus: null,
    nextLabel: null,
  },
};

const priorityConfig = {
  low: { className: "text-muted-foreground", label: "Low", icon: Flag, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  medium: { className: "text-blue-600 dark:text-blue-400", label: "Medium", icon: Flag, color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  high: { className: "text-amber-600 dark:text-amber-400", label: "High", icon: AlertCircle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  urgent: { className: "text-destructive", label: "Urgent", icon: Zap, color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

interface PermissionBadgeProps {
  allowed: boolean;
  label: string;
  reason?: string;
}

function PermissionBadge({ allowed, label, reason }: PermissionBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn(
          "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
          allowed ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
        )}>
          {allowed ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          <span>{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{reason || (allowed ? "You can perform this action" : "You don't have permission")}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function TaskDetailsDialog({ open, onOpenChange, task, onEdit, currentUserId }: TaskDetailsDialogProps) {
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editedClient, setEditedClient] = useState("");

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: open,
  });

  const { data: directoryMembers } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
    enabled: open,
  });

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

  // Determine user display name for matching
  const currentUserDisplayName = (() => {
    if (!currentUser) return null;
    const directoryMember = directoryMembers?.find(
      (m) => m.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    if (directoryMember) return directoryMember.person;
    const fullName = [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || currentUser.email;
  })();

  // Permission calculations
  const isAdmin = currentUser?.role === "admin";
  const isTaskOwner = task?.assignedTo?.toLowerCase() === currentUserDisplayName?.toLowerCase();
  const isTaskCreator = task?.assignedBy?.toLowerCase() === currentUserDisplayName?.toLowerCase();
  
  // Permission rules
  const permissions = {
    canEditStatus: isAdmin || isTaskOwner || isTaskCreator,
    canEditPriority: isAdmin || isTaskCreator,
    canEditAssignee: isAdmin || isTaskCreator,
    canEditDueDate: isAdmin || isTaskCreator,
    canEditClient: isAdmin || isTaskCreator,
    canEditNotes: isAdmin || isTaskOwner || isTaskCreator,
    canEditDescription: isAdmin || isTaskCreator,
    canEditCampaign: isAdmin || isTaskCreator,
    canAddSubtasks: isAdmin || isTaskOwner || isTaskCreator,
    canDeleteSubtasks: isAdmin || isTaskCreator,
    canToggleSubtasks: isAdmin || isTaskOwner || isTaskCreator,
    canRequestApproval: isAdmin || isTaskOwner,
    canRespondToApproval: isAdmin || true, // Anyone can respond if they're the approver
    canLogTime: isAdmin || isTaskOwner,
    canComment: true, // Everyone can comment
    canWatch: true, // Everyone can watch
    canDeleteTask: isAdmin,
  };

  // Reset state when task changes
  useEffect(() => {
    if (task) {
      setEditedNotes(task.notes || "");
      setEditedDescription(task.description || "");
      setEditedClient(task.client || "");
      if (task.dueDate) {
        const parsed = new Date(task.dueDate);
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      } else {
        setSelectedDate(undefined);
      }
    }
  }, [task]);

  const updateTaskMutation = useMutation({
    mutationFn: async (updates: Partial<ContentTask>) => {
      if (!task) throw new Error("No task selected");
      return apiRequest("PUT", `/api/content-tasks/${task.id}`, {
        ...task,
        ...updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", task?.id, "activity"] });
      toast({
        title: "Task updated",
        description: "Changes saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task.",
        variant: "destructive",
      });
    },
  });

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

  const handleStatusChange = (newStatus: string) => {
    if (!permissions.canEditStatus) return;
    updateTaskMutation.mutate({ status: newStatus });
  };

  const handlePriorityChange = (newPriority: string) => {
    if (!permissions.canEditPriority) return;
    updateTaskMutation.mutate({ priority: newPriority });
  };

  const handleAssigneeChange = (newAssignee: string | undefined) => {
    if (!permissions.canEditAssignee) return;
    updateTaskMutation.mutate({ assignedTo: newAssignee || null });
  };

  const handleDueDateChange = (date: Date | undefined) => {
    if (!permissions.canEditDueDate) return;
    setSelectedDate(date);
    updateTaskMutation.mutate({ 
      dueDate: date ? format(date, "MMM d, yyyy") : null 
    });
  };

  const handleClientChange = (newClient: string | undefined) => {
    if (!permissions.canEditClient) return;
    updateTaskMutation.mutate({ client: newClient || null });
  };

  const handleCampaignChange = (campaignId: number | undefined) => {
    if (!permissions.canEditCampaign) return;
    updateTaskMutation.mutate({ campaignId: campaignId || null });
  };

  const handleNotesSave = () => {
    if (!permissions.canEditNotes) return;
    updateTaskMutation.mutate({ notes: editedNotes || null });
    setIsEditingNotes(false);
  };

  const handleDescriptionSave = () => {
    if (!permissions.canEditDescription) return;
    updateTaskMutation.mutate({ description: editedDescription });
    setIsEditingDescription(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const completedSubtasks = subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  if (!task) return null;

  const statusStyle = statusConfig[task.status as keyof typeof statusConfig] || statusConfig["TO BE STARTED"];
  const priorityStyle = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig];
  const StatusIcon = statusStyle.icon;
  const PriorityIcon = priorityStyle.icon;

  // Get unique clients from tasks for the dropdown
  const uniqueClients = Array.from(new Set(
    directoryMembers?.map(m => m.person).filter(Boolean) || []
  ));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-task-details">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              {/* Status and Priority Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Inline Status Selector */}
                {permissions.canEditStatus ? (
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className={cn("w-auto h-7 text-xs gap-1", statusStyle.className)} data-testid="select-status">
                      <StatusIcon className="w-3 h-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([status, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={status} value={status}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {status}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={cn("text-xs", statusStyle.className)}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {task.status}
                  </Badge>
                )}

                {/* Inline Priority Selector */}
                {permissions.canEditPriority ? (
                  <Select value={task.priority || "medium"} onValueChange={handlePriorityChange}>
                    <SelectTrigger className={cn("w-auto h-7 text-xs gap-1", priorityStyle.color)} data-testid="select-priority">
                      <PriorityIcon className="w-3 h-3" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([priority, config]) => {
                        const Icon = config.icon;
                        return (
                          <SelectItem key={priority} value={priority}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded", priorityStyle.color)}>
                    <PriorityIcon className="w-3 h-3" />
                    <span>{priorityStyle.label}</span>
                  </div>
                )}

                {/* Admin badge */}
                {isAdmin && (
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>

              {/* Editable Title */}
              {isEditingDescription ? (
                <div className="flex items-start gap-2">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="text-lg font-semibold resize-none"
                    rows={2}
                    autoFocus
                    data-testid="input-edit-description"
                  />
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={handleDescriptionSave} data-testid="button-save-description">
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => {
                      setIsEditingDescription(false);
                      setEditedDescription(task.description);
                    }} data-testid="button-cancel-description">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <DialogTitle className="text-xl flex-1" data-testid="text-task-title">
                    {task.description}
                  </DialogTitle>
                  {permissions.canEditDescription && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                      onClick={() => setIsEditingDescription(true)}
                      data-testid="button-edit-description"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}

              {/* Campaign */}
              {permissions.canEditCampaign ? (
                <Select 
                  value={task.campaignId?.toString() || "none"} 
                  onValueChange={(value) => handleCampaignChange(value === "none" ? undefined : parseInt(value))}
                >
                  <SelectTrigger className="w-auto h-7 text-xs text-muted-foreground" data-testid="select-campaign">
                    <div className="flex items-center gap-1.5">
                      {campaign && (
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: campaign.color || "#3B82F6" }}
                        />
                      )}
                      <SelectValue placeholder="No campaign" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No campaign</SelectItem>
                    {campaigns?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: c.color || "#3B82F6" }}
                          />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : campaign ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: campaign.color || "#3B82F6" }}
                  />
                  <span>{campaign.name}</span>
                </div>
              ) : null}
            </div>

            {/* Edit button for full edit dialog */}
            {onEdit && (isAdmin || isTaskCreator) && (
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
                Full Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 mt-4 pb-4">
            {/* Permission Summary */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                {isAdmin ? (
                  <>
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Admin Access - You can do everything</span>
                  </>
                ) : isTaskOwner ? (
                  <>
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span>Your Task - You're assigned to this</span>
                  </>
                ) : isTaskCreator ? (
                  <>
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>You created this task</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span>Viewing - Limited permissions</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <PermissionBadge 
                  allowed={permissions.canEditStatus} 
                  label="Status" 
                  reason={permissions.canEditStatus ? "You can change the task status" : "Only task owner, creator, or admin can change status"}
                />
                <PermissionBadge 
                  allowed={permissions.canEditAssignee} 
                  label="Reassign" 
                  reason={permissions.canEditAssignee ? "You can reassign this task" : "Only task creator or admin can reassign"}
                />
                <PermissionBadge 
                  allowed={permissions.canLogTime} 
                  label="Log Time" 
                  reason={permissions.canLogTime ? "You can log time on this task" : "Only task owner or admin can log time"}
                />
                <PermissionBadge 
                  allowed={permissions.canComment} 
                  label="Comment" 
                  reason="Everyone can comment on tasks"
                />
              </div>
            </div>

            {/* Quick Status Change */}
            {permissions.canEditStatus && statusStyle.nextStatus && (
              <Button
                className="w-full"
                onClick={() => handleStatusChange(statusStyle.nextStatus!)}
                disabled={updateTaskMutation.isPending}
                data-testid="button-quick-status"
              >
                <ChevronRight className="w-4 h-4 mr-2" />
                {statusStyle.nextLabel}
              </Button>
            )}

            {/* Task Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignee */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  Assigned To
                  {!permissions.canEditAssignee && <Lock className="w-3 h-3" />}
                </label>
                {permissions.canEditAssignee ? (
                  <Select 
                    value={task.assignedTo || "unassigned"} 
                    onValueChange={(value) => handleAssigneeChange(value === "unassigned" ? undefined : value)}
                  >
                    <SelectTrigger className="h-9" data-testid="select-assignee">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {directoryMembers?.map((member) => (
                        <SelectItem key={member.id} value={member.person}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {getInitials(member.person)}
                              </AvatarFallback>
                            </Avatar>
                            {member.person}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/30">
                    {task.assignedTo ? (
                      <>
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {getInitials(task.assignedTo)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{task.assignedTo}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  Due Date
                  {!permissions.canEditDueDate && <Lock className="w-3 h-3" />}
                </label>
                {permissions.canEditDueDate ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9",
                          !selectedDate && "text-muted-foreground"
                        )}
                        data-testid="button-due-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Set due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDueDateChange}
                        initialFocus
                      />
                      {selectedDate && (
                        <div className="p-2 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full"
                            onClick={() => handleDueDateChange(undefined)}
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/30">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{task.dueDate || "No due date"}</span>
                  </div>
                )}
              </div>

              {/* Client */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Client
                  {!permissions.canEditClient && <Lock className="w-3 h-3" />}
                </label>
                {permissions.canEditClient ? (
                  <Input
                    value={editedClient}
                    onChange={(e) => setEditedClient(e.target.value)}
                    onBlur={() => {
                      if (editedClient !== (task.client || "")) {
                        handleClientChange(editedClient || undefined);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Enter client name"
                    className="h-9"
                    data-testid="input-client"
                  />
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/30">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{task.client || "No client"}</span>
                  </div>
                )}
              </div>

              {/* Assigned By */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <UserCheck className="w-3 h-3" />
                  Assigned By
                </label>
                <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/30">
                  {task.assignedBy ? (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(task.assignedBy)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.assignedBy}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unknown</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Notes
                  {!permissions.canEditNotes && <Lock className="w-3 h-3 text-muted-foreground" />}
                </label>
                {permissions.canEditNotes && !isEditingNotes && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                    data-testid="button-edit-notes"
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Add notes about this task..."
                    className="min-h-[100px] resize-none"
                    data-testid="input-notes"
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setIsEditingNotes(false);
                        setEditedNotes(task.notes || "");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleNotesSave}
                      disabled={updateTaskMutation.isPending}
                      data-testid="button-save-notes"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/30 rounded-md text-sm text-muted-foreground min-h-[60px]">
                  {task.notes || "No notes added yet."}
                </div>
              )}
            </div>

            {currentUserId && (
              <TaskWatchers taskId={task.id} currentUserId={currentUserId} />
            )}

            <Separator />

            {/* Subtasks Section */}
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
                {permissions.canAddSubtasks && !isAddingSubtask && (
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
                {!permissions.canAddSubtasks && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="w-3 h-3 mr-1" />
                        View only
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Only task owner, creator, or admin can add subtasks
                    </TooltipContent>
                  </Tooltip>
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
                          disabled={!permissions.canToggleSubtasks}
                          onCheckedChange={(checked) => {
                            if (permissions.canToggleSubtasks) {
                              updateSubtaskMutation.mutate({
                                id: subtask.id,
                                completed: !!checked,
                              });
                            }
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
                        {permissions.canDeleteSubtasks && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
                            data-testid={`button-delete-subtask-${subtask.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
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

            {/* Approvals Section */}
            {currentUserId && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {!permissions.canRequestApproval && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          <Lock className="w-3 h-3 mr-1" />
                          Cannot request
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        Only task owner or admin can request approvals
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <TaskApprovals taskId={task.id} currentUserId={currentUserId} />
              </div>
            )}

            <Separator />

            {/* Time Tracking Section */}
            <div className="space-y-2">
              {!permissions.canLogTime && (
                <div className="flex items-center justify-end mb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        View only
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Only task owner or admin can log time
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
              <TaskTimeTracking 
                taskId={task.id} 
                currentUserId={currentUserId} 
              />
            </div>

            <Separator />

            {/* Comments Section */}
            {currentUserId && (
              <TaskComments taskId={task.id} currentUserId={currentUserId} />
            )}

            <Separator />

            <TaskActivityTimeline taskId={task.id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
