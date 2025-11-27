import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Eye, Plus, X, Users } from "lucide-react";

interface TaskWatcher {
  id: number;
  taskId: number;
  userId: string;
  addedAt: string;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
}

interface TaskWatchersProps {
  taskId: number;
  currentUserId?: string;
}

export function TaskWatchers({ taskId, currentUserId }: TaskWatchersProps) {
  const { toast } = useToast();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: watchers, isLoading } = useQuery<TaskWatcher[]>({
    queryKey: ["/api/content-tasks", taskId, "watchers"],
    queryFn: async () => {
      const response = await fetch(`/api/content-tasks/${taskId}/watchers`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch watchers");
      return response.json();
    },
    enabled: !!taskId,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch(`/api/users`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isPopoverOpen,
  });

  const addWatcherMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/content-tasks/${taskId}/watch`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "watchers"] });
      toast({ title: "Watcher added", description: "User is now watching this task." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add watcher.", variant: "destructive" });
    },
  });

  const removeWatcherMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/content-tasks/${taskId}/watch`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "watchers"] });
      toast({ title: "Watcher removed", description: "User is no longer watching this task." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove watcher.", variant: "destructive" });
    },
  });

  const watcherUserIds = new Set(watchers?.map(w => w.userId) || []);
  const availableUsers = allUsers?.filter(u => !watcherUserIds.has(u.id)) || [];
  const filteredUsers = availableUsers.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      (u.firstName?.toLowerCase() || "").includes(query) ||
      (u.lastName?.toLowerCase() || "").includes(query)
    );
  });

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return email[0].toUpperCase();
  };

  const isCurrentUserWatching = watchers?.some(w => w.userId === currentUserId);
  const currentUserWatcher = watchers?.find(w => w.userId === currentUserId);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Eye className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Watchers:</span>
      
      {isLoading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <>
          {watchers && watchers.length > 0 ? (
            <div className="flex items-center -space-x-2">
              {watchers.slice(0, 5).map((watcher) => (
                <div key={watcher.id} className="relative group">
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={watcher.user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        watcher.user?.firstName || null,
                        watcher.user?.lastName || null,
                        watcher.user?.email || "?"
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {(watcher.userId === currentUserId) && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeWatcherMutation.mutate(watcher.userId)}
                      data-testid={`button-remove-watcher-${watcher.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {watchers.length > 5 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  +{watchers.length - 5}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}

          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7"
                data-testid="button-add-watcher"
              >
                <Plus className="w-3 h-3 mr-1" />
                {!isCurrentUserWatching ? "Watch" : "Add"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="space-y-2">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-sm"
                  data-testid="input-search-watchers"
                />
                
                {!isCurrentUserWatching && currentUserId && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm h-9"
                    onClick={() => {
                      addWatcherMutation.mutate(currentUserId);
                      setIsPopoverOpen(false);
                    }}
                    data-testid="button-watch-task"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Watch this task
                  </Button>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        className="w-full justify-start text-sm h-9"
                        onClick={() => {
                          addWatcherMutation.mutate(user.id);
                          setIsPopoverOpen(false);
                        }}
                        data-testid={`button-add-watcher-${user.id}`}
                      >
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={user.profileImageUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.firstName, user.lastName, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email}
                        </span>
                      </Button>
                    ))
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      {allUsers?.length === 0 ? "No users available" : "No matching users"}
                    </p>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
