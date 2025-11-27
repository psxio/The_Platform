import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Deliverable, ContentTask, DeliverableVersion } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, 
  Download, 
  FileText, 
  Trash2, 
  AlertCircle, 
  Inbox, 
  History, 
  Eye, 
  ExternalLink,
  Plus,
  File,
  Image,
  FileVideo,
  FileAudio,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) {
    return <FileVideo className="w-5 h-5 text-purple-500" />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <FileAudio className="w-5 h-5 text-green-500" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function isPreviewable(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'pdf'].includes(ext);
}

interface DeliverableItemProps {
  deliverable: Deliverable;
  taskDescription: string;
  onDelete: (id: number) => void;
  onUploadVersion: (deliverable: Deliverable) => void;
  onViewVersions: (deliverable: Deliverable) => void;
}

function DeliverableItem({ 
  deliverable, 
  taskDescription, 
  onDelete, 
  onUploadVersion,
  onViewVersions 
}: DeliverableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = deliverable.filePath;
    link.download = deliverable.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    window.open(deliverable.filePath, '_blank');
  };

  return (
    <div
      className="border border-border rounded-lg hover-elevate overflow-hidden"
      data-testid={`item-deliverable-${deliverable.id}`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {getFileIcon(deliverable.fileName)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid={`text-filename-${deliverable.id}`}>
              {deliverable.fileName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {taskDescription}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {deliverable.fileSize && (
                <Badge variant="secondary" className="text-xs">
                  {formatBytes(parseInt(deliverable.fileSize))}
                </Badge>
              )}
              {deliverable.uploadedAt && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(deliverable.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {isPreviewable(deliverable.fileName) && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handlePreview}
              title="Preview"
              data-testid={`button-preview-${deliverable.id}`}
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDownload}
            title="Download"
            data-testid={`button-download-${deliverable.id}`}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onViewVersions(deliverable)}
            title="Version History"
            data-testid={`button-versions-${deliverable.id}`}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onUploadVersion(deliverable)}
            title="Upload New Version"
            data-testid={`button-upload-version-${deliverable.id}`}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(deliverable.id)}
            title="Delete"
            data-testid={`button-delete-${deliverable.id}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-expand-${deliverable.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-4 text-sm">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewVersions(deliverable)}
            >
              <History className="w-4 h-4 mr-2" />
              View All Versions
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUploadVersion(deliverable)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload New Version
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(deliverable.filePath, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeliverablesView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isUploadVersionDialogOpen, setIsUploadVersionDialogOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState("");
  const { toast } = useToast();

  const { data: contentTasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: deliverables, isLoading, error } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const { data: versions, refetch: refetchVersions } = useQuery<DeliverableVersion[]>({
    queryKey: ["/api/deliverables", selectedDeliverable?.id, "versions"],
    queryFn: async () => {
      if (!selectedDeliverable) return [];
      const res = await fetch(`/api/deliverables/${selectedDeliverable.id}/versions`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedDeliverable && isVersionDialogOpen,
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/deliverables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      toast({
        title: "Deleted",
        description: "Deliverable has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete deliverable.",
        variant: "destructive",
      });
    },
  });

  const uploadVersionMutation = useMutation({
    mutationFn: async ({ deliverableId, formData }: { deliverableId: number; formData: FormData }) => {
      const res = await fetch(`/api/deliverables/${deliverableId}/versions`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      refetchVersions();
      setIsUploadVersionDialogOpen(false);
      setVersionFile(null);
      setVersionNotes("");
      toast({
        title: "Version uploaded",
        description: "New version has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload new version.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!selectedTaskId) {
      toast({
        title: "Error",
        description: "Please select a task first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`/api/content-tasks/${selectedTaskId}/deliverables`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        toast({
          title: "Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        });
      } catch (error) {
        console.error("Failed to upload file:", error);
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}.`,
          variant: "destructive",
        });
      }
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
    event.target.value = "";
  };

  const handleViewVersions = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsVersionDialogOpen(true);
  };

  const handleUploadVersion = (deliverable: Deliverable) => {
    setSelectedDeliverable(deliverable);
    setIsUploadVersionDialogOpen(true);
  };

  const handleSubmitVersion = () => {
    if (!selectedDeliverable || !versionFile) return;

    const formData = new FormData();
    formData.append("file", versionFile);
    if (versionNotes) formData.append("notes", versionNotes);

    uploadVersionMutation.mutate({
      deliverableId: selectedDeliverable.id,
      formData,
    });
  };

  const filteredDeliverables = deliverables?.filter((d) => 
    !selectedTaskId || d.taskId === parseInt(selectedTaskId)
  ) || [];

  const getTaskDescription = (taskId: number) => {
    const task = contentTasks?.find((t) => t.id === taskId);
    return task?.description || "Unknown Task";
  };

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-deliverables-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load deliverables. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Deliverable
          </CardTitle>
          <CardDescription>
            Upload files for a specific task. Supports version control for tracking changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-select">Select Task</Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger id="task-select" data-testid="select-task-deliverable">
                <SelectValue placeholder="Choose a task..." />
              </SelectTrigger>
              <SelectContent>
                {contentTasks?.map((task) => (
                  <SelectItem key={task.id} value={task.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                      <span className="truncate max-w-md">{task.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/5">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading || !selectedTaskId}
              data-testid="input-file-deliverable"
            />
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center gap-2 cursor-pointer ${!selectedTaskId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">
                  {isUploading ? "Uploading..." : "Drop files or click to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum file size: 50MB
                </p>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Uploaded Deliverables
          </CardTitle>
          <CardDescription>
            {filteredDeliverables.length} file(s) uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" data-testid={`skeleton-deliverable-${i}`} />
              ))}
            </div>
          ) : filteredDeliverables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-deliverables">
              <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No deliverables</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {selectedTaskId 
                  ? "No files uploaded for this task yet." 
                  : "Select a task and upload files to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeliverables.map((deliverable) => (
                <DeliverableItem
                  key={deliverable.id}
                  deliverable={deliverable}
                  taskDescription={getTaskDescription(deliverable.taskId)}
                  onDelete={(id) => deleteDeliverableMutation.mutate(id)}
                  onUploadVersion={handleUploadVersion}
                  onViewVersions={handleViewVersions}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Version History Dialog */}
      <Dialog open={isVersionDialogOpen} onOpenChange={setIsVersionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Version History
            </DialogTitle>
            <DialogDescription>
              {selectedDeliverable?.fileName}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {/* Current Version */}
              {selectedDeliverable && (
                <div className="p-3 border rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(selectedDeliverable.fileName)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{selectedDeliverable.fileName}</p>
                          <Badge>Current</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedDeliverable.uploadedAt && 
                            format(new Date(selectedDeliverable.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                          {selectedDeliverable.fileSize && 
                            ` - ${formatBytes(parseInt(selectedDeliverable.fileSize))}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedDeliverable.filePath, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {/* Previous Versions */}
              {versions && versions.length > 0 ? (
                versions.map((version) => (
                  <div key={version.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(version.fileName)}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{version.fileName}</p>
                            <Badge variant="outline">v{version.versionNumber}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {version.createdAt && 
                              format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            {version.fileSize && 
                              ` - ${formatBytes(parseInt(version.fileSize))}`}
                          </p>
                          {version.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{version.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(version.filePath, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No previous versions</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsVersionDialogOpen(false);
              handleUploadVersion(selectedDeliverable!);
            }}>
              <Upload className="w-4 h-4 mr-2" />
              Upload New Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Version Dialog */}
      <Dialog open={isUploadVersionDialogOpen} onOpenChange={setIsUploadVersionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
            <DialogDescription>
              Upload a new version of "{selectedDeliverable?.fileName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>File</Label>
              <div
                className={cn(
                  "mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  versionFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
                onClick={() => document.getElementById('version-file-upload')?.click()}
              >
                <input
                  id="version-file-upload"
                  type="file"
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="hidden"
                  data-testid="input-version-file"
                />
                {versionFile ? (
                  <div className="flex items-center justify-center gap-2">
                    {getFileIcon(versionFile.name)}
                    <span className="truncate max-w-[200px]">{versionFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to select file</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="version-notes">Notes (optional)</Label>
              <Textarea
                id="version-notes"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
                className="mt-2"
                data-testid="input-version-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadVersionDialogOpen(false);
              setVersionFile(null);
              setVersionNotes("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitVersion}
              disabled={!versionFile || uploadVersionMutation.isPending}
              data-testid="button-submit-version"
            >
              {uploadVersionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Version
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
