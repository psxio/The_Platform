import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RecurringTask, TaskTemplate, DirectoryMember } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Repeat,
  Trash2,
  Edit,
  Calendar,
  Clock,
  User,
  Loader2,
  Play,
  Pause,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, addWeeks, addMonths } from "date-fns";

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-slate-500" },
  { value: "medium", label: "Medium", color: "bg-blue-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "urgent", label: "Urgent", color: "bg-red-500" },
];

function getNextRunDate(task: RecurringTask): string {
  if (!task.isActive) return "Paused";
  if (task.nextGenerationAt) {
    return format(new Date(task.nextGenerationAt), "MMM d, yyyy");
  }
  
  const now = new Date();
  switch (task.frequency) {
    case "daily":
      return format(addDays(now, 1), "MMM d, yyyy");
    case "weekly":
      return format(addWeeks(now, 1), "MMM d, yyyy");
    case "biweekly":
      return format(addWeeks(now, 2), "MMM d, yyyy");
    case "monthly":
      return format(addMonths(now, 1), "MMM d, yyyy");
    default:
      return "Unknown";
  }
}

function getFrequencyLabel(frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null): string {
  switch (frequency) {
    case "daily":
      return "Every day";
    case "weekly":
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        return `Every ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || "week"}`;
      }
      return "Every week";
    case "biweekly":
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        return `Every 2 weeks on ${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || ""}`;
      }
      return "Every 2 weeks";
    case "monthly":
      if (dayOfMonth) {
        const suffix = dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31 ? "st" 
          : dayOfMonth === 2 || dayOfMonth === 22 ? "nd" 
          : dayOfMonth === 3 || dayOfMonth === 23 ? "rd" 
          : "th";
        return `Monthly on the ${dayOfMonth}${suffix}`;
      }
      return "Monthly";
    default:
      return frequency;
  }
}

