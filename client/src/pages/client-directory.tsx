import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Plus,
  Building2,
  Users,
  Calendar,
  ExternalLink,
  Globe,
  Mail,
  MessageSquare,
  FileText,
  Loader2,
  ChevronRight,
  Tag,
  Clock,
  Briefcase,
  Activity,
  Link as LinkIcon,
  X,
  FolderOpen,
  Image,
  FileVideo,
  FileAudio,
  File,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { SiDiscord, SiTelegram, SiX } from "react-icons/si";
import type { ClientProfile, ClientCalendarEvent, ContentTask, Deliverable } from "@shared/schema";

function getFileIcon(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <Image className="w-4 h-4 text-blue-500" />;
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
    return <FileVideo className="w-4 h-4 text-purple-500" />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <FileAudio className="w-4 h-4 text-green-500" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  return <File className="w-4 h-4 text-muted-foreground" />;
}

const clientProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  industry: z.string().optional(),
  relationshipStatus: z.enum(["active", "prospect", "partner", "inactive", "paused"]).default("active"),
  website: z.string().optional(),
  notes: z.string().optional(),
  projectHistory: z.string().optional(),
  color: z.string().optional(),
});

type ClientProfileForm = z.infer<typeof clientProfileSchema>;

const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventType: z.enum(["deadline", "milestone", "meeting", "deliverable", "launch", "review", "other"]).default("other"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  allDay: z.boolean().default(false),
});

type CalendarEventForm = z.infer<typeof calendarEventSchema>;

function getStatusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "partner": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    case "prospect": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    case "inactive": return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    case "paused": return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  }
}

