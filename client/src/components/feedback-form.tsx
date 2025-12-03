import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Star, Plus, Reply, Trash2 } from "lucide-react";
import type { FeedbackSubmission, User } from "@shared/schema";
import { format } from "date-fns";

interface FeedbackFormProps {
  targetType: string;
  targetId: number;
  title?: string;
  showStats?: boolean;
}

const CATEGORIES = [
  { value: "quality", label: "Quality" },
  { value: "communication", label: "Communication" },
  { value: "timeliness", label: "Timeliness" },
  { value: "creativity", label: "Creativity" },
  { value: "value", label: "Value" },
  { value: "general", label: "General" },
];

export function FeedbackForm({ targetType, targetId, title = "Feedback", showStats = true }: FeedbackFormProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackSubmission | null>(null);
  const [responseText, setResponseText] = useState("");
  const [formData, setFormData] = useState({
    category: "general",
    rating: 5,
    comment: "",
    isPublic: false,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: feedback = [], isLoading } = useQuery<FeedbackSubmission[]>({
    queryKey: ["/api/feedback", targetType, targetId],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/${targetType}/${targetId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
  });

  const { data: stats } = useQuery<{ avgRating: number; totalCount: number; byCategory: Record<string, number> }>({
    queryKey: ["/api/feedback", targetType, targetId, "stats"],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/${targetType}/${targetId}/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: showStats,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          targetType,
          targetId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback", targetType, targetId] });
      setShowAddDialog(false);
      setFormData({ category: "general", rating: 5, comment: "", isPublic: false });
      toast({ title: "Feedback submitted", description: "Thank you for your feedback!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit feedback", variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      return apiRequest(`/api/feedback/${id}/respond`, {
        method: "POST",
        body: JSON.stringify({ responseText: text }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback", targetType, targetId] });
      setShowRespondDialog(false);
      setResponseText("");
      toast({ title: "Response added", description: "Your response has been recorded." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/feedback/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback", targetType, targetId] });
      toast({ title: "Feedback deleted" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate(formData);
  };

  const handleRespond = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFeedback && responseText.trim()) {
      respondMutation.mutate({ id: selectedFeedback.id, text: responseText });
    }
  };

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
            data-testid={interactive ? `star-rating-${star}` : undefined}
          >
            <Star
              className={`h-5 w-5 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
    );
  };

  const canRespond = currentUser?.role === "admin" || currentUser?.role === "content";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            {title}
          </CardTitle>
          {showStats && stats && stats.totalCount > 0 && (
            <CardDescription className="flex items-center gap-2 mt-1">
              {renderStars(Math.round(stats.avgRating))}
              <span>{stats.avgRating.toFixed(1)} ({stats.totalCount} reviews)</span>
            </CardDescription>
          )}
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-feedback">
              <Plus className="mr-2 h-4 w-4" />
              Add Feedback
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Feedback</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Rating</Label>
                <div className="flex items-center gap-3">
                  {renderStars(formData.rating, true, (r) => setFormData(prev => ({ ...prev, rating: r })))}
                  <span className="text-sm text-muted-foreground">{formData.rating}/5</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                  <SelectTrigger data-testid="select-feedback-category">
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
                <Label>Comment</Label>
                <Textarea
                  placeholder="Share your thoughts..."
                  value={formData.comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                  data-testid="input-feedback-comment"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                  data-testid="checkbox-feedback-public"
                />
                <Label htmlFor="isPublic" className="text-sm font-normal">Make this feedback public</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitMutation.isPending} data-testid="button-submit-feedback">
                  {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {showStats && stats && stats.totalCount > 0 && (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium">Rating Distribution</h4>
            <div className="space-y-1">
              {CATEGORIES.filter(c => stats.byCategory[c.value]).map(cat => (
                <div key={cat.value} className="flex items-center gap-2 text-sm">
                  <span className="w-24 text-muted-foreground">{cat.label}</span>
                  <Progress 
                    value={(stats.byCategory[cat.value] / stats.totalCount) * 100} 
                    className="h-2 flex-1"
                  />
                  <span className="w-8 text-right text-muted-foreground">{stats.byCategory[cat.value]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading feedback...</div>
        ) : feedback.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No feedback yet. Be the first to share your thoughts!
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-lg border p-4 space-y-3" data-testid={`feedback-item-${item.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        {renderStars(item.rating)}
                        <Badge variant="secondary" className="text-xs">{
                          CATEGORIES.find(c => c.value === item.category)?.label || item.category
                        }</Badge>
                        {item.isPublic && (
                          <Badge variant="outline" className="text-xs">Public</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.createdAt && format(new Date(item.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {canRespond && !item.respondedAt && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setSelectedFeedback(item);
                          setShowRespondDialog(true);
                        }}
                        data-testid={`button-respond-${item.id}`}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    )}
                    {(item.submittedBy === currentUser?.id || currentUser?.role === "admin") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`button-delete-feedback-${item.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {item.comment && (
                  <p className="text-sm">{item.comment}</p>
                )}
                {item.responseText && (
                  <div className="ml-8 rounded-lg bg-muted p-3 text-sm">
                    <p className="font-medium text-xs text-muted-foreground mb-1">
                      Response • {item.respondedAt && format(new Date(item.respondedAt), "MMM d, yyyy")}
                    </p>
                    <p>{item.responseText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRespond} className="space-y-4">
            {selectedFeedback && (
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedFeedback.rating)}
                  <Badge variant="secondary" className="text-xs">{selectedFeedback.category}</Badge>
                </div>
                {selectedFeedback.comment && <p>{selectedFeedback.comment}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Your Response</Label>
              <Textarea
                placeholder="Write your response..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                data-testid="input-feedback-response"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={respondMutation.isPending || !responseText.trim()} data-testid="button-submit-response">
                {respondMutation.isPending ? "Sending..." : "Send Response"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