export function RecurringTasksView() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    frequency: "weekly",
    dayOfWeek: 1,
    dayOfMonth: 1,
    assignedTo: "",
    client: "",
    priority: "medium",
    templateId: null as number | null,
  });
  const { toast } = useToast();

  const { data: recurringTasks, isLoading } = useQuery<RecurringTask[]>({
    queryKey: ["/api/recurring-tasks"],
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const { data: members } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/recurring-tasks", {
        ...data,
        dayOfWeek: data.frequency === "weekly" || data.frequency === "biweekly" ? data.dayOfWeek : null,
        dayOfMonth: data.frequency === "monthly" ? data.dayOfMonth : null,
        templateId: data.templateId || null,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-tasks"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: "Recurring task created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create recurring task", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<RecurringTask> }) => {
      return apiRequest("PATCH", `/api/recurring-tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-tasks"] });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      toast({ title: "Recurring task updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update recurring task", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/recurring-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-tasks"] });
      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
      toast({ title: "Recurring task deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete recurring task", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      frequency: "weekly",
      dayOfWeek: 1,
      dayOfMonth: 1,
      assignedTo: "",
      client: "",
      priority: "medium",
      templateId: null,
    });
  };

  const handleEdit = (task: RecurringTask) => {
    setSelectedTask(task);
    setFormData({
      name: task.name,
      description: task.description || "",
      frequency: task.frequency,
      dayOfWeek: task.dayOfWeek || 1,
      dayOfMonth: task.dayOfMonth || 1,
      assignedTo: task.assignedTo || "",
      client: task.client || "",
      priority: task.priority || "medium",
      templateId: task.templateId,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (task: RecurringTask) => {
    setSelectedTask(task);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleActive = (task: RecurringTask) => {
    updateMutation.mutate({
      id: task.id,
      data: { isActive: !task.isActive },
    });
  };

  const handleSaveEdit = () => {
    if (!selectedTask) return;
    updateMutation.mutate({
      id: selectedTask.id,
      data: {
        ...formData,
        dayOfWeek: formData.frequency === "weekly" || formData.frequency === "biweekly" ? formData.dayOfWeek : null,
        dayOfMonth: formData.frequency === "monthly" ? formData.dayOfMonth : null,
        templateId: formData.templateId || null,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedTask) return;
    deleteMutation.mutate(selectedTask.id);
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "none") {
      setFormData({ ...formData, templateId: null });
      return;
    }
    const template = templates?.find(t => t.id === parseInt(templateId));
    if (template) {
      setFormData({
        ...formData,
        templateId: template.id,
        name: formData.name || template.name,
        description: formData.description || template.description || "",
        priority: template.defaultPriority || "medium",
        client: template.defaultClient || formData.client,
      });
    }
  };

  const activeCount = recurringTasks?.filter(t => t.isActive).length || 0;
  const pausedCount = recurringTasks?.filter(t => !t.isActive).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Repeat className="w-5 h-5" />
            Recurring Tasks
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up tasks that automatically repeat on a schedule
          </p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} data-testid="button-create-recurring">
          <Plus className="w-4 h-4 mr-2" />
          Create Recurring Task
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Badge variant="secondary" className="text-sm">
          <Play className="w-3 h-3 mr-1" />
          {activeCount} Active
        </Badge>
        <Badge variant="outline" className="text-sm">
          <Pause className="w-3 h-3 mr-1" />
          {pausedCount} Paused
        </Badge>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : recurringTasks?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No recurring tasks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first recurring task to automate repetitive work
            </p>
            <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Recurring Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recurringTasks?.map(task => (
            <Card 
              key={task.id} 
              className={cn(!task.isActive && "opacity-60")}
              data-testid={`recurring-task-${task.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{task.name}</h3>
                      {task.templateId && templates?.find(t => t.id === task.templateId) && (
                        <Badge variant="outline" className="text-xs">
                          Template: {templates?.find(t => t.id === task.templateId)?.name}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{getFrequencyLabel(task.frequency, task.dayOfWeek, task.dayOfMonth)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Next: {getNextRunDate(task)}</span>
                      </div>
                      {task.assignedTo && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{task.assignedTo}</span>
                        </div>
                      )}
                      {task.priority && (
                        <Badge 
                          className={cn(
                            "text-white",
                            PRIORITIES.find(p => p.value === task.priority)?.color
                          )}
                        >
                          {task.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor={`active-${task.id}`} className="text-sm text-muted-foreground">
                        {task.isActive ? "Active" : "Paused"}
                      </Label>
                      <Switch
                        id={`active-${task.id}`}
                        checked={task.isActive}
                        onCheckedChange={() => handleToggleActive(task)}
                        data-testid={`switch-active-${task.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(task)}
                      data-testid={`button-edit-recurring-${task.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task)}
                      data-testid={`button-delete-recurring-${task.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={isCreateDialogOpen || isEditDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedTask(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Recurring Task" : "Create Recurring Task"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? "Update the settings for this recurring task" 
                : "Set up a task that will be created automatically on a schedule"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {!isEditDialogOpen && templates && templates.length > 0 && (
              <div>
                <Label htmlFor="template">Start from Template (Optional)</Label>
                <Select 
                  value={formData.templateId?.toString() || "none"} 
                  onValueChange={handleTemplateSelect}
                >
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="name">Task Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Weekly Status Report"
                data-testid="input-recurring-name"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what needs to be done"
                rows={2}
                data-testid="input-recurring-description"
              />
            </div>
            
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select 
                value={formData.frequency} 
                onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(freq => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(formData.frequency === "weekly" || formData.frequency === "biweekly") && (
              <div>
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select 
                  value={formData.dayOfWeek.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-day-of-week">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {formData.frequency === "monthly" && (
              <div>
                <Label htmlFor="dayOfMonth">Day of Month</Label>
                <Select 
                  value={formData.dayOfMonth.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, dayOfMonth: parseInt(value) })}
                >
                  <SelectTrigger data-testid="select-day-of-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="assignedTo">Assign To</Label>
              <Select 
                value={formData.assignedTo || "unassigned"} 
                onValueChange={(value) => setFormData({ ...formData, assignedTo: value === "unassigned" ? "" : value })}
              >
                <SelectTrigger data-testid="select-assigned-to">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members?.map(member => (
                    <SelectItem key={member.id} value={member.person}>
                      {member.person}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="Client name"
                data-testid="input-recurring-client"
              />
            </div>
            
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                setSelectedTask(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={isEditDialogOpen ? handleSaveEdit : () => createMutation.mutate(formData)}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-recurring"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditDialogOpen ? (
                "Save Changes"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recurring Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedTask?.name}"? This will not affect tasks that have already been created.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-recurring"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
