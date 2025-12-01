import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  MessageCircle, 
  UserPlus, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getNotificationIcon(type: string) {
  switch (type) {
    case "comment":
      return <MessageCircle className="w-4 h-4" />;
    case "assignment":
      return <UserPlus className="w-4 h-4" />;
    case "due_soon":
      return <Calendar className="w-4 h-4" />;
    case "overdue":
      return <AlertTriangle className="w-4 h-4" />;
    case "completed":
      return <CheckCircle2 className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case "comment":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "assignment":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "due_soon":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "overdue":
      return "bg-destructive/10 text-destructive";
    case "completed":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <div 
      className={cn(
        "p-3 flex gap-3 hover-elevate cursor-pointer rounded-md",
        !notification.read && "bg-muted/30"
      )}
      onClick={() => !notification.read && onMarkRead(notification.id)}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        getNotificationColor(notification.type)
      )}>
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm",
            !notification.read && "font-medium"
          )}>
            {notification.title}
          </p>
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
          )}
        </div>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    },
  });

  const count = unreadCount?.count || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="button-notification-bell"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
              data-testid="badge-unread-count"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        data-testid="popover-notifications"
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {count > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="p-2 space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs">We'll notify you when something happens</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
