import { useQuery } from "@tanstack/react-query";
import { Camera, Clock, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface MonitoringSession {
  id: number;
  userId: string;
  status: string;
  startedAt: string;
  screenshotCount: number;
}

interface MonitoringStatusBannerProps {
  onStopSession: (sessionId: number) => void;
  isStoppingSession?: boolean;
}

export function MonitoringStatusBanner({ onStopSession, isStoppingSession }: MonitoringStatusBannerProps) {
  const { data: sessionData } = useQuery<{ session: MonitoringSession | null }>({
    queryKey: ["/api/monitoring/session/active"],
    refetchInterval: 30000,
  });

  const session = sessionData?.session;

  if (!session) return null;

  const startTime = new Date(session.startedAt);
  const duration = formatDistanceToNow(startTime, { addSuffix: false });

  return (
    <div 
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-3"
      data-testid="banner-monitoring-active"
    >
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-medium">Monitoring Active</span>
      </div>
      
      <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
        <Clock className="h-3 w-3 mr-1" />
        {duration}
      </Badge>
      
      <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
        {session.screenshotCount} captures
      </Badge>
      
      <Button 
        size="sm" 
        variant="secondary"
        className="h-7 px-2"
        onClick={() => onStopSession(session.id)}
        disabled={isStoppingSession}
        data-testid="button-stop-monitoring"
      >
        <StopCircle className="h-4 w-4 mr-1" />
        Stop
      </Button>
    </div>
  );
}
