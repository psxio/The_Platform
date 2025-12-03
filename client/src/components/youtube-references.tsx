import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Youtube, Plus, Trash2, ExternalLink, Play, X } from "lucide-react";
import type { YoutubeReference } from "@shared/schema";

interface YouTubeReferencesProps {
  targetType: string;
  targetId?: number;
  targetStringId?: string;
  title?: string;
  compact?: boolean;
}

const CATEGORIES = [
  { value: "reference", label: "Reference" },
  { value: "tutorial", label: "Tutorial" },
  { value: "inspiration", label: "Inspiration" },
  { value: "review", label: "Review" },
  { value: "music", label: "Music" },
  { value: "other", label: "Other" },
];

export function YouTubeReferences({ targetType, targetId, targetStringId, title = "YouTube References", compact = false }: YouTubeReferencesProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YoutubeReference | null>(null);
  const [formData, setFormData] = useState({
    videoUrl: "",
    title: "",
    description: "",
    category: "reference",
    tags: "",
  });

  const queryKey = targetStringId 
    ? ["/api/youtube-references/string", targetType, targetStringId]
    : ["/api/youtube-references", targetType, targetId];

  const { data: references = [], isLoading } = useQuery<YoutubeReference[]>({
    queryKey,
    queryFn: async () => {
      const url = targetStringId
        ? `/api/youtube-references/string/${targetType}/${targetStringId}`
        : `/api/youtube-references/${targetType}/${targetId}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch references");
      return res.json();
    },
    enabled: !!(targetId || targetStringId),
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/youtube-references", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          targetType,
          targetId: targetId || null,
          targetStringId: targetStringId || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setShowAddDialog(false);
      setFormData({ videoUrl: "", title: "", description: "", category: "reference", tags: "" });
      toast({ title: "Video added", description: "YouTube reference has been added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add video", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/youtube-references/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Video removed", description: "YouTube reference has been removed." });
    },
  });

  const extractVideoInfo = async (url: string) => {
    try {
      const urlObj = new URL(url);
      let videoId = "";
      if (urlObj.hostname.includes("youtube.com")) {
        videoId = urlObj.searchParams.get("v") || "";
      } else if (urlObj.hostname.includes("youtu.be")) {
        videoId = urlObj.pathname.slice(1);
      }
      if (videoId) {
        setFormData(prev => ({
          ...prev,
          videoUrl: url,
          title: prev.title || `Video ${videoId}`,
        }));
      }
    } catch {
      // Invalid URL
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoUrl || !formData.title) {
      toast({ title: "Error", description: "Video URL and title are required", variant: "destructive" });
      return;
    }
    addMutation.mutate(formData);
  };

  const openPlayer = (ref: YoutubeReference) => {
    setSelectedVideo(ref);
    setShowPlayerDialog(true);
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Youtube className="h-4 w-4 text-red-500" />
            <span>Videos ({references.length})</span>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" data-testid="button-add-youtube-compact">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add YouTube Reference</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.videoUrl}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, videoUrl: e.target.value }));
                      extractVideoInfo(e.target.value);
                    }}
                    data-testid="input-youtube-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-youtube-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger data-testid="select-youtube-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-youtube-description"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit-youtube">
                    {addMutation.isPending ? "Adding..." : "Add Video"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {references.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {references.slice(0, 3).map((ref) => (
              <button
                key={ref.id}
                onClick={() => openPlayer(ref)}
                className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs hover-elevate"
                data-testid={`button-play-video-${ref.id}`}
              >
                <Play className="h-3 w-3 text-red-500" />
                <span className="max-w-[100px] truncate">{ref.title}</span>
              </button>
            ))}
            {references.length > 3 && (
              <span className="text-xs text-muted-foreground">+{references.length - 3} more</span>
            )}
          </div>
        )}

        <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{selectedVideo?.title}</DialogTitle>
            </DialogHeader>
            {selectedVideo && (
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Youtube className="h-5 w-5 text-red-500" />
          {title}
        </CardTitle>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-youtube">
              <Plus className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add YouTube Reference</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, videoUrl: e.target.value }));
                    extractVideoInfo(e.target.value);
                  }}
                  data-testid="input-youtube-url"
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-youtube-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger data-testid="select-youtube-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-youtube-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input
                  placeholder="music, tutorial, review"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  data-testid="input-youtube-tags"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit-youtube">
                  {addMutation.isPending ? "Adding..." : "Add Video"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : references.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No YouTube references yet. Add your first video!
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {references.map((ref) => (
              <div key={ref.id} className="group relative rounded-lg border overflow-hidden hover-elevate">
                <div 
                  className="aspect-video relative cursor-pointer"
                  onClick={() => openPlayer(ref)}
                  data-testid={`video-card-${ref.id}`}
                >
                  <img
                    src={ref.thumbnailUrl || `https://img.youtube.com/vi/${ref.videoId}/mqdefault.jpg`}
                    alt={ref.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium line-clamp-2 text-sm">{ref.title}</h4>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => window.open(ref.videoUrl, "_blank")}
                        data-testid={`button-open-external-${ref.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(ref.id)}
                        data-testid={`button-delete-video-${ref.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {ref.category && (
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORIES.find(c => c.value === ref.category)?.label || ref.category}
                    </Badge>
                  )}
                  {ref.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{ref.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedVideo?.title}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowPlayerDialog(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg"
                />
              </div>
              {selectedVideo.description && (
                <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
              )}
              {selectedVideo.tags && (
                <div className="flex flex-wrap gap-1">
                  {selectedVideo.tags.split(",").map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
