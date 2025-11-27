import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Asset } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Search,
  Filter,
  Image,
  FileText,
  Video,
  Music,
  File,
  Trash2,
  ExternalLink,
  Edit,
  X,
  Plus,
  Tag,
  FolderOpen,
  LayoutGrid,
  List,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "logos", label: "Logos & Branding" },
  { value: "photos", label: "Photos" },
  { value: "graphics", label: "Graphics & Illustrations" },
  { value: "documents", label: "Documents" },
  { value: "templates", label: "Templates" },
  { value: "other", label: "Other" },
];

function getFileTypeIcon(fileType: string | null) {
  if (!fileType) return <File className="w-8 h-8" />;
  
  if (fileType.startsWith("image/")) return <Image className="w-8 h-8 text-blue-500" />;
  if (fileType.startsWith("video/")) return <Video className="w-8 h-8 text-purple-500" />;
  if (fileType.startsWith("audio/")) return <Music className="w-8 h-8 text-green-500" />;
  if (fileType.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
  return <File className="w-8 h-8 text-muted-foreground" />;
}

function isImageType(fileType: string | null) {
  return fileType?.startsWith("image/") || false;
}

function formatFileSize(size: string | null) {
  if (!size) return "Unknown size";
  const bytes = parseInt(size);
  if (isNaN(bytes)) return size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AssetCardProps {
  asset: Asset;
  viewMode: "grid" | "list";
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

function AssetCard({ asset, viewMode, onEdit, onDelete }: AssetCardProps) {
  const isImage = isImageType(asset.fileType);
  
  if (viewMode === "list") {
    return (
      <div 
        className="flex items-center gap-4 p-3 rounded-lg border bg-card hover-elevate"
        data-testid={`asset-item-${asset.id}`}
      >
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {isImage && asset.filePath ? (
            <img 
              src={asset.filePath} 
              alt={asset.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            getFileTypeIcon(asset.fileType)
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{asset.name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{asset.fileName}</span>
            <span>-</span>
            <span>{formatFileSize(asset.fileSize)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {asset.category && (
            <Badge variant="secondary">{asset.category}</Badge>
          )}
          {asset.tags && asset.tags.split(",").slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag.trim()}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(asset.filePath, "_blank")}
            data-testid={`button-view-asset-${asset.id}`}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(asset)}
            data-testid={`button-edit-asset-${asset.id}`}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(asset)}
            data-testid={`button-delete-asset-${asset.id}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <Card 
      className="overflow-hidden hover-elevate group"
      data-testid={`asset-card-${asset.id}`}
    >
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
        {isImage && asset.filePath ? (
          <img 
            src={asset.filePath} 
            alt={asset.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          getFileTypeIcon(asset.fileType)
        )}
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => window.open(asset.filePath, "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onEdit(asset)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => onDelete(asset)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-3">
        <p className="font-medium truncate text-sm">{asset.name}</p>
        <p className="text-xs text-muted-foreground truncate">{asset.fileName}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatFileSize(asset.fileSize)}
          </span>
          {asset.category && (
            <Badge variant="secondary" className="text-xs">
              {asset.category}
            </Badge>
          )}
        </div>
        {asset.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {asset.tags.split(",").slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AssetsLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: assets, isLoading } = useQuery<Asset[]>({
    queryKey: ["/api/assets"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/assets", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload asset");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsUploadDialogOpen(false);
      resetUploadForm();
      toast({ title: "Asset uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Asset> }) => {
      return apiRequest("PATCH", `/api/assets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsEditDialogOpen(false);
      setSelectedAsset(null);
      toast({ title: "Asset updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setIsDeleteDialogOpen(false);
      setSelectedAsset(null);
      toast({ title: "Asset deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    
    return assets.filter(asset => {
      const matchesSearch = !searchQuery || 
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || asset.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [assets, searchQuery, categoryFilter]);

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadName("");
    setUploadCategory("");
    setUploadTags("");
    setUploadDescription("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = () => {
    if (!uploadFile) return;
    
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", uploadName || uploadFile.name);
    if (uploadCategory) formData.append("category", uploadCategory);
    if (uploadTags) formData.append("tags", uploadTags);
    if (uploadDescription) formData.append("description", uploadDescription);
    
    uploadMutation.mutate(formData);
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedAsset) return;
    updateMutation.mutate({
      id: selectedAsset.id,
      data: {
        name: selectedAsset.name,
        category: selectedAsset.category,
        tags: selectedAsset.tags,
        description: selectedAsset.description,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedAsset) return;
    deleteMutation.mutate(selectedAsset.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Asset Library</h2>
          <p className="text-sm text-muted-foreground">
            Manage brand assets, images, and files for your content
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)} data-testid="button-upload-asset">
          <Upload className="w-4 h-4 mr-2" />
          Upload Asset
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-assets"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-grid-view"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-list-view"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Assets Grid/List */}
      {isLoading ? (
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-2"
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === "grid" ? "aspect-square rounded-lg" : "h-16"} />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">
              {searchQuery || categoryFilter !== "all" ? "No assets found" : "No assets yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== "all" 
                ? "Try adjusting your search or filter"
                : "Upload your first asset to get started"}
            </p>
            {!searchQuery && categoryFilter === "all" && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Asset
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            : "space-y-2"
        )}>
          {filteredAssets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              viewMode={viewMode}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Asset</DialogTitle>
            <DialogDescription>
              Add a new file to your asset library
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <div
                className={cn(
                  "mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  uploadFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-asset"
                />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <File className="w-5 h-5" />
                    <span className="truncate max-w-[200px]">{uploadFile.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="assetName">Name</Label>
              <Input
                id="assetName"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Asset name"
                data-testid="input-asset-name"
              />
            </div>
            
            <div>
              <Label htmlFor="assetCategory">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger data-testid="select-asset-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(c => c.value !== "all").map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="assetTags">Tags (comma-separated)</Label>
              <Input
                id="assetTags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g. logo, brand, 2024"
                data-testid="input-asset-tags"
              />
            </div>
            
            <div>
              <Label htmlFor="assetDescription">Description</Label>
              <Textarea
                id="assetDescription"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Brief description of the asset"
                rows={2}
                data-testid="input-asset-description"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!uploadFile || uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update asset metadata
            </DialogDescription>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Name</Label>
                <Input
                  id="editName"
                  value={selectedAsset.name}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              
              <div>
                <Label htmlFor="editCategory">Category</Label>
                <Select 
                  value={selectedAsset.category || ""} 
                  onValueChange={(value) => setSelectedAsset({ ...selectedAsset, category: value })}
                >
                  <SelectTrigger data-testid="select-edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== "all").map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editTags">Tags (comma-separated)</Label>
                <Input
                  id="editTags"
                  value={selectedAsset.tags || ""}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, tags: e.target.value })}
                  placeholder="e.g. logo, brand, 2024"
                  data-testid="input-edit-tags"
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={selectedAsset.description || ""}
                  onChange={(e) => setSelectedAsset({ ...selectedAsset, description: e.target.value })}
                  rows={2}
                  data-testid="input-edit-description"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAsset?.name}"? This action cannot be undone.
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
              data-testid="button-confirm-delete"
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
