import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, addWeeks, getDay } from "date-fns";
import { insertContentTaskSchema, type InsertContentTask, type DirectoryMember, type ContentTask, type Campaign, type TaskTemplate } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Sparkles,
  FileText,
  Users,
  Settings2,
  Zap,
  AlertCircle,
  Flag,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddContentTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: ContentTask;
}

interface SubtaskInput {
  title: string;
  id: string;
}

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700", icon: Flag },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800", icon: Flag },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-orange-200 dark:border-orange-800", icon: AlertCircle },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800", icon: Zap },
};


export function AddContentTaskDialog({ open, onOpenChange, task }: AddContentTaskDialogProps) {
  const { toast } = useToast();
  const [currentUser] = useState(() => {
    const stored = localStorage.getItem("currentUser");
    return stored && stored.trim() !== "" ? stored : undefined;
  });

  const isEditing = !!task;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [createAnother, setCreateAnother] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignment, setShowAssignment] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string | undefined>();

  const { data: directoryMembers } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: templates } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const form = useForm<InsertContentTask>({
    resolver: zodResolver(insertContentTaskSchema),
    defaultValues: {
      description: "",
      status: "TO BE STARTED",
      assignedTo: undefined,
      dueDate: undefined,
      assignedBy: currentUser,
      client: undefined,
      deliverable: undefined,
      notes: undefined,
      priority: "medium",
      campaignId: undefined,
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        description: task.description || "",
        status: task.status,
        assignedTo: task.assignedTo || undefined,
        dueDate: task.dueDate || undefined,
        assignedBy: task.assignedBy || currentUser,
        client: task.client || undefined,
        deliverable: task.deliverable || undefined,
        notes: task.notes || undefined,
        priority: task.priority || "medium",
        campaignId: task.campaignId || undefined,
      });
      if (task.dueDate) {
        const parsed = new Date(task.dueDate);
        if (!isNaN(parsed.getTime())) {
          setSelectedDate(parsed);
        }
      }
      setShowDetails(true);
      setShowAssignment(true);
    } else {
      resetForm();
    }
  }, [task, currentUser, form, open]);

  const resetForm = () => {
    form.reset({
      description: "",
      status: "TO BE STARTED",
      assignedTo: undefined,
      dueDate: undefined,
      assignedBy: currentUser,
      client: undefined,
      deliverable: undefined,
      notes: undefined,
      priority: "medium",
      campaignId: undefined,
    });
    setSelectedDate(undefined);
    setSubtasks([]);
    setNewSubtask("");
    setSelectedTemplate(undefined);
    setShowDetails(false);
    setShowAssignment(true);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates?.find(t => t.id.toString() === templateId);
    if (template) {
      form.setValue("description", template.description || "");
      form.setValue("priority", template.defaultPriority || "medium");
      form.setValue("client", template.defaultClient || undefined);
      setSelectedTemplate(templateId);
      toast({
        title: "Template applied",
        description: `"${template.name}" template has been loaded.`,
      });
    }
  };

  const handleDatePreset = (preset: "today" | "tomorrow" | "next_week" | "monday") => {
    const today = new Date();
    let date: Date;
    switch (preset) {
      case "today":
        date = today;
        break;
      case "tomorrow":
        date = addDays(today, 1);
        break;
      case "next_week":
        date = addWeeks(today, 1);
        break;
      case "monday":
        // Calculate next Monday: current day (0=Sun, 1=Mon, ..., 6=Sat)
        const dayOfWeek = getDay(today);
        const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
        date = addDays(today, daysUntilMonday);
        break;
    }
    setSelectedDate(date);
    form.setValue("dueDate", format(date, "MMM d, yyyy"));
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { title: newSubtask.trim(), id: crypto.randomUUID() }]);
      setNewSubtask("");
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertContentTask) => {
      const response = await apiRequest("POST", "/api/content-tasks", data);
      const createdTask = await response.json();
      
      // Create subtasks if any
      if (subtasks.length > 0 && createdTask.id) {
        await Promise.all(
          subtasks.map((subtask, index) =>
            apiRequest("POST", `/api/content-tasks/${createdTask.id}/subtasks`, {
              taskId: createdTask.id,
              title: subtask.title,
              order: index,
              completed: false,
            })
          )
        );
      }
      
      return createdTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({
        title: "Task created",
        description: subtasks.length > 0 
          ? `Task created with ${subtasks.length} subtask${subtasks.length > 1 ? "s" : ""}.`
          : "The task has been successfully created.",
      });
      
      if (createAnother) {
        resetForm();
      } else {
        resetForm();
        onOpenChange(false);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: InsertContentTask) => {
      return await apiRequest("PUT", `/api/content-tasks/${task!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({
        title: "Task updated",
        description: "The task has been successfully updated.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContentTask) => {
    if (isEditing) {
      updateTaskMutation.mutate(data);
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const currentPriority = form.watch("priority") || "medium";

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetForm();
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <FileText className="h-5 w-5" />
                Edit Task
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create New Task
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below."
              : "Fill in the essentials and add more details as needed."}
          </DialogDescription>
        </DialogHeader>

        {/* Template Selection - Only show for new tasks */}
        {!isEditing && templates && templates.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Quick start:</span>
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="w-auto h-8 text-sm" data-testid="select-template">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />
                      {template.name}
                      {template.category && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          {template.category}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Description - Always visible */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">What needs to be done?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the task clearly..."
                      className="resize-none min-h-[80px]"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority Selection - Visual buttons */}
            <div>
              <FormLabel className="text-sm font-medium mb-2 block">Priority</FormLabel>
              <div className="flex flex-wrap gap-2">
                {Object.entries(priorityConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = currentPriority === key;
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "transition-all border",
                        isSelected ? config.color : "hover:bg-muted"
                      )}
                      onClick={() => form.setValue("priority", key)}
                      data-testid={`priority-${key}`}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                      {isSelected && <CheckCircle2 className="h-3 w-3 ml-1" />}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Due Date with Presets */}
            <div>
              <FormLabel className="text-sm font-medium mb-2 block">Due Date</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset("today")}
                  data-testid="date-today"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset("tomorrow")}
                  data-testid="date-tomorrow"
                >
                  Tomorrow
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset("monday")}
                  data-testid="date-monday"
                >
                  Next Monday
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDatePreset("next_week")}
                  data-testid="date-next-week"
                >
                  Next Week
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                      data-testid="date-picker-trigger"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date) {
                          form.setValue("dueDate", format(date, "MMM d, yyyy"));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(undefined);
                      form.setValue("dueDate", undefined);
                    }}
                    data-testid="clear-date"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  Due: {format(selectedDate, "EEEE, MMMM d, yyyy")}
                </p>
              )}
            </div>

            <Separator />

            {/* Assignment Section - Collapsible */}
            <Collapsible open={showAssignment} onOpenChange={setShowAssignment}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto"
                  data-testid="toggle-assignment"
                >
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Assignment & Campaign</span>
                    {form.watch("assignedTo") && (
                      <Badge variant="secondary" className="ml-2">
                        {form.watch("assignedTo")}
                      </Badge>
                    )}
                  </span>
                  {showAssignment ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Assignee Selection with Avatars */}
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {directoryMembers?.slice(0, 6).map((member) => {
                          const isSelected = field.value === member.person;
                          return (
                            <Button
                              key={member.id}
                              type="button"
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className="h-auto py-1 px-2"
                              onClick={() => field.onChange(isSelected ? undefined : member.person)}
                              data-testid={`assignee-${member.id}`}
                            >
                              <Avatar className="h-5 w-5 mr-1">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(member.person)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[100px]">{member.person}</span>
                              {member.skill && (
                                <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                                  {member.skill.split(",")[0]}
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                        {directoryMembers && directoryMembers.length > 6 && (
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <SelectTrigger className="w-[120px] h-8" data-testid="select-more-assignees">
                              <SelectValue placeholder="More..." />
                            </SelectTrigger>
                            <SelectContent>
                              {directoryMembers.map((member) => (
                                <SelectItem key={member.id} value={member.person}>
                                  {member.person}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="campaignId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                          value={field.value?.toString() || "none"}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-campaign">
                              <SelectValue placeholder="Select campaign" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No campaign</SelectItem>
                            {campaigns?.map((campaign) => (
                              <SelectItem key={campaign.id} value={campaign.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: campaign.color || "#3B82F6" }}
                                  />
                                  {campaign.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assigned By</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your name"
                            data-testid="input-assignedby"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              field.onChange(value || undefined);
                              if (value) {
                                localStorage.setItem("currentUser", value);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Additional Details - Collapsible */}
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto"
                  data-testid="toggle-details"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span className="font-medium">Additional Details</span>
                  </span>
                  {showDetails ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TO BE STARTED">To Be Started</SelectItem>
                            <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                            <SelectItem value="IN REVIEW">In Review</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="client"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Client name"
                            data-testid="input-client"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deliverable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deliverable</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What will be delivered? (e.g., Blog post, Video, Design)"
                          data-testid="input-deliverable"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional context, links, or instructions..."
                          className="resize-none min-h-[60px]"
                          data-testid="input-notes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Inline Subtasks - Only for new tasks */}
            {!isEditing && (
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Subtasks / Checklist
                </FormLabel>
                <div className="space-y-2">
                  {subtasks.map((subtask, index) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                      data-testid={`subtask-${index}`}
                    >
                      <div className="w-4 h-4 rounded border border-muted-foreground/30" />
                      <span className="flex-1 text-sm">{subtask.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeSubtask(subtask.id)}
                        data-testid={`remove-subtask-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a subtask..."
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSubtask();
                        }
                      }}
                      data-testid="input-new-subtask"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addSubtask}
                      disabled={!newSubtask.trim()}
                      data-testid="button-add-subtask"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {!isEditing && (
                <div className="flex items-center gap-2 mr-auto">
                  <Checkbox
                    id="create-another"
                    checked={createAnother}
                    onCheckedChange={(checked) => setCreateAnother(checked === true)}
                    data-testid="checkbox-create-another"
                  />
                  <label
                    htmlFor="create-another"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Create another
                  </label>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  data-testid={isEditing ? "button-update-task" : "button-create-task"}
                >
                  {(createTaskMutation.isPending || updateTaskMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
