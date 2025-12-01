import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Lightbulb, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send,
  Calendar,
  CreditCard,
  Loader2,
  Edit,
  Trash2,
  Eye,
  User as UserIcon,
  MessageSquare,
  Building2
} from "lucide-react";
import type { ContentIdea, User } from "@shared/schema";

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const contentTypes = [
  { value: "blog_post", label: "Blog Post" },
  { value: "social_media", label: "Social Media" },
  { value: "video", label: "Video" },
  { value: "graphic", label: "Graphic/Design" },
  { value: "newsletter", label: "Newsletter" },
  { value: "whitepaper", label: "Whitepaper" },
  { value: "case_study", label: "Case Study" },
  { value: "podcast", label: "Podcast" },
  { value: "infographic", label: "Infographic" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function ContentIdeasManageView() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

  const { data: ideas, isLoading } = useQuery<ContentIdea[]>({
    queryKey: ["/api/content-ideas"],
  });

  const { data: users } = useQuery<Array<{ id: string; firstName: string | null; lastName: string | null; email: string; role: string }>>({
    queryKey: ["/api/users"],
  });

  // Filter to only show content-role users (clients who can approve ideas)
  const clientUsers = (users || []).filter(u => u.role === "content");

  const filteredIdeas = filter === "all" 
    ? ideas || []
    : (ideas || []).filter(i => i.status === filter);

  const pendingCount = (ideas || []).filter(i => i.status === "pending").length;
  const approvedCount = (ideas || []).filter(i => i.status === "approved").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Content Ideas
          </h3>
          <p className="text-sm text-muted-foreground">
            Pitch content ideas to clients for approval before production
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[150px]" data-testid="select-ideas-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ideas ({ideas?.length || 0})</SelectItem>
              <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
              <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
              <SelectItem value="denied">Declined</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-new-idea">
            <Plus className="h-4 w-4 mr-2" />
            New Idea
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ideas</CardDescription>
            <CardTitle className="text-2xl">{ideas?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Approval</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-2xl text-green-600">{approvedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ready for Production</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {(ideas || []).filter(i => i.status === "approved" && !i.relatedTaskId).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {filteredIdeas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No content ideas yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {filter === "pending" 
                ? "No ideas are awaiting client approval."
                : "Create your first content idea to pitch to clients."
              }
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Idea
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIdeas.map((idea) => (
            <IdeaCard 
              key={idea.id} 
              idea={idea} 
              clientUsers={clientUsers}
              onView={() => { setSelectedIdea(idea); setEditMode(false); }}
              onEdit={() => { setSelectedIdea(idea); setEditMode(true); }}
            />
          ))}
        </div>
      )}

      <CreateIdeaDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        clientUsers={clientUsers}
      />

      <IdeaDetailDialog
        idea={selectedIdea}
        clientUsers={clientUsers}
        editMode={editMode}
        onClose={() => { setSelectedIdea(null); setEditMode(false); }}
        onToggleEdit={() => setEditMode(!editMode)}
      />
    </div>
  );
}

type ClientUser = { id: string; firstName: string | null; lastName: string | null; email: string; role: string };

function getClientName(client: ClientUser | null | undefined): string {
  if (!client) return "Unknown Client";
  if (client.firstName || client.lastName) {
    return `${client.firstName || ""} ${client.lastName || ""}`.trim();
  }
  return client.email;
}

