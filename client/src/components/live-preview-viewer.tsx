import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Monitor, 
  Wifi, 
  WifiOff,
  Maximize2,
  X
} from 'lucide-react';
import { useLiveStreamViewer } from '@/hooks/use-live-stream';
import { formatDistanceToNow } from 'date-fns';

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface LivePreviewViewerProps {
  open: boolean;
  onClose: () => void;
  targetUser: UserInfo | null;
  viewerId: string;
}

function getInitials(user: UserInfo | null): string {
  if (!user) return "?";
  return [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n?.[0])
    .join("")
    .toUpperCase() || user.email[0].toUpperCase();
}

function getUserName(user: UserInfo | null): string {
  if (!user) return "Unknown User";
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.email;
}

export function LivePreviewViewer({ 
  open, 
  onClose, 
  targetUser, 
  viewerId 
}: LivePreviewViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const {
    isConnected,
    isStreamActive,
    currentFrame,
    lastUpdate,
    error,
    reconnect,
    disconnect
  } = useLiveStreamViewer(viewerId, targetUser?.id || '');

  useEffect(() => {
    if (!open) {
      disconnect();
    }
  }, [open, disconnect]);

  const handleClose = () => {
    disconnect();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className={isFullscreen ? "max-w-[95vw] w-[95vw] h-[90vh]" : "max-w-4xl"}>
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            {targetUser && (
              <>
                <Avatar>
                  <AvatarFallback>{getInitials(targetUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Live Preview - {getUserName(targetUser)}
                  </DialogTitle>
                  <DialogDescription>
                    {targetUser.email}
                  </DialogDescription>
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30">
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </Badge>
            )}
            
            {isStreamActive ? (
              <Badge className="bg-green-600 animate-pulse">
                <Eye className="h-3 w-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge variant="secondary">
                <EyeOff className="h-3 w-3 mr-1" />
                Not Streaming
              </Badge>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              data-testid="button-toggle-fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? 'h-[calc(90vh-120px)]' : 'aspect-video'}`}>
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-red-900/50">
              <WifiOff className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Connection Error</p>
              <p className="text-sm text-white/70 mb-4">{error}</p>
              <Button variant="secondary" onClick={reconnect}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            </div>
          )}

          {!error && !isStreamActive && !currentFrame && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <Monitor className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Waiting for Stream</p>
              <p className="text-sm text-white/60">
                The worker needs to start screen sharing
              </p>
            </div>
          )}

          {!error && !currentFrame && isConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <Skeleton className="h-32 w-48 bg-white/10" />
                <p className="text-white/50 mt-4 text-sm">Connecting to stream...</p>
              </div>
            </div>
          )}

          {currentFrame && (
            <img 
              src={currentFrame} 
              alt="Live screen preview"
              className="w-full h-full object-contain"
              data-testid="img-live-preview"
            />
          )}

          {lastUpdate && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-xs text-white/80">
              Updated {formatDistanceToNow(lastUpdate)} ago
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Screen updates are streamed in real-time when the worker is sharing their screen.
          </p>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
