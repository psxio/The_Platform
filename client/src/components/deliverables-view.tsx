import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Deliverable, Task } from "@shared/schema";
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
import { ObjectUploader } from "@/components/object-uploader";
import { Upload, Download, FileText, Trash2, AlertCircle, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatBytes } from "@/lib/utils";

export function DeliverablesView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const { toast } = useToast();

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: deliverables, isLoading, error } = useQuery<Deliverable[]>({
    queryKey: ["/api/deliverables"],
  });

  const deleteDeliverableMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/deliverables/${id}`, undefined);
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

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", undefined);
      return {
        method: (response.method || "POST") as "PUT" | "POST",
        url: response.url,
        objectPath: response.objectPath,
      };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      return {
        method: "POST" as const,
        url: "/api/objects/upload-file",
      };
    }
  };

  const handleUploadComplete = async (result: { successful: Array<{ name: string; size: number; uploadURL: string }> }) => {
    if (!selectedTaskId) {
      toast({
        title: "Error",
        description: "Please select a task first.",
        variant: "destructive",
      });
      return;
    }

    const file = result.successful[0];
    if (!file) return;

    const payload = {
      taskId: selectedTaskId,
      fileName: file.name,
      filePath: file.uploadURL,
      fileSize: file.size.toString(),
    };

    try {
      await apiRequest("POST", "/api/deliverables", payload);

      queryClient.invalidateQueries({ queryKey: ["/api/deliverables"] });
      toast({
        title: "Uploaded",
        description: "File has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Failed to save deliverable:", error);
      toast({
        title: "Error",
        description: "Failed to save deliverable information.",
        variant: "destructive",
      });
    }
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
    !selectedTaskId || d.taskId === selectedTaskId
  ) || [];

  const getTaskDescription = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
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
                {tasks?.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
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

          <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={52428800}
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Drop files or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum file size: 50MB
                  </p>
                </div>
              </div>
            </ObjectUploader>
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
