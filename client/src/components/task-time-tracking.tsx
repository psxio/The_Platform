import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Plus, Play, Pause, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: number;
  taskId: number;
  userId: string;
  minutes: number;
  description: string | null;
  date: string;
  createdAt: string;
}

interface TaskTimeTrackingProps {
  taskId: number;
  currentUserId?: string;
}

export function TaskTimeTracking({ taskId, currentUserId }: TaskTimeTrackingProps) {
  const { toast } = useToast();
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [description, setDescription] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStart, setTrackingStart] = useState<Date | null>(null);

  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/content-tasks", taskId, "time-entries"],
    queryFn: async () => {
      const response = await fetch(`/api/content-tasks/${taskId}/time-entries`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch time entries");
      return response.json();
    },
    enabled: !!taskId,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: { minutes: number; description: string }) => {
      return apiRequest("POST", `/api/content-tasks/${taskId}/time-entries`, {
        ...data,
        date: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/me"] });
      setHours("");
      setMinutes("");
      setDescription("");
      setIsAddingEntry(false);
      toast({ title: "Time logged", description: "Your time has been recorded." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log time.", variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/me"] });
      toast({ title: "Entry deleted", description: "Time entry has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete entry.", variant: "destructive" });
    },
  });

  const handleAddEntry = () => {
    const totalMinutes = (parseInt(hours || "0") * 60) + parseInt(minutes || "0");
    if (totalMinutes <= 0) {
      toast({ title: "Invalid time", description: "Please enter a valid duration.", variant: "destructive" });
      return;
    }
    createEntryMutation.mutate({ minutes: totalMinutes, description });
  };

  const startTracking = () => {
    setIsTracking(true);
    setTrackingStart(new Date());
    toast({ title: "Timer started", description: "Tracking your time on this task." });
  };

  const stopTracking = () => {
    if (!trackingStart) return;
    const elapsed = Math.floor((Date.now() - trackingStart.getTime()) / 60000);
    if (elapsed > 0) {
      createEntryMutation.mutate({ 
        minutes: elapsed, 
        description: description || "Tracked time" 
      });
    }
    setIsTracking(false);
    setTrackingStart(null);
    setDescription("");
  };

  const totalMinutes = timeEntries?.reduce((sum, e) => sum + e.minutes, 0) || 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Time Tracking</h3>
          {totalMinutes > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-total-time">
              {totalHours > 0 ? `${totalHours}h ` : ""}{remainingMins}m total
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isTracking ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={stopTracking}
              data-testid="button-stop-timer"
            >
              <Pause className="w-4 h-4 mr-1" />
              Stop Timer
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={startTracking}
                data-testid="button-start-timer"
              >
                <Play className="w-4 h-4 mr-1" />
                Start Timer
              </Button>
              {!isAddingEntry && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsAddingEntry(true)}
                  data-testid="button-log-time"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Log Time
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isAddingEntry && (
        <div className="p-4 border rounded-md space-y-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-16 text-center"
                min="0"
                data-testid="input-time-hours"
              />
              <span className="text-sm text-muted-foreground">h</span>
            </div>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="0"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-16 text-center"
                min="0"
                max="59"
                data-testid="input-time-minutes"
              />
              <span className="text-sm text-muted-foreground">m</span>
            </div>
          </div>
          <Textarea
            placeholder="What did you work on? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none"
            rows={2}
            data-testid="input-time-description"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingEntry(false);
                setHours("");
                setMinutes("");
                setDescription("");
              }}
              data-testid="button-cancel-time"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddEntry}
              disabled={createEntryMutation.isPending}
              data-testid="button-save-time"
            >
              {createEntryMutation.isPending ? "Saving..." : "Log Time"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : timeEntries && timeEntries.length > 0 ? (
        <div className="space-y-2">
          {timeEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 border rounded-md bg-card"
              data-testid={`time-entry-${entry.id}`}
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  {formatDuration(entry.minutes)}
                </Badge>
                <div className="text-sm">
                  {entry.description && (
                    <p className="text-foreground">{entry.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {entry.userId === currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteEntryMutation.mutate(entry.id)}
                  data-testid={`button-delete-time-${entry.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-muted-foreground" data-testid="empty-time-entries">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No time logged yet</p>
          <p className="text-xs">Track your work hours on this task</p>
        </div>
      )}
    </div>
  );
}
