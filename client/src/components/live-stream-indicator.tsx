import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Eye,
  Loader2,
  MonitorPlay
} from 'lucide-react';
import { useLiveStreamWorker } from '@/hooks/use-live-stream';
import { useAuth } from '@/hooks/useAuth';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function LiveStreamIndicator() {
  const { user } = useAuth();
  const [hasAttemptedStart, setHasAttemptedStart] = useState(false);
  
  const {
    isConnected,
    isStreaming,
    viewerCount,
    error,
    startStreaming,
    stopStreaming,
  } = useLiveStreamWorker(user?.id || '');

  const handleToggleStream = async () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      setHasAttemptedStart(true);
      await startStreaming();
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {isStreaming ? (
        <>
          <Badge 
            variant="outline" 
            className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 gap-1.5 px-3 py-1 animate-pulse"
            data-testid="badge-streaming-active"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            <span className="font-medium">Streaming</span>
          </Badge>
          {viewerCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Eye className="h-3 w-3" />
              {viewerCount}
            </Badge>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={handleToggleStream}
            className="gap-1.5"
            data-testid="button-stop-streaming"
          >
            <VideoOff className="h-3.5 w-3.5" />
            Stop
          </Button>
        </>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleStream}
              className="gap-1.5"
              data-testid="button-start-streaming"
            >
              {hasAttemptedStart ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Video className="h-3.5 w-3.5" />
              )}
              Share Screen
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share your screen with admins for live monitoring</p>
          </TooltipContent>
        </Tooltip>
      )}
      
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
