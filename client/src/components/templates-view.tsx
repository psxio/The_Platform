import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, FileText, Copy, X, CheckCircle2 } from "lucide-react";

interface TemplateSubtask {
  id: number;
  templateId: number;
  title: string;
  order: number;
}

interface TaskTemplate {
  id: number;
  name: string;
  description: string | null;
  defaultPriority: string | null;
  defaultClient: string | null;
  estimatedHours: number | null;
  category: string | null;
  createdBy: string | null;
  createdAt: string | null;
  subtasks?: TemplateSubtask[];
}

export function TemplatesView() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultPriority: "medium",
    defaultClient: "",
    estimatedHours: "",
    category: "",
    subtasks: [] as string[],
  });
  const [newSubtask, setNewSubtask] = useState("");

  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ["/api/task-templates"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/task-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: "Template created", description: "Your task template has been created successfully." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PUT", `/api/task-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: "Template updated", description: "Your task template has been updated successfully." });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/task-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-templates"] });
      toast({ title: "Template deleted", description: "The template has been deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return await apiRequest("POST", `/api/task-templates/${templateId}/create-task`, { overrides: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({ title: "Task created", description: "A new task has been created from this template." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create task from template.", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      defaultPriority: "medium",
      defaultClient: "",
      estimatedHours: "",
      category: "",
      subtasks: [],
    });
    setNewSubtask("");
  };

  const openEditDialog = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      defaultPriority: template.defaultPriority || "medium",
      defaultClient: template.defaultClient || "",
      estimatedHours: template.estimatedHours?.toString() || "",
      category: template.category || "",
      subtasks: template.subtasks?.map(s => s.title) || [],
    });
    setIsDialogOpen(true);
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setFormData(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, newSubtask.trim()],
      }));
      setNewSubtask("");
    }
  };

  const removeSubtask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Template name is required.", variant: "destructive" });
      return;
    }

    const data = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      defaultPriority: formData.defaultPriority,
      defaultClient: formData.defaultClient.trim() || null,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
      category: formData.category.trim() || null,
      subtasks: formData.subtasks,
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Task Templates</h2>
          <p className="text-muted-foreground text-sm">
            Create reusable templates for common task types to speed up task creation.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-medium text-lg">No templates yet</h3>
              <p className="text-muted-foreground text-sm">
                Create your first template to quickly generate tasks with predefined settings.
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-template">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group" data-testid={`card-template-${template.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="outline" className="mt-1">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => openEditDialog(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {template.description && (
                  <CardDescription className="line-clamp-2 mt-2">
                    {template.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {template.defaultPriority && (
                    <Badge variant={getPriorityColor(template.defaultPriority)}>
                      {template.defaultPriority} priority
                    </Badge>
                  )}
                  {template.defaultClient && (
                    <Badge variant="secondary">{template.defaultClient}</Badge>
                  )}
                  {template.estimatedHours && (
                    <Badge variant="outline">{template.estimatedHours}h est.</Badge>
                  )}
                </div>
                
                {template.subtasks && template.subtasks.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {template.subtasks.length} subtask{template.subtasks.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                
                <Button 
                  className="w-full mt-2" 
                  variant="outline"
                  onClick={() => createFromTemplateMutation.mutate(template.id)}
                  disabled={createFromTemplateMutation.isPending}
                  data-testid={`button-use-template-${template.id}`}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Create Task from Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Task Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? "Update this template's settings and default values."
                : "Create a reusable template with predefined task settings."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Social Media Post, Blog Article"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-template-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this template is used for..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                data-testid="input-template-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Default Priority</Label>
                <Select
                  value={formData.defaultPriority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, defaultPriority: value }))}
                >
                  <SelectTrigger data-testid="select-template-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedHours">Est. Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  placeholder="e.g., 4"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                  data-testid="input-template-hours"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Social Media, Blog"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  data-testid="input-template-category"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Default Client</Label>
                <Input
                  id="client"
                  placeholder="e.g., Client Name"
                  value={formData.defaultClient}
                  onChange={(e) => setFormData(prev => ({ ...prev, defaultClient: e.target.value }))}
                  data-testid="input-template-client"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subtasks (Checklist Items)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a subtask..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
                  data-testid="input-template-subtask"
                />
                <Button type="button" onClick={addSubtask} size="icon" variant="outline" data-testid="button-add-subtask">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formData.subtasks.length > 0 && (
                <div className="space-y-2 mt-2">
                  {formData.subtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-md p-2">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-sm">{subtask}</span>
                      <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6"
                        onClick={() => removeSubtask(index)}
                        data-testid={`button-remove-subtask-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-template">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
