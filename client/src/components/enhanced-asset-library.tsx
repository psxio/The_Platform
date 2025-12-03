import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Image, Video, FileText, Music, Package, 
  Plus, Search, Filter, Star, StarOff, Trash2, 
  ExternalLink, Download, Copy, Eye, Grid, List,
  BarChart3, TrendingUp
} from "lucide-react";
import type { LibraryAsset, ClientProfile } from "@shared/schema";
import { format } from "date-fns";

interface EnhancedAssetLibraryProps {
  clientProfileId?: number;
  showStats?: boolean;
}

const CATEGORIES = [
  { value: "image", label: "Images", icon: Image },
  { value: "video", label: "Videos", icon: Video },
  { value: "document", label: "Documents", icon: FileText },
  { value: "audio", label: "Audio", icon: Music },
  { value: "other", label: "Other", icon: Package },
];

const FILE_TYPES: Record<string, { icon: typeof Image; color: string }> = {
  image: { icon: Image, color: "text-blue-500" },
  video: { icon: Video, color: "text-purple-500" },
  document: { icon: FileText, color: "text-orange-500" },
  audio: { icon: Music, color: "text-green-500" },
  other: { icon: Package, color: "text-gray-500" },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function EnhancedAssetLibrary({ clientProfileId, showStats = true }: EnhancedAssetLibraryProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fileUrl: "",
    thumbnailUrl: "",
    fileType: "image",
    fileSize: 0,
    category: "image",
    tags: "",
    isPublic: false,
  });

  const { data: clientProfiles = [] } = useQuery<ClientProfile[]>({
    queryKey: ["/api/client-profiles"],
  });

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (categoryFilter !== "all") params.append("category", categoryFilter);
    if (clientProfileId) params.append("clientProfileId", clientProfileId.toString());
    return params.toString();
  };

  const { data: assets = [], isLoading } = useQuery<LibraryAsset[]>({
    queryKey: ["/api/library-assets", searchQuery, categoryFilter, clientProfileId],
    queryFn: async () => {
      const params = buildQueryParams();
      const res = await fetch(`/api/library-assets?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assets");
      return res.json();
    },
  });

  const { data: stats } = useQuery<{ totalAssets: number; byCategory: Record<string, number>; totalSize: number; recentlyAdded: number }>({
    queryKey: ["/api/library-assets/stats"],
    enabled: showStats,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/library-assets", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          clientProfileId: clientProfileId || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library-assets"] });
      setShowAddDialog(false);
      setFormData({
        name: "",
        description: "",
        fileUrl: "",
        thumbnailUrl: "",
        fileType: "image",
        fileSize: 0,
        category: "image",
        tags: "",
        isPublic: false,
      });
      toast({ title: "Asset added", description: "Asset has been added to the library." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add asset", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/library-assets/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library-assets"] });
      toast({ title: "Asset deleted" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/library-assets/${id}/favorite`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library-assets"] });
    },
  });

  const useMutation2 = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/library-assets/${id}/use`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library-assets"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.fileUrl || !formData.category) {
      toast({ title: "Error", description: "Name, URL, and category are required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "URL copied to clipboard" });
  };

  const openPreview = (asset: LibraryAsset) => {
    setSelectedAsset(asset);
    setShowPreviewDialog(true);
    useMutation2.mutate(asset.id);
  };

  const getFileIcon = (category: string) => {
    const type = FILE_TYPES[category] || FILE_TYPES.other;
    return type;
  };

  return (
    <div className="space-y-6">
      {showStats && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalAssets}</p>
              <p className="text-xs text-muted-foreground">Total Assets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              <p className="text-xs text-muted-foreground">Total Size</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.recentlyAdded}</p>
              <p className="text-xs text-muted-foreground">Added This Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Image className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Asset Library
          </CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-asset">
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Asset name"
                    data-testid="input-asset-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>File URL</Label>
                  <Input
                    value={formData.fileUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileUrl: e.target.value }))}
                    placeholder="https://..."
                    data-testid="input-asset-url"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                      <SelectTrigger data-testid="select-asset-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>File Type</Label>
                    <Input
                      value={formData.fileType}
                      onChange={(e) => setFormData(prev => ({ ...prev, fileType: e.target.value }))}
                      placeholder="png, mp4, pdf..."
                      data-testid="input-asset-type"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail URL (optional)</Label>
                  <Input
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                    placeholder="https://..."
                    data-testid="input-asset-thumbnail"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-asset-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="logo, banner, social..."
                    data-testid="input-asset-tags"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded"
                    data-testid="checkbox-asset-public"
                  />
                  <Label htmlFor="isPublic" className="text-sm font-normal">Make this asset public</Label>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-asset">
                    {createMutation.isPending ? "Adding..." : "Add Asset"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-assets"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex border rounded-lg">
                <Button
                  size="icon"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                  data-testid="button-view-grid"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading assets...</div>
          ) : assets.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assets found. Add your first asset to get started.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {assets.map((asset) => {
                const { icon: Icon, color } = getFileIcon(asset.category);
                return (
                  <div
                    key={asset.id}
                    className="group relative rounded-lg border overflow-hidden hover-elevate cursor-pointer"
                    onClick={() => openPreview(asset)}
                    data-testid={`asset-card-${asset.id}`}
                  >
                    <div className="aspect-video relative bg-muted">
                      {asset.thumbnailUrl || asset.category === "image" ? (
                        <img
                          src={asset.thumbnailUrl || asset.fileUrl}
                          alt={asset.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "";
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Icon className={`h-12 w-12 ${color}`} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      {asset.isFavorite && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2">
                      <h4 className="font-medium text-sm line-clamp-1">{asset.name}</h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {asset.category}
                        </Badge>
                        <span>{formatFileSize(asset.fileSize)}</span>
                      </div>
                      {asset.usageCount !== undefined && asset.usageCount > 0 && (
                        <p className="text-xs text-muted-foreground">Used {asset.usageCount} times</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset) => {
                const { icon: Icon, color } = getFileIcon(asset.category);
                return (
                  <div
                    key={asset.id}
                    className="flex items-center gap-4 rounded-lg border p-3 hover-elevate"
                    data-testid={`asset-row-${asset.id}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted shrink-0">
                      {asset.thumbnailUrl || asset.category === "image" ? (
                        <img
                          src={asset.thumbnailUrl || asset.fileUrl}
                          alt={asset.name}
                          className="h-full w-full object-cover rounded-lg"
                        />
                      ) : (
                        <Icon className={`h-6 w-6 ${color}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{asset.name}</h4>
                        {asset.isFavorite && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">{asset.category}</Badge>
                        <span>{formatFileSize(asset.fileSize)}</span>
                        {asset.usageCount !== undefined && asset.usageCount > 0 && (
                          <span>Used {asset.usageCount}x</span>
                        )}
                        {asset.createdAt && (
                          <span>{format(new Date(asset.createdAt), "MMM d, yyyy")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(asset);
                        }}
                        data-testid={`button-preview-${asset.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(asset.fileUrl);
                        }}
                        data-testid={`button-copy-url-${asset.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          favoriteMutation.mutate(asset.id);
                        }}
                        data-testid={`button-favorite-${asset.id}`}
                      >
                        {asset.isFavorite ? (
                          <StarOff className="h-4 w-4" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(asset.id);
                        }}
                        data-testid={`button-delete-${asset.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedAsset?.name}
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => selectedAsset && copyToClipboard(selectedAsset.fileUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => selectedAsset && window.open(selectedAsset.fileUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => selectedAsset && favoriteMutation.mutate(selectedAsset.id)}
                >
                  {selectedAsset?.isFavorite ? (
                    <StarOff className="h-4 w-4" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
                {selectedAsset.category === "image" ? (
                  <img
                    src={selectedAsset.fileUrl}
                    alt={selectedAsset.name}
                    className="h-full w-full object-contain"
                  />
                ) : selectedAsset.category === "video" ? (
                  <video
                    src={selectedAsset.fileUrl}
                    controls
                    className="h-full w-full"
                  />
                ) : selectedAsset.category === "audio" ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <audio src={selectedAsset.fileUrl} controls className="w-full max-w-md" />
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <Button onClick={() => window.open(selectedAsset.fileUrl, "_blank")}>
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{selectedAsset.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Type</p>
                  <p className="font-medium">{selectedAsset.fileType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium">{formatFileSize(selectedAsset.fileSize)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Usage Count</p>
                  <p className="font-medium">{selectedAsset.usageCount || 0} times</p>
                </div>
              </div>
              {selectedAsset.description && (
                <div>
                  <p className="text-muted-foreground text-sm">Description</p>
                  <p className="text-sm">{selectedAsset.description}</p>
                </div>
              )}
              {selectedAsset.tags && (
                <div className="flex flex-wrap gap-1">
                  {selectedAsset.tags.split(",").map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
