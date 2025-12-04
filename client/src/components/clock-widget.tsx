import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkSession } from "@shared/schema";

async function postRequest(url: string, data?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

function formatDuration(startTime: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(startTime).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSessionDuration(totalMinutes: number | null): string {
  if (!totalMinutes) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function ClockWidget() {
  const { toast } = useToast();
  const [clockOutDialogOpen, setClockOutDialogOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");

  const { data: activeSession, isLoading } = useQuery<WorkSession | null>({
    queryKey: ["/api/work-sessions/active"],
    refetchInterval: 30000,
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      return await postRequest("/api/work-sessions/clock-in");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions"] });
      toast({
        title: "Clocked In",
        description: "Your work session has started.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clock in. Please try again.",
        variant: "destructive",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async ({ sessionId, summary }: { sessionId: number; summary: string }) => {
      return await postRequest(`/api/work-sessions/${sessionId}/clock-out`, { summary });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-sessions"] });
      setClockOutDialogOpen(false);
      setSummary("");
      toast({
        title: "Clocked Out",
        description: "Your work session has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clock out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateElapsedTime = useCallback(() => {
    if (activeSession?.clockInTime) {
      setElapsedTime(formatDuration(new Date(activeSession.clockInTime)));
    }
  }, [activeSession?.clockInTime]);

  useEffect(() => {
    if (activeSession?.status === "active") {
      updateElapsedTime();
      const interval = setInterval(updateElapsedTime, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession, updateElapsedTime]);

  const handleClockIn = () => {
    clockInMutation.mutate();
  };

  const handleClockOutClick = () => {
    setClockOutDialogOpen(true);
  };

  const handleClockOutSubmit = () => {
    if (!activeSession?.id) return;
    if (!summary.trim()) {
      toast({
        title: "Summary Required",
        description: "Please describe what you worked on before clocking out.",
        variant: "destructive",
      });
      return;
    }
    clockOutMutation.mutate({ sessionId: activeSession.id, summary: summary.trim() });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const isClockedIn = activeSession?.status === "active";

  return (
    <>
      <div className="flex items-center gap-2">
        {isClockedIn ? (
          <>
            <Badge 
              variant="outline" 
              className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 gap-1.5 px-3 py-1"
              data-testid="badge-clock-status"
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono font-medium">{elapsedTime}</span>
            </Badge>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleClockOutClick}
              disabled={clockOutMutation.isPending}
              className="gap-1.5"
              data-testid="button-clock-out"
            >
              {clockOutMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              Clock Out
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="default"
            onClick={handleClockIn}
            disabled={clockInMutation.isPending}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            data-testid="button-clock-in"
          >
            {clockInMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Clock In
          </Button>
        )}
      </div>

      <Dialog open={clockOutDialogOpen} onOpenChange={setClockOutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Clock Out
            </DialogTitle>
            <DialogDescription>
              Please describe what you worked on during this session.
              {activeSession?.clockInTime && (
                <span className="block mt-1 text-foreground font-medium">
                  Session duration: {elapsedTime}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="work-summary">Work Summary</Label>
              <Textarea
                id="work-summary"
                placeholder="Describe the tasks you completed, progress made, or any blockers..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="min-h-[120px] resize-none"
                data-testid="textarea-work-summary"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setClockOutDialogOpen(false)}
              disabled={clockOutMutation.isPending}
              data-testid="button-cancel-clock-out"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClockOutSubmit}
              disabled={clockOutMutation.isPending || !summary.trim()}
              className="gap-1.5"
              data-testid="button-submit-clock-out"
            >
              {clockOutMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4" />
                  Clock Out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WorkSessionHistory() {
  const { data: sessions = [], isLoading } = useQuery<WorkSession[]>({
    queryKey: ["/api/work-sessions"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No work sessions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-start gap-3 p-3 rounded-lg border bg-card"
          data-testid={`work-session-${session.id}`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {new Date(session.clockInTime).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <Badge variant="secondary" className="text-xs">
                {formatSessionDuration(session.totalMinutes)}
              </Badge>
              {session.status === "active" && (
                <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 text-xs">
                  Active
                </Badge>
              )}
            </div>
            {session.summary && (
              <p className="text-sm mt-1 text-foreground/80 line-clamp-2">
                {session.summary}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
