import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ArrowLeft, Shield, Loader2, Plus, Package, Upload, Trash2, Pencil, Globe, FileText, Image, FileType, Download, ExternalLink, Palette } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

type BrandPack = {
  id: number;
  clientName: string;
  description: string | null;
  website: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
};

type BrandPackFile = {
  id: number;
  brandPackId: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: string | null;
  fileType: string | null;
  category: string | null;
  description: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

const FILE_CATEGORIES = [
  { value: "logo", label: "Logo" },
  { value: "guideline", label: "Brand Guidelines" },
  { value: "font", label: "Font" },
  { value: "color", label: "Color Palette" },
  { value: "template", label: "Template" },
  { value: "other", label: "Other" },
];

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "logo": return <Image className="h-4 w-4" />;
    case "guideline": return <FileText className="h-4 w-4" />;
    case "font": return <FileType className="h-4 w-4" />;
    case "color": return <Palette className="h-4 w-4" />;
    case "template": return <FileText className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

function getCategoryColor(category: string | null) {
  switch (category) {
    case "logo": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "guideline": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "font": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "color": return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
    case "template": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

export default function AdminBrandPacks() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPack, setSelectedPack] = useState<BrandPack | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newPack, setNewPack] = useState({
    clientName: "",
    description: "",
    website: "",
    primaryColor: "",
    secondaryColor: "",
    notes: "",
  });

  const [uploadData, setUploadData] = useState({
    file: null as File | null,
    category: "other",
    description: "",
  });

  const { data: brandPacks, isLoading } = useQuery<BrandPack[]>({
    queryKey: ["/api/brand-packs"],
  });

  const { data: selectedPackDetails, isLoading: loadingDetails } = useQuery<BrandPack & { files: BrandPackFile[] }>({
    queryKey: ["/api/brand-packs", selectedPack?.id],
    enabled: !!selectedPack,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof newPack) => apiRequest("POST", "/api/brand-packs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs"] });
      setIsCreateDialogOpen(false);
      setNewPack({ clientName: "", description: "", website: "", primaryColor: "", secondaryColor: "", notes: "" });
      toast({ title: "Brand pack created", description: "The brand pack has been created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create brand pack", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BrandPack> }) => 
      apiRequest("PATCH", `/api/brand-packs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs", selectedPack?.id] });
      setIsEditDialogOpen(false);
      toast({ title: "Brand pack updated", description: "Changes saved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update brand pack", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/brand-packs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs"] });
      setSelectedPack(null);
      toast({ title: "Brand pack deleted", description: "The brand pack has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete brand pack", variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ packId, file, category, description }: { packId: number; file: File; category: string; description: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      formData.append("description", description);
      
      const response = await fetch(`/api/brand-packs/${packId}/files`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs", selectedPack?.id] });
      setIsUploadDialogOpen(false);
      setUploadData({ file: null, category: "other", description: "" });
      toast({ title: "File uploaded", description: "The file has been added to the brand pack." });
    },
    onError: (error: any) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: number) => apiRequest("DELETE", `/api/brand-packs/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brand-packs", selectedPack?.id] });
      toast({ title: "File deleted", description: "The file has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete file", variant: "destructive" });
    },
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

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You must be an admin to access this page.
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
            <Link href="/content">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-brand-packs-page">
                Brand Packs
              </h1>
              <p className="text-muted-foreground">
                Manage client brand assets for the content team
              </p>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-brand-pack">
                <Plus className="h-4 w-4 mr-2" />
                Add Brand Pack
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Brand Pack</DialogTitle>
                <DialogDescription>
                  Add a new client brand pack for the content team to access.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={newPack.clientName}
                    onChange={(e) => setNewPack({ ...newPack, clientName: e.target.value })}
                    placeholder="e.g., Acme Corp"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPack.description}
                    onChange={(e) => setNewPack({ ...newPack, description: e.target.value })}
                    placeholder="Brief description of the brand..."
                    data-testid="input-description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={newPack.website}
                    onChange={(e) => setNewPack({ ...newPack, website: e.target.value })}
                    placeholder="https://example.com"
                    data-testid="input-website"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        value={newPack.primaryColor}
                        onChange={(e) => setNewPack({ ...newPack, primaryColor: e.target.value })}
                        placeholder="#000000"
                        data-testid="input-primary-color"
                      />
                      {newPack.primaryColor && (
                        <div 
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: newPack.primaryColor }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        value={newPack.secondaryColor}
                        onChange={(e) => setNewPack({ ...newPack, secondaryColor: e.target.value })}
                        placeholder="#ffffff"
                        data-testid="input-secondary-color"
                      />
                      {newPack.secondaryColor && (
                        <div 
                          className="w-10 h-10 rounded border"
                          style={{ backgroundColor: newPack.secondaryColor }}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={newPack.notes}
                    onChange={(e) => setNewPack({ ...newPack, notes: e.target.value })}
                    placeholder="Notes for the team..."
                    data-testid="input-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newPack)}
                  disabled={!newPack.clientName.trim() || createMutation.isPending}
                  data-testid="button-save-brand-pack"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Brand Packs</CardTitle>
                <CardDescription>
                  {brandPacks?.length || 0} client{(brandPacks?.length || 0) !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : brandPacks && brandPacks.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {brandPacks.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => setSelectedPack(pack)}
                        className={`p-3 rounded-lg border text-left transition-colors hover-elevate ${
                          selectedPack?.id === pack.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`brand-pack-${pack.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium truncate">{pack.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {pack.fileCount !== undefined && pack.fileCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {pack.fileCount} file{pack.fileCount !== 1 ? "s" : ""}
                              </Badge>
                            )}
                            {!pack.isActive && (
                              <Badge variant="outline" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                        {pack.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {pack.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No brand packs yet</p>
                    <p className="text-sm">Create one to get started</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            {selectedPack ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedPack.clientName}
                        {!selectedPack.isActive && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </CardTitle>
                      {selectedPack.description && (
                        <CardDescription className="mt-1">
                          {selectedPack.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" data-testid="button-edit-brand-pack">
                            <Pencil className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Brand Pack</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label>Client Name</Label>
                              <Input
                                defaultValue={selectedPack.clientName}
                                onChange={(e) => setSelectedPack({ ...selectedPack, clientName: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Description</Label>
                              <Textarea
                                defaultValue={selectedPack.description || ""}
                                onChange={(e) => setSelectedPack({ ...selectedPack, description: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Website</Label>
                              <Input
                                defaultValue={selectedPack.website || ""}
                                onChange={(e) => setSelectedPack({ ...selectedPack, website: e.target.value })}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label>Primary Color</Label>
                                <Input
                                  defaultValue={selectedPack.primaryColor || ""}
                                  onChange={(e) => setSelectedPack({ ...selectedPack, primaryColor: e.target.value })}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label>Secondary Color</Label>
                                <Input
                                  defaultValue={selectedPack.secondaryColor || ""}
                                  onChange={(e) => setSelectedPack({ ...selectedPack, secondaryColor: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="grid gap-2">
                              <Label>Notes</Label>
                              <Textarea
                                defaultValue={selectedPack.notes || ""}
                                onChange={(e) => setSelectedPack({ ...selectedPack, notes: e.target.value })}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={selectedPack.isActive}
                                onCheckedChange={(checked) => setSelectedPack({ ...selectedPack, isActive: checked })}
                              />
                              <Label>Active</Label>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => updateMutation.mutate({
                                id: selectedPack.id,
                                data: {
                                  clientName: selectedPack.clientName,
                                  description: selectedPack.description,
                                  website: selectedPack.website,
                                  primaryColor: selectedPack.primaryColor,
                                  secondaryColor: selectedPack.secondaryColor,
                                  notes: selectedPack.notes,
                                  isActive: selectedPack.isActive,
                                },
                              })}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${selectedPack.clientName}" and all its files?`)) {
                            deleteMutation.mutate(selectedPack.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid="button-delete-brand-pack"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-6">
                    {(selectedPack.website || selectedPack.primaryColor || selectedPack.secondaryColor) && (
                      <div className="flex flex-wrap items-center gap-4">
                        {selectedPack.website && (
                          <a
                            href={selectedPack.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Globe className="h-4 w-4" />
                            {selectedPack.website}
                          </a>
                        )}
                        {(selectedPack.primaryColor || selectedPack.secondaryColor) && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Colors:</span>
                            {selectedPack.primaryColor && (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-6 h-6 rounded border"
                                  style={{ backgroundColor: selectedPack.primaryColor }}
                                  title={selectedPack.primaryColor}
                                />
                                <span className="text-xs text-muted-foreground">{selectedPack.primaryColor}</span>
                              </div>
                            )}
                            {selectedPack.secondaryColor && (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-6 h-6 rounded border"
                                  style={{ backgroundColor: selectedPack.secondaryColor }}
                                  title={selectedPack.secondaryColor}
                                />
                                <span className="text-xs text-muted-foreground">{selectedPack.secondaryColor}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedPack.notes && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Notes:</strong> {selectedPack.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Files</h3>
                      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-upload-file">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload File
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload File</DialogTitle>
                            <DialogDescription>
                              Add a file to the {selectedPack.clientName} brand pack.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label>File</Label>
                              <Input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadData({ ...uploadData, file });
                                  }
                                }}
                                data-testid="input-file-upload"
                              />
                              {uploadData.file && (
                                <p className="text-sm text-muted-foreground">
                                  Selected: {uploadData.file.name} ({(uploadData.file.size / 1024).toFixed(1)} KB)
                                </p>
                              )}
                            </div>
                            <div className="grid gap-2">
                              <Label>Category</Label>
                              <Select
                                value={uploadData.category}
                                onValueChange={(value) => setUploadData({ ...uploadData, category: value })}
                              >
                                <SelectTrigger data-testid="select-file-category">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FILE_CATEGORIES.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label>Description (optional)</Label>
                              <Input
                                value={uploadData.description}
                                onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                                placeholder="Brief description of this file..."
                                data-testid="input-file-description"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (uploadData.file && selectedPack) {
                                  uploadFileMutation.mutate({
                                    packId: selectedPack.id,
                                    file: uploadData.file,
                                    category: uploadData.category,
                                    description: uploadData.description,
                                  });
                                }
                              }}
                              disabled={!uploadData.file || uploadFileMutation.isPending}
                              data-testid="button-confirm-upload"
                            >
                              {uploadFileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Upload
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {loadingDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : selectedPackDetails?.files && selectedPackDetails.files.length > 0 ? (
                      <div className="grid gap-2">
                        {selectedPackDetails.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                            data-testid={`file-${file.id}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded ${getCategoryColor(file.category)}`}>
                                {getCategoryIcon(file.category)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{file.originalName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {FILE_CATEGORIES.find(c => c.value === file.category)?.label || "Other"}
                                  </Badge>
                                  {file.fileSize && <span>{file.fileSize}</span>}
                                </div>
                                {file.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={file.filePath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover-elevate rounded"
                                title="Open file"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${file.originalName}"?`)) {
                                    deleteFileMutation.mutate(file.id);
                                  }
                                }}
                                className="p-2 hover-elevate rounded text-destructive"
                                title="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                        <Upload className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No files uploaded yet</p>
                        <p className="text-sm">Upload brand assets for the team</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Package className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
                  <h3 className="text-lg font-medium mb-1">Select a Brand Pack</h3>
                  <p className="text-muted-foreground text-center">
                    Choose a client from the list to view and manage their brand assets
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