function getEventTypeColor(type: string) {
  switch (type) {
    case "deadline": return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "milestone": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "meeting": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "deliverable": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "launch": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "review": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

export default function ClientDirectory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const canEdit = user?.role === "content" || user?.role === "admin";

  const { data: clients = [], isLoading } = useQuery<ClientProfile[]>({
    queryKey: ["/api/client-profiles"],
  });

  const { data: calendarEvents = [] } = useQuery<ClientCalendarEvent[]>({
    queryKey: [`/api/client-profiles/${selectedClient?.id}/calendar`],
    enabled: !!selectedClient,
  });

  const { data: allTasks = [] } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: allDeliverables = [] } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const clientTasks = allTasks.filter(task => 
    task.client?.toLowerCase() === selectedClient?.name.toLowerCase()
  );

  const clientDeliverables = allDeliverables.filter(deliverable => 
    clientTasks.some(task => task.id === deliverable.taskId)
  );

  const completedTasks = clientTasks.filter(t => t.status === "COMPLETED");
  const inProgressTasks = clientTasks.filter(t => t.status === "IN PROGRESS");

  const form = useForm<ClientProfileForm>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      industry: "",
      relationshipStatus: "active",
      website: "",
      notes: "",
      projectHistory: "",
      color: "#6366F1",
    },
  });

  const eventForm = useForm<CalendarEventForm>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventType: "other",
      startDate: "",
      endDate: "",
      allDay: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ClientProfileForm) => {
      const res = await apiRequest("POST", "/api/client-profiles", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-profiles"] });
      setShowCreateDialog(false);
      form.reset();
      toast({ title: "Client profile created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create client profile", variant: "destructive" });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: CalendarEventForm) => {
      const res = await apiRequest("POST", "/api/calendar-events", {
        ...data,
        clientProfileId: selectedClient?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/client-profiles/${selectedClient?.id}/calendar`] });
      setShowEventDialog(false);
      eventForm.reset();
      toast({ title: "Calendar event created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create calendar event", variant: "destructive" });
    },
  });

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || client.relationshipStatus === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: clients.length,
    active: clients.filter(c => c.relationshipStatus === "active").length,
    partner: clients.filter(c => c.relationshipStatus === "partner").length,
    prospect: clients.filter(c => c.relationshipStatus === "prospect").length,
    inactive: clients.filter(c => c.relationshipStatus === "inactive" || c.relationshipStatus === "paused").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Client Directory</h1>
            <p className="text-muted-foreground">
              Central hub for all client and partner information
            </p>
          </div>
          {canEdit && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-client">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>
                    Create a new client profile to track projects and communications
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Company name" {...field} data-testid="input-client-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Slug</FormLabel>
                            <FormControl>
                              <Input placeholder="company-name" {...field} data-testid="input-client-slug" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., NFT, DeFi, Gaming" {...field} data-testid="input-client-industry" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="relationshipStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-client-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="partner">Partner</SelectItem>
                                <SelectItem value="prospect">Prospect</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the client/partner..." {...field} data-testid="input-client-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://..." {...field} data-testid="input-client-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="projectHistory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project History</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Past projects and collaborations..." {...field} data-testid="input-client-history" />
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
                            <Textarea placeholder="Additional notes..." {...field} data-testid="input-client-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-client">
                        {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Client
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Status Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-clients"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                data-testid={`button-filter-${status}`}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                <Badge variant="secondary" className="ml-2">{count}</Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Clients ({filteredClients.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => setSelectedClient(client)}
                        className={`w-full p-4 text-left hover-elevate transition-colors ${
                          selectedClient?.id === client.id ? "bg-accent" : ""
                        }`}
                        data-testid={`button-client-${client.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback 
                              style={{ backgroundColor: client.color || "#6366F1" }}
                              className="text-white font-semibold"
                            >
                              {client.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{client.name}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={getStatusColor(client.relationshipStatus || "active")}>
                                {client.relationshipStatus}
                              </Badge>
                              {client.industry && (
                                <span className="text-xs text-muted-foreground truncate">
                                  {client.industry}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        No clients found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Client Details */}
          <div className="lg:col-span-2">
            {selectedClient ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback 
                          style={{ backgroundColor: selectedClient.color || "#6366F1" }}
                          className="text-white font-bold text-lg"
                        >
                          {selectedClient.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl" data-testid="text-client-name">{selectedClient.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getStatusColor(selectedClient.relationshipStatus || "active")}>
                            {selectedClient.relationshipStatus}
                          </Badge>
                          {selectedClient.industry && (
                            <Badge variant="secondary">{selectedClient.industry}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedClient(null)}
                      data-testid="button-close-detail"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                      <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                      <TabsTrigger value="content" data-testid="tab-content">
                        Content
                        {clientDeliverables.length > 0 && (
                          <Badge variant="secondary" className="ml-1.5 text-xs">{clientDeliverables.length}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="calendar" data-testid="tab-calendar">Calendar</TabsTrigger>
                      <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      {selectedClient.description && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Description
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedClient.description}
                          </p>
                        </div>
                      )}

                      {selectedClient.projectHistory && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Project History
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedClient.projectHistory}
                          </p>
                        </div>
                      )}

                      {selectedClient.notes && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Notes
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedClient.notes}
                          </p>
                        </div>
                      )}

                      {selectedClient.website && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Website
                          </h4>
                          <a 
                            href={selectedClient.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            {selectedClient.website}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      {selectedClient.tags && selectedClient.tags.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tags
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedClient.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="content" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          Content Repository
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {completedTasks.length} completed
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-4 w-4 text-blue-500" />
                            {inProgressTasks.length} in progress
                          </span>
                        </div>
                      </div>

                      {clientDeliverables.length > 0 ? (
                        <div className="space-y-4">
                          {clientTasks.filter(task => 
                            clientDeliverables.some(d => d.taskId === task.id)
                          ).map((task) => {
                            const taskDeliverables = clientDeliverables.filter(d => d.taskId === task.id);
                            return (
                              <div key={task.id} className="border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between gap-3 p-3 bg-muted/30">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" title={task.description}>
                                      {task.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge 
                                        variant="outline" 
                                        className={
                                          task.status === "COMPLETED" 
                                            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" 
                                            : task.status === "IN PROGRESS"
                                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                            : ""
                                        }
                                      >
                                        {task.status}
                                      </Badge>
                                      {task.dueDate && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {task.dueDate}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <Badge variant="secondary">{taskDeliverables.length} files</Badge>
                                </div>
                                <div className="divide-y">
                                  {taskDeliverables.map((deliverable) => (
                                    <div 
                                      key={deliverable.id}
                                      className="flex items-center gap-3 p-3 hover-elevate"
                                      data-testid={`deliverable-${deliverable.id}`}
                                    >
                                      {getFileIcon(deliverable.fileName)}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{deliverable.fileName}</p>
                                        {deliverable.fileSize && (
                                          <p className="text-xs text-muted-foreground">{deliverable.fileSize}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          asChild
                                          data-testid={`download-${deliverable.id}`}
                                        >
                                          <a href={deliverable.filePath} target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4" />
                                          </a>
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          asChild
                                          data-testid={`view-${deliverable.id}`}
                                        >
                                          <a href={deliverable.filePath} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4" />
                                          </a>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : clientTasks.length > 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No deliverables uploaded yet</p>
                          <p className="text-sm">{clientTasks.length} task{clientTasks.length !== 1 ? "s" : ""} assigned to this client</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No content tasks found</p>
                          <p className="text-sm">Assign tasks to this client to see content here</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="calendar" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Content Calendar
                        </h4>
                        {canEdit && (
                          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                            <DialogTrigger asChild>
                              <Button size="sm" data-testid="button-add-event">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Event
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Calendar Event</DialogTitle>
                                <DialogDescription>
                                  Create a new event for {selectedClient.name}
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...eventForm}>
                                <form onSubmit={eventForm.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
                                  <FormField
                                    control={eventForm.control}
                                    name="title"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Event title" {...field} data-testid="input-event-title" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={eventForm.control}
                                    name="eventType"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Event Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-event-type">
                                              <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="deadline">Deadline</SelectItem>
                                            <SelectItem value="milestone">Milestone</SelectItem>
                                            <SelectItem value="meeting">Meeting</SelectItem>
                                            <SelectItem value="deliverable">Deliverable</SelectItem>
                                            <SelectItem value="launch">Launch</SelectItem>
                                            <SelectItem value="review">Review</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={eventForm.control}
                                      name="startDate"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Start Date</FormLabel>
                                          <FormControl>
                                            <Input type="datetime-local" {...field} data-testid="input-event-start" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={eventForm.control}
                                      name="endDate"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>End Date (optional)</FormLabel>
                                          <FormControl>
                                            <Input type="datetime-local" {...field} data-testid="input-event-end" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <FormField
                                    control={eventForm.control}
                                    name="description"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                          <Textarea placeholder="Event details..." {...field} data-testid="input-event-description" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setShowEventDialog(false)}>
                                      Cancel
                                    </Button>
                                    <Button type="submit" disabled={createEventMutation.isPending} data-testid="button-submit-event">
                                      {createEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                      Create Event
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>

                      {calendarEvents.length > 0 ? (
                        <div className="space-y-3">
                          {calendarEvents.map((event) => (
                            <div
                              key={event.id}
                              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover-elevate"
                              data-testid={`card-event-${event.id}`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{event.title}</span>
                                  <Badge className={getEventTypeColor(event.eventType || "other")}>
                                    {event.eventType}
                                  </Badge>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(event.startDate), "MMM d, yyyy 'at' h:mm a")}
                                  {event.endDate && (
                                    <> - {format(new Date(event.endDate), "h:mm a")}</>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No calendar events yet</p>
                          {canEdit && <p className="text-sm">Add events to track deadlines and milestones</p>}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="contacts" className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Key Contacts
                      </h4>
                      
                      {selectedClient.keyContacts && Array.isArray(selectedClient.keyContacts) && selectedClient.keyContacts.length > 0 ? (
                        <div className="grid gap-3">
                          {(selectedClient.keyContacts as Array<{name: string; role?: string; email?: string; telegram?: string; discord?: string}>).map((contact, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {contact.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium">{contact.name}</div>
                                {contact.role && (
                                  <div className="text-sm text-muted-foreground">{contact.role}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {contact.email && (
                                  <Button size="icon" variant="ghost" asChild>
                                    <a href={`mailto:${contact.email}`}>
                                      <Mail className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {contact.telegram && (
                                  <Button size="icon" variant="ghost" asChild>
                                    <a href={`https://t.me/${contact.telegram}`} target="_blank" rel="noopener noreferrer">
                                      <SiTelegram className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                {contact.discord && (
                                  <Button size="icon" variant="ghost">
                                    <SiDiscord className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No contacts added yet</p>
                        </div>
                      )}

                      {selectedClient.socialLinks && (
                        <>
                          <Separator />
                          <h4 className="font-medium flex items-center gap-2">
                            <LinkIcon className="h-4 w-4" />
                            Social Links
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(selectedClient.socialLinks as {twitter?: string; discord?: string; telegram?: string; farcaster?: string}).twitter && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={(selectedClient.socialLinks as {twitter?: string}).twitter} target="_blank" rel="noopener noreferrer">
                                  <SiX className="h-4 w-4 mr-2" />
                                  Twitter
                                </a>
                              </Button>
                            )}
                            {(selectedClient.socialLinks as {discord?: string}).discord && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={(selectedClient.socialLinks as {discord?: string}).discord} target="_blank" rel="noopener noreferrer">
                                  <SiDiscord className="h-4 w-4 mr-2" />
                                  Discord
                                </a>
                              </Button>
                            )}
                            {(selectedClient.socialLinks as {telegram?: string}).telegram && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={(selectedClient.socialLinks as {telegram?: string}).telegram} target="_blank" rel="noopener noreferrer">
                                  <SiTelegram className="h-4 w-4 mr-2" />
                                  Telegram
                                </a>
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a client</p>
                  <p className="text-sm">Click on a client from the list to view details</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
