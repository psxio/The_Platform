import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ModelViewer } from "@/components/model-viewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Eye,
  History,
  Plus,
} from "lucide-react";
import type { ModelGenerationJob, ModelExportFormat } from "@shared/schema";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: <Clock className="w-3 h-3" /> },
  generating_code: { label: "Generating Code", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: <Sparkles className="w-3 h-3 animate-pulse" /> },
  running_blender: { label: "Running Blender", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", icon: <Cpu className="w-3 h-3 animate-spin" /> },
  exporting: { label: "Exporting", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: <Package className="w-3 h-3" /> },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive", icon: <AlertCircle className="w-3 h-3" /> },
};

const formatConfig: Record<ModelExportFormat, { label: string; description: string; viewable: boolean }> = {
  glb: { label: "GLB", description: "Binary glTF - Best for web viewing", viewable: true },
  fbx: { label: "FBX", description: "Autodesk format - Unity/Unreal", viewable: false },
  blend: { label: "Blender", description: "Native Blender file", viewable: false },
  obj: { label: "OBJ", description: "Wavefront OBJ - Universal", viewable: false },
  stl: { label: "STL", description: "For 3D printing", viewable: false },
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

interface BlenderHealth {
  ok: boolean;
  version?: string;
  error?: string;
}

export default function ModelGenerator() {
  const [prompt, setPrompt] = useState("");
  const [exportFormat, setExportFormat] = useState<ModelExportFormat>("glb");
  const [selectedJob, setSelectedJob] = useState<ModelGenerationJob | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const { toast } = useToast();

  const { data: health, isError: healthError, isLoading: healthLoading } = useQuery<BlenderHealth>({
    queryKey: ["/api/model-generation/health"],
    staleTime: 60000,
    retry: 1,
  });

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
      setActiveTab("history");
      toast({
        title: "Generation started",
        description: "Your 3D model is being generated. This may take 1-2 minutes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start generation",
        description: error.message || "Something went wrong. Check if the AI service is configured.",
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
      if (selectedJob && deleteJobMutation.variables === selectedJob.id) {
        setSelectedJob(null);
      }
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

  const handleSelectJob = (job: ModelGenerationJob) => {
    setSelectedJob(job);
    if (job.status === "completed") {
      setActiveTab("viewer");
    }
  };

  const activeJobs = jobs.filter(j => !["completed", "failed"].includes(j.status));
  const completedJobs = jobs.filter(j => j.status === "completed");
  const failedJobs = jobs.filter(j => j.status === "failed");

  const viewerUrl = selectedJob?.status === "completed" && selectedJob.exportFormat === "glb"
    ? `/api/model-generation/download/${selectedJob.id}`
    : null;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Box className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="heading-3d-generator">3D Model Generator</h1>
            <p className="text-muted-foreground">Create 3D models from text descriptions using AI + Blender</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant={healthError || (health && !health.ok) ? "destructive" : "secondary"} 
                className={cn(
                  health?.ok && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  healthLoading && "animate-pulse"
                )}
                data-testid="badge-blender-status"
              >
                {healthLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Checking Blender...
                  </>
                ) : healthError ? (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Blender Unavailable
                  </>
                ) : health?.ok ? (
                  <>
                    <Cpu className="w-3 h-3 mr-1" />
                    Blender {health.version}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Blender Error
                  </>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {healthLoading 
                ? "Checking Blender availability..."
                : healthError 
                  ? "Failed to connect to Blender service"
                  : health?.ok 
                    ? `Blender ${health.version} is ready for model generation`
                    : `Blender error: ${health?.error || "Unknown error"}`
              }
            </TooltipContent>
          </Tooltip>
          {activeJobs.length > 0 && (
            <Badge variant="secondary" className="animate-pulse">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              {activeJobs.length} processing
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="create" className="flex items-center gap-1" data-testid="tab-create">
                <Plus className="w-4 h-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="viewer" className="flex items-center gap-1" data-testid="tab-viewer">
                <Eye className="w-4 h-4" />
                3D Viewer
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1" data-testid="tab-history">
                <History className="w-4 h-4" />
                History
                {jobs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {jobs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Create New Model
                  </CardTitle>
                  <CardDescription>
                    Describe the 3D model you want to create. The AI generates Blender code which is then rendered.
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
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{config.label}</span>
                                {config.viewable && (
                                  <Badge variant="outline" className="text-xs h-5">
                                    <Eye className="w-3 h-3 mr-1" />
                                    Viewable
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatConfig[exportFormat]?.description}
                        {!formatConfig[exportFormat]?.viewable && " (download only, no browser preview)"}
                      </p>
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
                      <li>Simple geometric shapes work best</li>
                      <li>Use GLB format for in-browser viewing</li>
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
            </TabsContent>

            <TabsContent value="viewer">
              <div className="space-y-4">
                {selectedJob ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{selectedJob.prompt}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={statusConfig[selectedJob.status]?.color}>
                            {statusConfig[selectedJob.status]?.icon}
                            <span className="ml-1">{statusConfig[selectedJob.status]?.label}</span>
                          </Badge>
                          <Badge variant="outline">
                            {formatConfig[selectedJob.exportFormat as ModelExportFormat]?.label}
                          </Badge>
                          {selectedJob.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              {formatBytes(selectedJob.fileSize)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailsDialogOpen(true)}
                          data-testid="button-view-details"
                        >
                          <Code2 className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        {selectedJob.status === "completed" && (
                          <Button
                            size="sm"
                            onClick={() => handleDownload(selectedJob)}
                            data-testid="button-download-model"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                    <ModelViewer
                      modelUrl={viewerUrl}
                      format={selectedJob.exportFormat}
                      className="h-[500px]"
                    />
                  </>
                ) : (
                  <Card className="h-[500px] flex items-center justify-center">
                    <CardContent className="text-center">
                      <Eye className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground mb-2">No model selected</p>
                      <p className="text-sm text-muted-foreground">
                        Select a completed model from the sidebar or history tab to preview it
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Generation History
                  </CardTitle>
                  <CardDescription>
                    All your model generation jobs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-center py-12">
                      <Box className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                      <p className="text-muted-foreground">No models generated yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setActiveTab("create")}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first model
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3 pr-4">
                        {jobs.map((job) => (
                          <div
                            key={job.id}
                            className={cn(
                              "p-4 border rounded-lg hover-elevate cursor-pointer transition-colors",
                              selectedJob?.id === job.id && "border-primary bg-primary/5"
                            )}
                            onClick={() => handleSelectJob(job)}
                            data-testid={`job-item-${job.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium line-clamp-2">{job.prompt}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <Badge variant="secondary" className={statusConfig[job.status]?.color}>
                                    {statusConfig[job.status]?.icon}
                                    <span className="ml-1">{statusConfig[job.status]?.label}</span>
                                  </Badge>
                                  <Badge variant="outline">
                                    {formatConfig[job.exportFormat as ModelExportFormat]?.label}
                                  </Badge>
                                  {job.fileSize && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatBytes(job.fileSize)}
                                    </span>
                                  )}
                                  {job.processingTimeMs && (
                                    <span className="text-xs text-muted-foreground">
                                      {formatDuration(job.processingTimeMs)}
                                    </span>
                                  )}
                                </div>
                                {job.status === "failed" && job.errorMessage && (
                                  <p className="text-xs text-destructive mt-2 line-clamp-2">
                                    {job.errorMessage}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {job.createdAt && format(new Date(job.createdAt), "PPp")}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {job.status === "completed" && (
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
                                )}
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
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Quick Access
              </CardTitle>
              <CardDescription>Recently completed models</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : completedJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Box className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No completed models yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {completedJobs.slice(0, 10).map((job) => (
                      <div
                        key={job.id}
                        className={cn(
                          "p-3 border rounded-lg hover-elevate cursor-pointer",
                          selectedJob?.id === job.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => handleSelectJob(job)}
                        data-testid={`quick-access-${job.id}`}
                      >
                        <p className="text-sm font-medium line-clamp-1">{job.prompt}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs h-5">
                            {formatConfig[job.exportFormat as ModelExportFormat]?.label}
                          </Badge>
                          {formatConfig[job.exportFormat as ModelExportFormat]?.viewable && (
                            <Eye className="w-3 h-3 text-muted-foreground" />
                          )}
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
                <div className="space-y-2">
                  {failedJobs.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="p-3 border border-destructive/20 rounded-lg cursor-pointer hover-elevate"
                      onClick={() => {
                        setSelectedJob(job);
                        setDetailsDialogOpen(true);
                      }}
                      data-testid={`job-failed-${job.id}`}
                    >
                      <p className="text-sm font-medium line-clamp-1">{job.prompt}</p>
                      <p className="text-xs text-destructive line-clamp-1 mt-1">{job.errorMessage}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 h-6 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJobMutation.mutate(job.id);
                        }}
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 text-blue-500" />
                <p>AI analyzes your prompt and generates Blender Python code</p>
              </div>
              <div className="flex items-start gap-2">
                <Cpu className="w-4 h-4 mt-0.5 text-orange-500" />
                <p>Blender renders the 3D model from the generated code</p>
              </div>
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 mt-0.5 text-purple-500" />
                <p>Model is exported in your chosen format</p>
              </div>
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 mt-0.5 text-emerald-500" />
                <p>GLB models can be previewed directly in the browser</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
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
                    <h4 className="text-sm font-medium mb-1">Status</h4>
                    <Badge variant="secondary" className={statusConfig[selectedJob.status]?.color}>
                      {statusConfig[selectedJob.status]?.icon}
                      <span className="ml-1">{statusConfig[selectedJob.status]?.label}</span>
                    </Badge>
                  </div>
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

                {selectedJob.status === "failed" && selectedJob.errorMessage && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <h4 className="text-sm font-medium text-destructive mb-1">Error</h4>
                    <p className="text-sm text-destructive">{selectedJob.errorMessage}</p>
                  </div>
                )}

                {selectedJob.status === "completed" && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleDownload(selectedJob)} data-testid="button-dialog-download">
                      <Download className="w-4 h-4 mr-2" />
                      Download Model
                    </Button>
                    {formatConfig[selectedJob.exportFormat as ModelExportFormat]?.viewable && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDetailsDialogOpen(false);
                          setActiveTab("viewer");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View in 3D
                      </Button>
                    )}
                  </div>
                )}

                <Separator />

                <Accordion type="multiple" defaultValue={selectedJob.status === "failed" ? ["code", "logs"] : []}>
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