function IdeaCard({ 
  idea, 
  clientUsers,
  onView,
  onEdit 
}: { 
  idea: ContentIdea; 
  clientUsers: ClientUser[];
  onView: () => void;
  onEdit: () => void;
}) {
  const client = clientUsers.find(c => c.id === idea.clientId);
  
  return (
    <Card 
      className={`hover-elevate ${idea.status === "pending" ? "border-yellow-500/50" : idea.status === "approved" ? "border-green-500/50" : ""}`} 
      data-testid={`idea-card-${idea.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{idea.title}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Building2 className="h-3 w-3" />
              {getClientName(client)}
            </CardDescription>
          </div>
          {getStatusBadge(idea.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {idea.description}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">
            {idea.contentType.replace("_", " ")}
          </Badge>
          {idea.estimatedCost && (
            <span className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              {formatCurrency(idea.estimatedCost)}
            </span>
          )}
          {idea.estimatedDays && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {idea.estimatedDays}d
            </span>
          )}
        </div>
        {idea.clientNotes && idea.status !== "pending" && (
          <div className="p-2 bg-muted rounded-md text-xs">
            <span className="font-medium">Client: </span>
            {idea.clientNotes}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 gap-2">
        <Button variant="ghost" size="sm" onClick={onView} data-testid={`button-view-idea-${idea.id}`}>
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {idea.status === "pending" && (
          <Button variant="ghost" size="sm" onClick={onEdit} data-testid={`button-edit-idea-${idea.id}`}>
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function getStatusBadge(status: string) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" />, label: "Pending" },
    approved: { variant: "default", icon: <CheckCircle className="h-3 w-3" />, label: "Approved" },
    denied: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Declined" },
    in_production: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" />, label: "In Production" },
    completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" />, label: "Completed" },
  };
  const c = config[status] || config.pending;
  return (
    <Badge variant={c.variant} className="gap-1">
      {c.icon}
      {c.label}
    </Badge>
  );
}

function CreateIdeaDialog({ 
  open, 
  onOpenChange,
  clientUsers
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  clientUsers: ClientUser[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("blog_post");
  const [clientId, setClientId] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [estimatedDays, setEstimatedDays] = useState("");
  const [priority, setPriority] = useState("normal");
  const [teamNotes, setTeamNotes] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/content-ideas", {
        title,
        description,
        contentType,
        clientId, // User ID is a string (varchar)
        estimatedCost: estimatedCost ? parseInt(estimatedCost) * 100 : null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
        priority,
        teamNotes: teamNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea created", description: "The idea has been sent to the client for approval." });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to create idea", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContentType("blog_post");
    setClientId("");
    setEstimatedCost("");
    setEstimatedDays("");
    setPriority("normal");
    setTeamNotes("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            New Content Idea
          </DialogTitle>
          <DialogDescription>
            Pitch a new content idea to a client for approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger data-testid="select-idea-client">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clientUsers.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {getClientName(client)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Monthly Newsletter Series"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-idea-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the content idea, objectives, and expected outcomes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="input-idea-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger data-testid="select-idea-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-idea-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Estimated Cost ($)</Label>
              <Input
                id="cost"
                type="number"
                placeholder="e.g., 500"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                data-testid="input-idea-cost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Estimated Days</Label>
              <Input
                id="days"
                type="number"
                placeholder="e.g., 5"
                value={estimatedDays}
                onChange={(e) => setEstimatedDays(e.target.value)}
                data-testid="input-idea-days"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="teamNotes">Team Notes (visible to client)</Label>
            <Textarea
              id="teamNotes"
              placeholder="Additional context, references, or notes for the client..."
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              rows={2}
              data-testid="input-idea-team-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!title || !description || !clientId || createMutation.isPending}
            data-testid="button-submit-idea"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IdeaDetailDialog({
  idea,
  clientUsers,
  editMode,
  onClose,
  onToggleEdit,
}: {
  idea: ContentIdea | null;
  clientUsers: ClientUser[];
  editMode: boolean;
  onClose: () => void;
  onToggleEdit: () => void;
}) {
  const { toast } = useToast();
  const client = idea ? clientUsers.find(c => c.id === idea.clientId) : null;
  
  const [title, setTitle] = useState(idea?.title || "");
  const [description, setDescription] = useState(idea?.description || "");
  const [estimatedCost, setEstimatedCost] = useState(idea?.estimatedCost ? (idea.estimatedCost / 100).toString() : "");
  const [estimatedDays, setEstimatedDays] = useState(idea?.estimatedDays?.toString() || "");
  const [priority, setPriority] = useState(idea?.priority || "normal");
  const [teamNotes, setTeamNotes] = useState(idea?.teamNotes || "");

  const updateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/content-ideas/${idea?.id}`, {
        title,
        description,
        estimatedCost: estimatedCost ? parseInt(estimatedCost) * 100 : null,
        estimatedDays: estimatedDays ? parseInt(estimatedDays) : null,
        priority,
        teamNotes: teamNotes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea updated" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update idea", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/content-ideas/${idea?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea deleted" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to delete idea", variant: "destructive" });
    },
  });

  if (!idea) return null;

  return (
    <Dialog open={!!idea} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle>{editMode ? "Edit Idea" : idea.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3" />
                {getClientName(client)}
              </DialogDescription>
            </div>
            {!editMode && getStatusBadge(idea.status)}
          </div>
        </DialogHeader>

        {editMode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-testid="input-edit-idea-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                data-testid="input-edit-idea-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cost">Estimated Cost ($)</Label>
                <Input
                  id="edit-cost"
                  type="number"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  data-testid="input-edit-idea-cost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-days">Estimated Days</Label>
                <Input
                  id="edit-days"
                  type="number"
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  data-testid="input-edit-idea-days"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-edit-idea-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-team-notes">Team Notes</Label>
              <Textarea
                id="edit-team-notes"
                value={teamNotes}
                onChange={(e) => setTeamNotes(e.target.value)}
                rows={2}
                data-testid="input-edit-idea-team-notes"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{idea.description}</p>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline" className="ml-1 capitalize">
                  {idea.contentType.replace("_", " ")}
                </Badge>
              </div>
              {idea.estimatedCost && (
                <div>
                  <span className="text-muted-foreground">Est. Cost:</span>
                  <span className="font-medium ml-1">{formatCurrency(idea.estimatedCost)}</span>
                </div>
              )}
              {idea.estimatedDays && (
                <div>
                  <span className="text-muted-foreground">Timeline:</span>
                  <span className="font-medium ml-1">~{idea.estimatedDays} days</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <span className="font-medium ml-1 capitalize">{idea.priority}</span>
              </div>
            </div>

            {idea.teamNotes && (
              <div className="p-3 bg-muted rounded-md">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Team Notes
                </h4>
                <p className="text-sm text-muted-foreground">{idea.teamNotes}</p>
              </div>
            )}

            {idea.clientNotes && (
              <div className="p-3 border rounded-md">
                <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  Client Feedback
                </h4>
                <p className="text-sm text-muted-foreground">{idea.clientNotes}</p>
              </div>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              Created: {idea.createdAt ? new Date(idea.createdAt).toLocaleDateString() : "Unknown"}
              {idea.approvedAt && ` | Approved: ${new Date(idea.approvedAt).toLocaleDateString()}`}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={onToggleEdit}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                data-testid="button-save-idea"
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {idea.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-idea"
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={onToggleEdit} data-testid="button-edit-idea">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
