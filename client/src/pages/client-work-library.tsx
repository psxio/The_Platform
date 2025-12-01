import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, Shield, Loader2, Plus, FolderOpen, Upload, Trash2, Pencil, ExternalLink, FileText, Image, Video, File, Eye, Users, Calendar, Search, Filter, Package } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ClientWorkItem, ClientBrandPack, ContentTask, Campaign } from "@shared/schema";

type WorkItem = ClientWorkItem & {
  uploaderName?: string;
};

type BrandPack = {
  id: number;
  clientName: string;
  description: string | null;
  isActive: boolean;
  fileCount?: number;
};

const WORK_CATEGORIES = [
  { value: "article", label: "Article" },
  { value: "blog_post", label: "Blog Post" },
  { value: "social_media", label: "Social Media" },
  { value: "graphic", label: "Graphic" },
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
];

const WORK_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "article":
    case "blog_post":
    case "document": 
      return <FileText className="h-4 w-4" />;
    case "graphic": 
      return <Image className="h-4 w-4" />;
    case "video": 
      return <Video className="h-4 w-4" />;
    case "social_media": 
      return <FileText className="h-4 w-4" />;
    case "presentation": 
      return <FileText className="h-4 w-4" />;
    default: 
      return <File className="h-4 w-4" />;
  }
}

