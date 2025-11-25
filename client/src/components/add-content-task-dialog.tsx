import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContentTaskSchema, type InsertContentTask, type DirectoryMember, type ContentTask, type Campaign } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

interface AddContentTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: ContentTask;
}

export function AddContentTaskDialog({ open, onOpenChange, task }: AddContentTaskDialogProps) {
  const { toast } = useToast();
  const [currentUser] = useState(() => {
    const stored = localStorage.getItem("currentUser");
    return stored && stored.trim() !== "" ? stored : undefined;
  });

  const isEditing = !!task;

  const { data: directoryMembers } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
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
    } else {
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
    }
  }, [task, currentUser, form]);

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertContentTask) => {
      return await apiRequest("POST", "/api/content-tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({
        title: "Task created",
        description: "The task has been successfully created.",
      });
      form.reset();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the task details below."
              : "Create a new content task and assign it to a team member."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Idea</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the content task..."
                      className="resize-none min-h-[100px]"
                      data-testid="input-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TO BE STARTED">To Be Started</SelectItem>
                        <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "medium"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-assignedto">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {directoryMembers?.map((member) => (
                          <SelectItem key={member.id} value={member.person}>
                            {member.person}
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
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign (Optional)</FormLabel>
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
                        <SelectItem value="none">None</SelectItem>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Nov 26"
                        data-testid="input-duedate"
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
                          } else {
                            localStorage.removeItem("currentUser");
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <FormField
              control={form.control}
              name="deliverable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deliverable</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Expected deliverable"
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      className="resize-none"
                      data-testid="input-notes"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
