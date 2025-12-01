import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { TaskMessage } from "@shared/schema";

interface OrderMessagesProps {
  orderId: number;
  isTeamMember: boolean;
  currentUserId: string;
}

interface MessageWithSender extends TaskMessage {
  sender?: {
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  };
}

export function OrderMessages({ orderId, isTeamMember, currentUserId }: OrderMessagesProps) {
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useQuery<MessageWithSender[]>({
    queryKey: ["/api/orders", orderId, "messages"],
    refetchInterval: 30000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; isInternal: boolean }) =>
      apiRequest("POST", `/api/orders/${orderId}/messages`, data),
    onSuccess: () => {
      setNewMessage("");
      setIsInternal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId, "messages"] });
      toast({
        title: "Message sent",
        description: "Your message has been delivered.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate({
      content: newMessage.trim(),
      isInternal,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getSenderName = (msg: MessageWithSender) => {
    if (msg.sender?.firstName) {
      return `${msg.sender.firstName}${msg.sender.lastName ? " " + msg.sender.lastName : ""}`;
    }
    return msg.senderRole === "content" ? "Team" : "Client";
  };

  const getRoleBadge = (role: string, isInternalMsg: boolean) => {
    if (isInternalMsg) {
      return <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20"><Lock className="h-2.5 w-2.5 mr-1" />Internal</Badge>;
    }
    switch (role) {
      case "admin":
        return <Badge variant="secondary" className="text-xs">Admin</Badge>;
      case "content":
        return <Badge variant="outline" className="text-xs">Team</Badge>;
      default:
        return <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Client</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="order-messages-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Messages
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[300px] pr-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs text-center mt-1">
                {isTeamMember
                  ? "Start a conversation with the client"
                  : "Send a message to the team"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.senderId === currentUserId;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={msg.sender?.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {msg.sender?.firstName 
                          ? getInitials(`${msg.sender.firstName} ${msg.sender.lastName || ""}`)
                          : <UserIcon className="h-3 w-3" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex-1 space-y-1 ${isOwnMessage ? "text-right" : ""}`}>
                      <div className={`flex items-center gap-2 ${isOwnMessage ? "justify-end" : ""}`}>
                        <span className="text-sm font-medium">{getSenderName(msg)}</span>
                        {getRoleBadge(msg.senderRole, msg.isInternal || false)}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt!), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div
                        className={`inline-block p-3 rounded-lg max-w-[85%] ${
                          isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : msg.isInternal
                            ? "bg-orange-500/10 border border-orange-500/20"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="space-y-3">
          <Textarea
            placeholder={isTeamMember ? "Reply to the client..." : "Send a message to the team..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[80px]"
            data-testid="message-input"
          />
          
          <div className="flex items-center justify-between">
            {isTeamMember && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal-message"
                  checked={isInternal}
                  onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                  data-testid="checkbox-internal"
                />
                <Label htmlFor="internal-message" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  Internal note (not visible to client)
                </Label>
              </div>
            )}
            
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="ml-auto"
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
