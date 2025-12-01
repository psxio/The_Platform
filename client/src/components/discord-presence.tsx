import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SiDiscord } from "react-icons/si";
import { formatDistanceToNow } from "date-fns";

interface DiscordPresenceSession {
  id: number;
  userId: string;
  discordUserId: string;
  guildId: string;
  channelId: string;
  channelName: string | null;
  isScreenSharing: boolean;
  isStreaming: boolean;
  startedAt: string;
  endedAt: string | null;
  lastHeartbeatAt: string;
  userName?: string;
  userEmail?: string;
  discordUsername?: string;
}

interface DiscordConnection {
  id: number;
  userId: string;
  discordUserId: string;
  discordUsername: string | null;
  linkedAt: string;
}

export function DiscordPresenceIndicator({ userId, email }: { userId?: string; email?: string }) {
  const { data: sessions } = useQuery<DiscordPresenceSession[]>({
    queryKey: ["/api/discord/presence"],
    refetchInterval: 10000,
  });

  const userSession = sessions?.find(s => 
    s.isScreenSharing && (
      (userId && s.userId === userId) || 
      (email && s.userEmail === email)
    )
  );

  if (!userSession) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1">
          <div className="relative">
            <SiDiscord className="h-4 w-4 text-[#5865F2]" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-background animate-pulse" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <div className="font-medium flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Screen Sharing
          </div>
          {userSession.channelName && (
            <div className="text-muted-foreground">
              in #{userSession.channelName}
            </div>
          )}
          <div className="text-muted-foreground text-xs">
            Started {formatDistanceToNow(new Date(userSession.startedAt), { addSuffix: true })}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function DiscordPresenceBadge({ userId, showLabel = true }: { userId: string; showLabel?: boolean }) {
  const { data: sessions } = useQuery<DiscordPresenceSession[]>({
    queryKey: ["/api/discord/presence"],
    refetchInterval: 10000,
  });

  const userSession = sessions?.find(s => s.isScreenSharing && s.userId === userId);

  if (!userSession) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 gap-1"
        >
          <SiDiscord className="h-3 w-3" />
          {showLabel && <span>Live</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <div className="font-medium flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Screen Sharing
          </div>
          {userSession.channelName && (
            <div className="text-muted-foreground">
              in #{userSession.channelName}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function DiscordLiveList() {
  const { data: sessions, isLoading } = useQuery<DiscordPresenceSession[]>({
    queryKey: ["/api/discord/presence"],
    refetchInterval: 10000,
  });

  const screenSharingSessions = sessions?.filter(s => s.isScreenSharing) || [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <SiDiscord className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (screenSharingSessions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <SiDiscord className="h-4 w-4" />
        <span>No one is screen sharing</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {screenSharingSessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between p-3 rounded-lg border bg-card"
          data-testid={`discord-live-${session.userId}`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-[#5865F2] flex items-center justify-center">
                <SiDiscord className="h-4 w-4 text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
            </div>
            <div>
              <div className="font-medium">{session.userName || "Unknown User"}</div>
              <div className="text-sm text-muted-foreground">
                {session.discordUsername && `@${session.discordUsername} · `}
                {session.channelName ? `#${session.channelName}` : "Voice Channel"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session.isScreenSharing && (
              <Badge className="bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400">
                Screen Sharing
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DiscordLinkStatus() {
  const { data: connection, isLoading } = useQuery<DiscordConnection | null>({
    queryKey: ["/api/discord/connection"],
  });

  if (isLoading) {
    return null;
  }

  if (!connection) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <SiDiscord className="h-4 w-4" />
        <span>Discord not linked</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <SiDiscord className="h-4 w-4 text-[#5865F2]" />
      <span>@{connection.discordUsername || connection.discordUserId}</span>
    </div>
  );
}
