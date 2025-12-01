import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, AlertTriangle, CheckCircle, XCircle, Loader2, Trash2, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DeliverableAnnotation, User } from "@shared/schema";

interface DeliverableAnnotationsProps {
  deliverableId: number;
  versionId?: number;
  currentUser: User;
}

type AnnotationType = "comment" | "revision_request" | "approval" | "rejection";

const annotationTypeConfig: Record<AnnotationType, { label: string; icon: React.ReactNode; color: string }> = {
  comment: { 
    label: "Comment", 
    icon: <MessageSquare className="h-3 w-3" />,
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
  },
  revision_request: { 
    label: "Revision Request", 
    icon: <AlertTriangle className="h-3 w-3" />,
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"
  },
  approval: { 
    label: "Approval", 
    icon: <CheckCircle className="h-3 w-3" />,
    color: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
  },
  rejection: { 
    label: "Rejection", 
    icon: <XCircle className="h-3 w-3" />,
    color: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
  },
};

interface AnnotationWithUser extends DeliverableAnnotation {
  user?: {
    firstName?: string | null;
    lastName?: string | null;
  };
}

export function DeliverableAnnotations({ deliverableId, versionId, currentUser }: DeliverableAnnotationsProps) {
  const { toast } = useToast();
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<AnnotationType>("comment");

  const queryKey = versionId 
    ? ["/api/deliverables", deliverableId, "annotations", versionId]
    : ["/api/deliverables", deliverableId, "annotations"];

  const { data: annotations = [], isLoading } = useQuery<AnnotationWithUser[]>({
    queryKey,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { content: string; annotationType: AnnotationType }) =>
      apiRequest("POST", `/api/deliverables/${deliverableId}/annotations`, {
        ...data,
        versionId: versionId || null,
      }),
    onSuccess: () => {
      setNewContent("");
      setNewType("comment");
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Annotation added" });
    },
    onError: () => {
      toast({ title: "Failed to add annotation", variant: "destructive" });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("POST", `/api/annotations/${id}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Annotation resolved" });
    },
    onError: () => {
      toast({ title: "Failed to resolve annotation", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest("DELETE", `/api/annotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Annotation deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete annotation", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!newContent.trim()) return;
    createMutation.mutate({
      content: newContent.trim(),
      annotationType: newType,
    });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName) return "?";
    return `${firstName.charAt(0)}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  const openAnnotations = annotations.filter(a => a.status === "open");
  const resolvedAnnotations = annotations.filter(a => a.status === "resolved");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="deliverable-annotations">
      <ScrollArea className="max-h-[250px]">
        {annotations.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No annotations yet</p>
            <p className="text-xs">Add feedback or revision requests below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openAnnotations.map((annotation) => {
              const typeConfig = annotationTypeConfig[annotation.annotationType as AnnotationType] || annotationTypeConfig.comment;
              const canDelete = annotation.userId === currentUser.id || currentUser.role === "admin";
              
              return (
                <div key={annotation.id} className="flex gap-3 group" data-testid={`annotation-${annotation.id}`}>
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(annotation.user?.firstName, annotation.user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {annotation.user?.firstName || "User"} {annotation.user?.lastName || ""}
                      </span>
                      <Badge variant="outline" className={`text-xs ${typeConfig.color}`}>
                        {typeConfig.icon}
                        <span className="ml-1">{typeConfig.label}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(annotation.createdAt!), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm bg-muted p-2 rounded-md">{annotation.content}</p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {annotation.annotationType !== "comment" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => resolveMutation.mutate(annotation.id)}
                          disabled={resolveMutation.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Resolve
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(annotation.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {resolvedAnnotations.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground font-medium">Resolved ({resolvedAnnotations.length})</p>
                {resolvedAnnotations.map((annotation) => {
                  const typeConfig = annotationTypeConfig[annotation.annotationType as AnnotationType] || annotationTypeConfig.comment;
                  
                  return (
                    <div key={annotation.id} className="flex gap-3 opacity-60" data-testid={`annotation-resolved-${annotation.id}`}>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-xs">
                          {getInitials(annotation.user?.firstName, annotation.user?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium line-through">
                            {annotation.user?.firstName || "User"} {annotation.user?.lastName || ""}
                          </span>
                          <Badge variant="outline" className="text-xs bg-muted">
                            <Check className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-through">{annotation.content}</p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </ScrollArea>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Select value={newType} onValueChange={(v) => setNewType(v as AnnotationType)}>
            <SelectTrigger className="w-[160px] h-8" data-testid="select-annotation-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comment">Comment</SelectItem>
              <SelectItem value="revision_request">Revision Request</SelectItem>
              <SelectItem value="approval">Approval</SelectItem>
              <SelectItem value="rejection">Rejection</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Textarea
          placeholder="Add feedback or request revisions..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="resize-none min-h-[60px]"
          data-testid="input-annotation"
        />
        
        <Button
          onClick={handleSubmit}
          disabled={!newContent.trim() || createMutation.isPending}
          size="sm"
          data-testid="button-add-annotation"
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Add Annotation
        </Button>
      </div>
    </div>
  );
}
