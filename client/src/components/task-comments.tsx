import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Comment } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MessageCircle, Send, MoreVertical, Trash2, Pencil, Reply, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface CommentWithUser extends Comment {
  user?: {
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
  };
}

interface TaskCommentsProps {
  taskId: number;
  currentUserId: string;
}

function getInitials(firstName: string | null, lastName: string | null): string {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
}

interface CommentItemProps {
  comment: CommentWithUser;
  replies: CommentWithUser[];
  currentUserId: string;
  onReply: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onEdit: (comment: CommentWithUser) => void;
  replyingTo: number | null;
  onCancelReply: () => void;
  onSubmitReply: (content: string) => void;
  isSubmittingReply: boolean;
  taskId: number;
}

function CommentItem({ 
  comment, 
  replies, 
  currentUserId, 
  onReply, 
  onDelete,
  onEdit,
  replyingTo,
  onCancelReply,
  onSubmitReply,
  isSubmittingReply,
  taskId
}: CommentItemProps) {
  const [replyContent, setReplyContent] = useState("");
  const isOwner = comment.userId === currentUserId;

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    onSubmitReply(replyContent.trim());
    setReplyContent("");
  };

  return (
    <div className="space-y-3" data-testid={`comment-item-${comment.id}`}>
      <div className="flex gap-3">
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.user?.profileImageUrl || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(comment.user?.firstName || null, comment.user?.lastName || null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {comment.user?.firstName || "Unknown"} {comment.user?.lastName || ""}
              </span>
              <span className="text-xs text-muted-foreground">
                {comment.createdAt && formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onReply(comment.id)}>
                  <Reply className="h-4 w-4 mr-2" />
                  Reply
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(comment)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap" data-testid={`comment-content-${comment.id}`}>
            {comment.content}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mt-1 h-7 px-2 text-xs text-muted-foreground"
            onClick={() => onReply(comment.id)}
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        </div>
      </div>

      {replyingTo === comment.id && (
        <div className="ml-11 space-y-2">
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="min-h-[60px] text-sm"
            data-testid={`input-reply-${comment.id}`}
          />
          <div className="flex items-center gap-2">
            <Button 
              size="sm"
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || isSubmittingReply}
              data-testid={`button-submit-reply-${comment.id}`}
            >
              {isSubmittingReply ? "Sending..." : "Reply"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onCancelReply}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              replyingTo={replyingTo}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              isSubmittingReply={isSubmittingReply}
              taskId={taskId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TaskComments({ taskId, currentUserId }: TaskCommentsProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<CommentWithUser | null>(null);

  const { data: comments, isLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/content-tasks", taskId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/content-tasks/${taskId}/comments`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: number }) => {
      return apiRequest("POST", `/api/content-tasks/${taskId}/comments`, { content, parentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "comments"] });
      setNewComment("");
      setReplyingTo(null);
      toast({
        title: "Comment added",
        description: "Your comment has been posted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment.",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      return apiRequest("PATCH", `/api/comments/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "comments"] });
      setEditingComment(null);
      toast({
        title: "Comment updated",
        description: "Your comment has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/comments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "comments"] });
      toast({
        title: "Comment deleted",
        description: "The comment has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ content: newComment.trim() });
  };

  const handleSubmitReply = (content: string) => {
    if (!replyingTo) return;
    createCommentMutation.mutate({ content, parentId: replyingTo });
  };

  const topLevelComments = comments?.filter(c => !c.parentId) || [];
  const getReplies = (parentId: number) => 
    comments?.filter(c => c.parentId === parentId) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Comments</h3>
        {comments && comments.length > 0 && (
          <span className="text-sm text-muted-foreground">({comments.length})</span>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Write a comment..."
          value={editingComment ? editingComment.content : newComment}
          onChange={(e) => {
            if (editingComment) {
              setEditingComment({ ...editingComment, content: e.target.value });
            } else {
              setNewComment(e.target.value);
            }
          }}
          className="min-h-[80px]"
          data-testid="input-new-comment"
        />
        <div className="flex items-center gap-2">
          <Button 
            size="sm"
            onClick={() => {
              if (editingComment) {
                updateCommentMutation.mutate({ 
                  id: editingComment.id, 
                  content: editingComment.content 
                });
              } else {
                handleSubmitComment();
              }
            }}
            disabled={
              (editingComment ? !editingComment.content.trim() : !newComment.trim()) || 
              createCommentMutation.isPending || 
              updateCommentMutation.isPending
            }
            data-testid="button-submit-comment"
          >
            {editingComment ? (
              updateCommentMutation.isPending ? "Updating..." : "Update Comment"
            ) : (
              createCommentMutation.isPending ? "Posting..." : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </>
              )
            )}
          </Button>
          {editingComment && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setEditingComment(null)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {topLevelComments.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground" data-testid="empty-comments">
          <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No comments yet</p>
          <p className="text-xs">Be the first to comment on this task</p>
        </div>
      ) : (
        <div className="space-y-4 pt-4 border-t">
          {topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              currentUserId={currentUserId}
              onReply={setReplyingTo}
              onDelete={(id) => deleteCommentMutation.mutate(id)}
              onEdit={setEditingComment}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              onSubmitReply={handleSubmitReply}
              isSubmittingReply={createCommentMutation.isPending}
              taskId={taskId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