function getCategoryColor(category: string | null) {
  switch (category) {
    case "article": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "blog_post": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "social_media": return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
    case "graphic": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "video": return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "document": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "presentation": return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

function getStatusColor(status: string | null) {
  switch (status) {
    case "draft": return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    case "in_review": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    case "approved": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "published": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

export default function ClientWorkLibrary() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedBrandPack, setSelectedBrandPack] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    brandPackId: "",
    title: "",
    description: "",
    category: "other",
    status: "draft",
    taskId: "",
    campaignId: "",
  });

  const { data: brandPacks, isLoading: loadingBrandPacks } = useQuery<BrandPack[]>({
    queryKey: ["/api/brand-packs"],
  });

  const { data: workItems, isLoading: loadingWorkItems } = useQuery<WorkItem[]>({
    queryKey: ["/api/client-work", selectedBrandPack],
    queryFn: async () => {
      const url = selectedBrandPack 
        ? `/api/client-work?brandPackId=${selectedBrandPack}`
        : "/api/client-work";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch work items");
      return res.json();
    },
  });

  const { data: tasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: myWorkItems, isLoading: loadingMyWork } = useQuery<WorkItem[]>({
    queryKey: ["/api/client-work/by-uploader", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const res = await fetch(`/api/client-work/by-uploader/${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch your work items");
      return res.json();
    },
  });

  type WorkStats = {
    uploaderId: string;
    brandPackId: number;
    count: number;
    latestUpload: string | null;
    uploaderName: string;
    uploaderEmail: string;
    clientName: string;
  };

  const { data: workStats, isLoading: loadingStats } = useQuery<WorkStats[]>({
    queryKey: ["/api/client-work/stats"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: typeof uploadData) => {
      if (!data.file) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("brandPackId", data.brandPackId);
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("status", data.status);
      if (data.taskId) formData.append("taskId", data.taskId);
      if (data.campaignId) formData.append("campaignId", data.campaignId);
      
      const response = await fetch("/api/client-work", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-work"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-work/by-uploader", user?.id] });
      setIsUploadDialogOpen(false);
      setUploadData({ file: null, brandPackId: "", title: "", description: "", category: "other", status: "draft", taskId: "", campaignId: "" });
      toast({ title: "Work uploaded", description: "Your work has been added to the library." });
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/client-work/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-work"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-work/by-uploader", user?.id] });
      toast({ title: "Work deleted", description: "The work item has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete work item", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest("PATCH", `/api/client-work/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-work"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-work/by-uploader", user?.id] });
      toast({ title: "Status updated", description: "Work item status has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const filteredWorkItems = (workItems || []).filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "content" && user.role !== "admin")) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You must be a content team member to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/content-dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderOpen className="h-6 w-6" />
                Client Work Library
              </h1>
              <p className="text-muted-foreground text-sm">
                Upload and manage completed work for clients
              </p>
            </div>
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-work">
                <Upload className="h-4 w-4 mr-2" />
                Upload Work
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Client Work</DialogTitle>
                <DialogDescription>
                  Add a completed work item to the client library
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="brandPack">Client</Label>
                  <Select value={uploadData.brandPackId} onValueChange={(v) => setUploadData(d => ({ ...d, brandPackId: v }))}>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandPacks?.filter(p => p.isActive).map(pack => (
                        <SelectItem key={pack.id} value={pack.id.toString()}>
                          {pack.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={uploadData.title}
                    onChange={(e) => setUploadData(d => ({ ...d, title: e.target.value }))}
                    placeholder="Work item title"
                    data-testid="input-title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => setUploadData(d => ({ ...d, file: e.target.files?.[0] || null }))}
                    data-testid="input-file"
                  />
                  {uploadData.file && (
                    <p className="text-sm text-muted-foreground">{uploadData.file.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={uploadData.category} onValueChange={(v) => setUploadData(d => ({ ...d, category: v }))}>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={uploadData.status} onValueChange={(v) => setUploadData(d => ({ ...d, status: v }))}>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORK_STATUSES.map(s => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={uploadData.description}
                    onChange={(e) => setUploadData(d => ({ ...d, description: e.target.value }))}
                    placeholder="Brief description of this work"
                    data-testid="input-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="task">Link to Task (Optional)</Label>
                    <Select value={uploadData.taskId} onValueChange={(v) => setUploadData(d => ({ ...d, taskId: v }))}>
                      <SelectTrigger data-testid="select-task">
                        <SelectValue placeholder="Select task" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {tasks?.map(task => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="campaign">Link to Campaign (Optional)</Label>
                    <Select value={uploadData.campaignId} onValueChange={(v) => setUploadData(d => ({ ...d, campaignId: v }))}>
                      <SelectTrigger data-testid="select-campaign">
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {campaigns?.map(campaign => (
                          <SelectItem key={campaign.id} value={campaign.id.toString()}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => uploadMutation.mutate(uploadData)}
                  disabled={!uploadData.brandPackId || !uploadData.title || !uploadData.file || uploadMutation.isPending}
                  data-testid="button-submit-upload"
                >
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="browse" className="w-full">
          <TabsList>
            <TabsTrigger value="browse" data-testid="tab-browse">
              <FolderOpen className="h-4 w-4 mr-2" />
              Browse All
            </TabsTrigger>
            <TabsTrigger value="my-work" data-testid="tab-my-work">
              <Users className="h-4 w-4 mr-2" />
              My Uploads
            </TabsTrigger>
            <TabsTrigger value="by-client" data-testid="tab-by-client">
              <Package className="h-4 w-4 mr-2" />
              By Client
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Eye className="h-4 w-4 mr-2" />
              Team Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search work items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]" data-testid="filter-category">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {WORK_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {WORK_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingWorkItems ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredWorkItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No work items found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload your first work
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredWorkItems.map(item => (
                  <WorkItemCard 
                    key={item.id} 
                    item={item} 
                    brandPacks={brandPacks || []}
                    onDelete={() => deleteMutation.mutate(item.id)}
                    onStatusChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                    canEdit={item.uploadedBy === user?.id || user?.role === "admin"}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-work" className="mt-6">
            {loadingMyWork ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !myWorkItems?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't uploaded any work yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload your first work
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myWorkItems.map(item => (
                  <WorkItemCard 
                    key={item.id} 
                    item={item} 
                    brandPacks={brandPacks || []}
                    onDelete={() => deleteMutation.mutate(item.id)}
                    onStatusChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                    canEdit={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="by-client" className="mt-6">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              {loadingBrandPacks ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !brandPacks?.length ? (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No clients found</p>
                  </CardContent>
                </Card>
              ) : (
                brandPacks.filter(p => p.isActive).map(pack => (
                  <Card 
                    key={pack.id} 
                    className={`cursor-pointer transition-all hover-elevate ${selectedBrandPack === pack.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedBrandPack(selectedBrandPack === pack.id ? null : pack.id)}
                    data-testid={`card-client-${pack.id}`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{pack.clientName}</CardTitle>
                      {pack.description && (
                        <CardDescription className="line-clamp-2">{pack.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Badge variant="secondary">
                        {workItems?.filter(w => w.brandPackId === pack.id).length || 0} items
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            {selectedBrandPack && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {brandPacks?.find(p => p.id === selectedBrandPack)?.clientName} Work Items
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedBrandPack(null)}>
                    Clear Selection
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredWorkItems.map(item => (
                    <WorkItemCard 
                      key={item.id} 
                      item={item} 
                      brandPacks={brandPacks || []}
                      onDelete={() => deleteMutation.mutate(item.id)}
                      onStatusChange={(status) => updateStatusMutation.mutate({ id: item.id, status })}
                      canEdit={item.uploadedBy === user?.id || user?.role === "admin"}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Team Work Activity
                </CardTitle>
                <CardDescription>
                  See who is working on what client projects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !workStats?.length ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No work activity yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Team members will appear here once they upload work
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const groupedByUploader = workStats.reduce((acc, stat) => {
                        if (!acc[stat.uploaderId]) {
                          acc[stat.uploaderId] = {
                            uploaderName: stat.uploaderName,
                            uploaderEmail: stat.uploaderEmail,
                            clients: [],
                            totalCount: 0,
                          };
                        }
                        acc[stat.uploaderId].clients.push({
                          clientName: stat.clientName,
                          count: stat.count,
                          latestUpload: stat.latestUpload,
                        });
                        acc[stat.uploaderId].totalCount += stat.count;
                        return acc;
                      }, {} as Record<string, { uploaderName: string; uploaderEmail: string; clients: Array<{ clientName: string; count: number; latestUpload: string | null }>; totalCount: number }>);
                      
                      return Object.entries(groupedByUploader).map(([uploaderId, data]) => (
                        <div key={uploaderId} className="border rounded-lg p-4" data-testid={`activity-uploader-${uploaderId}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-lg font-semibold text-primary">
                                {data.uploaderName?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{data.uploaderName}</p>
                              <p className="text-sm text-muted-foreground">{data.uploaderEmail}</p>
                            </div>
                            <Badge variant="secondary" className="ml-auto">
                              {data.totalCount} items
                            </Badge>
                          </div>
                          <div className="grid gap-2 ml-13">
                            {data.clients.map((client, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span>{client.clientName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">{client.count} items</Badge>
                                  {client.latestUpload && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(client.latestUpload).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function WorkItemCard({ 
  item, 
  brandPacks,
  onDelete, 
  onStatusChange,
  canEdit 
}: { 
  item: WorkItem; 
  brandPacks: BrandPack[];
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  canEdit: boolean;
}) {
  const brandPack = brandPacks.find(p => p.id === item.brandPackId);
  
  return (
    <Card data-testid={`card-work-item-${item.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{item.title}</CardTitle>
            {brandPack && (
              <Badge variant="outline" className="mt-1">
                {brandPack.clientName}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {item.filePath && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.open(item.filePath, "_blank")}
                data-testid={`button-view-${item.id}`}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {canEdit && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onDelete}
                data-testid={`button-delete-${item.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge className={getCategoryColor(item.category)}>
            {getCategoryIcon(item.category)}
            <span className="ml-1">{WORK_CATEGORIES.find(c => c.value === item.category)?.label || item.category}</span>
          </Badge>
          {canEdit ? (
            <Select value={item.status || "draft"} onValueChange={onStatusChange}>
              <SelectTrigger className="h-6 px-2 w-auto text-xs">
                <Badge className={getStatusColor(item.status)}>
                  {WORK_STATUSES.find(s => s.value === item.status)?.label || item.status}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                {WORK_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge className={getStatusColor(item.status)}>
              {WORK_STATUSES.find(s => s.value === item.status)?.label || item.status}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.fileSize && <span>{item.fileSize}</span>}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
