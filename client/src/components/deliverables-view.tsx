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
import { Switch } from "@/components/ui/switch";
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
  ChevronUp,
  Clock,
  ArrowLeftRight,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FeedbackForm } from "./feedback-form";

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

function isImageFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext);
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
  versions?: DeliverableVersion[];
}

function DeliverableItem({ 
  deliverable, 
  taskDescription, 
  onDelete, 
  onUploadVersion,
  onViewVersions,
  versions = []
}: DeliverableItemProps) {
  const [showVersionToggle, setShowVersionToggle] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(-1);
  
  const currentFile = selectedVersionIndex === -1 
    ? { 
        fileName: deliverable.fileName, 
        filePath: deliverable.filePath, 
        fileSize: deliverable.fileSize,
        uploadedAt: deliverable.uploadedAt,
        isCurrent: true
      }
    : {
        fileName: versions[selectedVersionIndex].fileName,
        filePath: versions[selectedVersionIndex].filePath,
        fileSize: versions[selectedVersionIndex].fileSize,
        uploadedAt: versions[selectedVersionIndex].createdAt,
        isCurrent: false,
        versionNumber: versions[selectedVersionIndex].versionNumber
      };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentFile.filePath;
    link.download = currentFile.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = () => {
    window.open(currentFile.filePath, '_blank');
  };

  const isImage = isImageFile(deliverable.fileName);

  return (
    <div
      className="group border border-border rounded-xl hover-elevate overflow-hidden bg-card"
      data-testid={`item-deliverable-${deliverable.id}`}
    >
      <div className="flex gap-4 p-4">
        {isImage ? (
          <div 
            className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer border"
            onClick={handlePreview}
          >
            <img 
              src={currentFile.filePath} 
              alt={currentFile.fileName}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 border">
            {getFileIcon(currentFile.fileName)}
          </div>
        )}
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate" data-testid={`text-filename-${deliverable.id}`}>
                  {currentFile.fileName}
                </p>
                {!currentFile.isCurrent && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    v{currentFile.versionNumber}
                  </Badge>
                )}
                {currentFile.isCurrent && versions.length > 0 && (
                  <Badge className="text-xs shrink-0">Latest</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {taskDescription}
              </p>
            </div>
            
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {isPreviewable(currentFile.fileName) && (
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
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            {currentFile.fileSize && (
              <span>{formatBytes(parseInt(currentFile.fileSize))}</span>
            )}
            {currentFile.uploadedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(currentFile.uploadedAt), "MMM d, yyyy")}
              </span>
            )}
            {versions.length > 0 && (
              <button
                onClick={() => setShowVersionToggle(!showVersionToggle)}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <History className="w-3 h-3" />
                {versions.length + 1} versions
              </button>
            )}
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="flex items-center gap-1 text-primary hover:underline"
              data-testid={`button-toggle-feedback-${deliverable.id}`}
            >
              <MessageSquare className="w-3 h-3" />
              Feedback
            </button>
          </div>

          {showVersionToggle && versions.length > 0 && (
            <div className="flex items-center gap-3 pt-2 border-t border-border/50 mt-2">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Version:</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <Button
                  size="sm"
                  variant={selectedVersionIndex === -1 ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setSelectedVersionIndex(-1)}
                >
                  Latest
                </Button>
                {versions.map((version, idx) => (
                  <Button
                    key={version.id}
                    size="sm"
                    variant={selectedVersionIndex === idx ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setSelectedVersionIndex(idx)}
                  >
                    v{version.versionNumber}
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs ml-auto"
                onClick={() => onViewVersions(deliverable)}
              >
                View All
              </Button>
            </div>
          )}

          {showFeedback && (
            <div className="pt-3 mt-3 border-t border-border/50">
              <FeedbackForm 
                targetType="deliverable" 
                targetId={deliverable.id}
                title="Deliverable Feedback"
                showStats={false}
              />
            </div>
          )}
        </div>
      </div>
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
    enabled: !!selectedDeliverable,
  });

  const { data: allVersionsMap } = useQuery<Record<number, DeliverableVersion[]>>({
    queryKey: ["/api/deliverables/all-versions"],
    queryFn: async () => {
      if (!deliverables) return {};
      const map: Record<number, DeliverableVersion[]> = {};
      for (const d of deliverables) {
        try {
          const res = await fetch(`/api/deliverables/${d.id}/versions`, { credentials: "include" });
          if (res.ok) {
            map[d.id] = await res.json();
          }
        } catch {
          map[d.id] = [];
        }
      }
      return map;
    },
    enabled: !!deliverables && deliverables.length > 0,
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
      queryClient.invalidateQueries({ queryKey: ["/api/deliverables/all-versions"] });
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

          <div className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors">
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
              className={`flex flex-col items-center gap-3 cursor-pointer ${!selectedTaskId ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
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
                <Skeleton key={i} className="h-24" data-testid={`skeleton-deliverable-${i}`} />
              ))}
            </div>
          ) : filteredDeliverables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-deliverables">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
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
                  versions={allVersionsMap?.[deliverable.id] || []}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              {selectedDeliverable && (
                <div className="p-4 border rounded-xl bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-4">
                    {isImageFile(selectedDeliverable.fileName) ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border">
                        <img 
                          src={selectedDeliverable.filePath} 
                          alt={selectedDeliverable.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                        {getFileIcon(selectedDeliverable.fileName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{selectedDeliverable.fileName}</p>
                        <Badge>Current</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedDeliverable.uploadedAt && 
                          format(new Date(selectedDeliverable.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                        {selectedDeliverable.fileSize && 
                          ` - ${formatBytes(parseInt(selectedDeliverable.fileSize))}`}
                      </p>
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

              {versions && versions.length > 0 ? (
                versions.map((version) => (
                  <div key={version.id} className="p-4 border rounded-xl">
                    <div className="flex items-center gap-4">
                      {isImageFile(version.fileName) ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted border">
                          <img 
                            src={version.filePath} 
                            alt={version.fileName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
                          {getFileIcon(version.fileName)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{version.fileName}</p>
                          <Badge variant="outline">v{version.versionNumber}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => window.open(version.filePath, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
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
                  "mt-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
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
                    <span className="truncate max-w-[200px] text-sm">{versionFile.name}</span>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
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
