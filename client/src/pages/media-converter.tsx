import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Music,
  Download, 
  Trash2, 
  Loader2,
  Youtube,
  Clock,
  FileAudio,
  CheckCircle,
  XCircle,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { MediaConversion } from "@shared/schema";

interface ConversionWithProgress extends MediaConversion {
  progress?: {
    percent: number;
    status: string;
  } | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "--";
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
    case "processing":
      return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
    case "pending":
      return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    case "failed":
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function MediaConverter() {
  const [url, setUrl] = useState("");
  const { toast } = useToast();

  const { data: conversions, isLoading: isLoadingConversions, refetch } = useQuery<MediaConversion[]>({
    queryKey: ['/api/media-conversions'],
  });

  const startConversionMutation = useMutation({
    mutationFn: async (videoUrl: string) => {
      const res = await apiRequest("POST", "/api/media-convert", { url: videoUrl });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Conversion Started",
        description: `Converting: ${data.title}`,
      });
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ['/api/media-conversions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteConversionMutation = useMutation({
    mutationFn: async (conversionId: number) => {
      await apiRequest("DELETE", `/api/media-conversions/${conversionId}`);
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Conversion removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/media-conversions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const hasProcessing = conversions?.some(c => c.status === 'processing' || c.status === 'pending');
    if (hasProcessing) {
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [conversions, refetch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }
    startConversionMutation.mutate(url.trim());
  };

  const handleDownload = (conversionId: number) => {
    window.open(`/api/media-conversions/${conversionId}/download`, '_blank');
  };

  const isValidUrl = (urlString: string) => {
    return urlString.includes('youtube.com') || urlString.includes('youtu.be');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-6 h-6 text-primary" />
            YouTube to MP3
          </h1>
          <p className="text-muted-foreground mt-1">
            Convert YouTube videos to MP3 audio files
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoadingConversions}
          data-testid="button-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingConversions ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            New Conversion
          </CardTitle>
          <CardDescription>
            Paste a YouTube video URL to convert it to MP3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10"
                disabled={startConversionMutation.isPending}
                data-testid="input-url"
              />
            </div>
            <Button 
              type="submit" 
              disabled={startConversionMutation.isPending || !url.trim()}
              className="min-w-[140px]"
              data-testid="button-convert"
            >
              {startConversionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 mr-2" />
                  Convert to MP3
                </>
              )}
            </Button>
          </form>
          {url && !isValidUrl(url) && (
            <p className="text-xs text-yellow-600 mt-2">
              Please enter a valid YouTube URL (youtube.com or youtu.be)
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            Your Conversions
          </CardTitle>
          <CardDescription>
            View and download your converted audio files
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingConversions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !conversions || conversions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileAudio className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversions yet</p>
              <p className="text-sm">Paste a YouTube URL above to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {conversions.map((conversion) => (
                  <div
                    key={conversion.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover-elevate gap-3"
                    data-testid={`conversion-item-${conversion.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(conversion.status || 'pending')}
                        <Badge variant="outline" className="text-xs">
                          <Youtube className="w-3 h-3 mr-1" />
                          {conversion.platform}
                        </Badge>
                      </div>
                      <h3 className="font-medium truncate" title={conversion.title || 'Untitled'}>
                        {conversion.title || 'Untitled'}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(conversion.duration)}
                        </span>
                        {conversion.fileSize && (
                          <span>{formatFileSize(conversion.fileSize)}</span>
                        )}
                        {conversion.createdAt && (
                          <span>
                            {new Date(conversion.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {conversion.status === 'failed' && conversion.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">
                          {conversion.errorMessage}
                        </p>
                      )}
                      {conversion.status === 'processing' && (
                        <Progress value={50} className="h-1 mt-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {conversion.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDownload(conversion.id)}
                          data-testid={`button-download-${conversion.id}`}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteConversionMutation.mutate(conversion.id)}
                        disabled={deleteConversionMutation.isPending}
                        data-testid={`button-delete-${conversion.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy a YouTube video URL from your browser</li>
              <li>Paste it in the input field above</li>
              <li>Click "Convert to MP3" to start the conversion</li>
              <li>Wait for the conversion to complete</li>
              <li>Click "Download" to save the MP3 file</li>
            </ol>
            <p className="text-xs mt-4">
              Note: Only YouTube videos are currently supported. Please ensure you have the right to download the content.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
