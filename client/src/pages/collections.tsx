import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Database, Upload, Download, Trash2, Search, 
  ArrowLeft, FileText, Loader2, Check, X, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Collection } from "@shared/schema";

interface CollectionWithCount extends Collection {
  addressCount: number;
}

interface CollectionWithAddresses extends Collection {
  addresses: string[];
  addressCount: number;
}

export default function Collections() {
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pasteAddresses, setPasteAddresses] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const { data: collections = [], isLoading: loadingCollections, refetch: refetchCollections } = useQuery<CollectionWithCount[]>({
    queryKey: ["/api/collections"],
  });

  const { data: collectionDetail, isLoading: loadingDetail, refetch: refetchDetail } = useQuery<CollectionWithAddresses>({
    queryKey: ["/api/collections", selectedCollection],
    enabled: !!selectedCollection,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/collections", { 
        name: newName, 
        description: newDescription || null 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowCreateDialog(false);
      setNewName("");
      setNewDescription("");
      toast({ title: "Collection created", description: `"${newName}" has been created successfully` });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create collection", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowDeleteDialog(null);
      if (selectedCollection === showDeleteDialog) {
        setSelectedCollection(null);
      }
      toast({ title: "Collection deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete collection", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    },
  });

  const addAddressesMutation = useMutation({
    mutationFn: async ({ id, addresses }: { id: number; addresses: string[] }) => {
      const res = await apiRequest("POST", `/api/collections/${id}/addresses`, { addresses });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", selectedCollection] });
      setPasteAddresses("");
      toast({ 
        title: "Addresses added", 
        description: `Added ${data.added} new addresses (${data.skipped} duplicates skipped, ${data.invalid} invalid)` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add addresses", 
        description: error.message || "An error occurred", 
        variant: "destructive" 
      });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (!selectedCollection) return;

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.txt') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    );

    if (validFile) {
      await uploadFile(validFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, TXT, JSON, or Excel file",
        variant: "destructive",
      });
    }
  }, [selectedCollection, toast]);

  const uploadFile = async (file: File) => {
    if (!selectedCollection) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/collections/${selectedCollection}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", selectedCollection] });
      
      toast({
        title: "File uploaded",
        description: `Added ${data.added} new addresses from ${file.name} (${data.skipped} duplicates, ${data.invalid} invalid)`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    e.target.value = "";
  };

  const handlePasteSubmit = () => {
    if (!selectedCollection || !pasteAddresses.trim()) return;

    const addresses = pasteAddresses
      .split(/[\n,;]+/)
      .map(a => a.trim())
      .filter(a => a.length > 0);

    if (addresses.length === 0) {
      toast({ title: "No addresses found", description: "Please paste valid addresses", variant: "destructive" });
      return;
    }

    addAddressesMutation.mutate({ id: selectedCollection, addresses });
  };

  const handleDownload = () => {
    if (!selectedCollection || !collectionDetail) return;
    window.open(`/api/collections/${selectedCollection}/download`, "_blank");
    toast({ title: "Download started" });
  };

  const filteredAddresses = collectionDetail?.addresses.filter(addr =>
    addr.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (selectedCollection && collectionDetail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedCollection(null)}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold">{collectionDetail.name}</h1>
              {collectionDetail.description && (
                <p className="text-muted-foreground">{collectionDetail.description}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={collectionDetail.addresses.length === 0}
              data-testid="button-download-collection"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add Minted Addresses</CardTitle>
              <CardDescription>
                Upload a file or paste addresses to add to this collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragOver ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                {uploadingFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drop a file here or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".csv,.txt,.json,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="collection-upload"
                      data-testid="input-upload-collection"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById("collection-upload")?.click()}
                      data-testid="button-browse-collection"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      CSV, TXT, JSON, or Excel files
                    </p>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or paste addresses</span>
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Paste wallet addresses (one per line, comma, or semicolon separated)"
                  value={pasteAddresses}
                  onChange={(e) => setPasteAddresses(e.target.value)}
                  className="min-h-24 font-mono text-sm"
                  data-testid="textarea-paste-addresses"
                />
                <Button
                  onClick={handlePasteSubmit}
                  disabled={!pasteAddresses.trim() || addAddressesMutation.isPending}
                  data-testid="button-add-addresses"
                >
                  {addAddressesMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Addresses
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Minted Addresses</CardTitle>
                  <CardDescription>
                    {filteredAddresses.length} of {collectionDetail.addresses.length} addresses
                  </CardDescription>
                </div>
                <div className="relative flex-1 sm:flex-initial sm:min-w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search addresses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-addresses"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredAddresses.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-1">
                  {filteredAddresses.map((addr, idx) => (
                    <div
                      key={addr}
                      className="flex items-center justify-between py-2 px-3 rounded hover-elevate"
                      data-testid={`row-address-${idx}`}
                    >
                      <code className="text-sm font-mono">{addr}</code>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No addresses match your search" : "No addresses in this collection yet"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            NFT Collections
          </h1>
          <p className="text-muted-foreground">
            Manage minted addresses for each NFT collection
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            data-testid="button-create-collection"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        </div>

        {loadingCollections ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-medium mb-2">No Collections Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Create a collection to store minted addresses for your NFT projects.
                  Collections help you compare eligibility without uploading files each time.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="hover-elevate cursor-pointer transition-all"
                onClick={() => setSelectedCollection(collection.id)}
                data-testid={`card-collection-${collection.id}`}
              >
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Database className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{collection.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {collection.addressCount.toLocaleString()} minted addresses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(collection.id);
                      }}
                      data-testid={`button-delete-${collection.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Add a new NFT collection to manage minted addresses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Collection Name</label>
              <Input
                placeholder="e.g., 4444 Collection"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                data-testid="input-collection-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                placeholder="Describe this collection..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                data-testid="input-collection-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Collection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this collection and all its stored addresses.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && deleteMutation.mutate(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
