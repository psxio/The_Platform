import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Deliverable, ContentTask } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Upload, Download, FileText, Trash2, AlertCircle, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function DeliverablesView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const { data: contentTasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: deliverables, isLoading, error } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
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

  const handleDownload = (filePath: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = filePath;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

          <div className="border-2 border-dashed border-primary rounded-md p-8 text-center bg-primary/5">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading || !selectedTaskId}
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
          <CardTitle className="text-lg">Uploaded Deliverables</CardTitle>
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
                Upload files to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="flex items-center justify-between p-4 border border-border rounded-md hover-elevate"
                  data-testid={`item-deliverable-${deliverable.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-filename-${deliverable.id}`}>
                        {deliverable.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getTaskDescription(deliverable.taskId)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {deliverable.fileSize && (
                          <Badge variant="secondary" className="text-xs">
                            {formatBytes(parseInt(deliverable.fileSize))}
                          </Badge>
                        )}
                        {deliverable.uploadedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(deliverable.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(deliverable.filePath, deliverable.fileName)}
                      data-testid={`button-download-${deliverable.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteDeliverableMutation.mutate(deliverable.id)}
                      data-testid={`button-delete-${deliverable.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
