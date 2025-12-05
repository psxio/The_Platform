import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Box,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  Trash2,
  RefreshCw,
  Sparkles,
  Cpu,
  Package,
  FileCode,
} from "lucide-react";
import type { ModelGenerationJob, ModelExportFormat } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: <Clock className="w-3 h-3" /> },
  generating_code: { label: "Generating Code", color: "bg-blue-500/10 text-blue-600", icon: <Sparkles className="w-3 h-3 animate-pulse" /> },
  running_blender: { label: "Running Blender", color: "bg-orange-500/10 text-orange-600", icon: <Cpu className="w-3 h-3 animate-spin" /> },
  exporting: { label: "Exporting", color: "bg-purple-500/10 text-purple-600", icon: <Package className="w-3 h-3" /> },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: <AlertCircle className="w-3 h-3" /> },
};

const formatConfig: Record<ModelExportFormat, { label: string; description: string }> = {
  glb: { label: "GLB", description: "Binary glTF - Best for web & games" },
  fbx: { label: "FBX", description: "Autodesk format - Great for Unity/Unreal" },
  blend: { label: "Blender", description: "Native Blender file - Full editability" },
  obj: { label: "OBJ", description: "Wavefront OBJ - Universal compatibility" },
  stl: { label: "STL", description: "Stereolithography - For 3D printing" },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function ModelGenerator() {
  const [prompt, setPrompt] = useState("");
  const [exportFormat, setExportFormat] = useState<ModelExportFormat>("glb");
  const [selectedJob, setSelectedJob] = useState<ModelGenerationJob | null>(null);
  const { toast } = useToast();

  const { data: jobs = [], isLoading } = useQuery<ModelGenerationJob[]>({
    queryKey: ["/api/model-generation/jobs"],
    refetchInterval: 3000,
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: { prompt: string; exportFormat: string }) => {
      const response = await apiRequest("POST", "/api/model-generation/jobs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-generation/jobs"] });
      setPrompt("");
      toast({
        title: "Generation started",
        description: "Your 3D model is being generated. This may take a few minutes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start generation",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/model-generation/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-generation/jobs"] });
      toast({ title: "Job deleted" });
    },
  });

  const handleSubmit = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the 3D model you want to create",
        variant: "destructive",
      });
      return;
    }
    createJobMutation.mutate({ prompt: prompt.trim(), exportFormat });
  };

  const handleDownload = (job: ModelGenerationJob) => {
    window.open(`/api/model-generation/download/${job.id}`, "_blank");
  };

  const activeJobs = jobs.filter(j => !["completed", "failed"].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === "completed");
  const failedJobs = jobs.filter(j => j.status === "failed");

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Box className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-3d-generator">3D Model Generator</h1>
          <p className="text-muted-foreground">Create 3D models from text descriptions using AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Create New Model
              </CardTitle>
              <CardDescription>
                Describe the 3D model you want to create and the AI will generate it for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe your 3D model... e.g., 'A low-poly tree with green leaves and brown trunk' or 'A red sports car with metallic paint'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="resize-none"
                  data-testid="input-model-prompt"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Export Format</label>
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ModelExportFormat)}>
                    <SelectTrigger data-testid="select-export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(formatConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span className="font-medium">{config.label}</span>
                            <span className="text-xs text-muted-foreground">{config.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={createJobMutation.isPending || !prompt.trim()}
                    className="w-full sm:w-auto"
                    data-testid="button-generate-model"
                  >
                    {createJobMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Model
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <h4 className="font-medium mb-2">Tips for better results:</h4>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Be specific about colors, materials, and dimensions</li>
                  <li>Mention the style (low-poly, realistic, stylized, etc.)</li>
                  <li>Describe key features and details</li>
                  <li>Simple geometric shapes work best</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {activeJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing ({activeJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                    data-testid={`job-processing-${job.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.prompt}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={statusConfig[job.status]?.color}>
                          {statusConfig[job.status]?.icon}
                          <span className="ml-1">{statusConfig[job.status]?.label}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatConfig[job.exportFormat as ModelExportFormat]?.label}
                        </span>
                      </div>
                    </div>
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Completed ({completedJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : completedJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No completed models yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {completedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 border rounded-lg hover-elevate cursor-pointer"
                        onClick={() => setSelectedJob(job)}
                        data-testid={`job-completed-${job.id}`}
                      >
                        <p className="text-sm font-medium line-clamp-2 mb-2">{job.prompt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {formatConfig[job.exportFormat as ModelExportFormat]?.label}
                            </Badge>
                            {job.fileSize && (
                              <span className="text-xs text-muted-foreground">
                                {formatBytes(job.fileSize)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(job);
                                  }}
                                  data-testid={`button-download-${job.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Download</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteJobMutation.mutate(job.id);
                                  }}
                                  data-testid={`button-delete-${job.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {failedJobs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  Failed ({failedJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {failedJobs.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="p-3 border border-destructive/20 rounded-lg"
                      data-testid={`job-failed-${job.id}`}
                    >
                      <p className="text-sm font-medium line-clamp-1 mb-1">{job.prompt}</p>
                      <p className="text-xs text-destructive line-clamp-2">{job.errorMessage}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-7 text-xs"
                        onClick={() => deleteJobMutation.mutate(job.id)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Model Details</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Prompt</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedJob.prompt}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Format</h4>
                    <Badge variant="secondary">
                      {formatConfig[selectedJob.exportFormat as ModelExportFormat]?.label}
                    </Badge>
                  </div>
                  {selectedJob.fileSize && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Size</h4>
                      <Badge variant="outline">{formatBytes(selectedJob.fileSize)}</Badge>
                    </div>
                  )}
                  {selectedJob.processingTimeMs && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Processing Time</h4>
                      <Badge variant="outline">{formatDuration(selectedJob.processingTimeMs)}</Badge>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium mb-1">Created</h4>
                    <span className="text-sm text-muted-foreground">
                      {selectedJob.createdAt && format(new Date(selectedJob.createdAt), "PPp")}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleDownload(selectedJob)} data-testid="button-dialog-download">
                    <Download className="w-4 h-4 mr-2" />
                    Download Model
                  </Button>
                </div>

                <Separator />

                <Accordion type="single" collapsible>
                  {selectedJob.generatedCode && (
                    <AccordionItem value="code">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4" />
                          Generated Blender Code
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-[300px]">
                          <code>{selectedJob.generatedCode}</code>
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {selectedJob.blenderLogs && (
                    <AccordionItem value="logs">
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Blender Logs
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                          {selectedJob.blenderLogs}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
