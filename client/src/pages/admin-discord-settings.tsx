import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Link as LinkIcon,
  Unlink
} from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { Link } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface DiscordSettings {
  id: number;
  guildId: string;
  guildName: string | null;
  monitoredChannelIds: string | null;
  botConnected: boolean;
  lastBotHeartbeat: string | null;
  createdAt: string;
}

interface DiscordConnection {
  id: number;
  userId: string;
  discordUserId: string;
  discordUsername: string | null;
  linkedAt: string;
  userName?: string;
  userEmail?: string;
}

interface ActivePresence {
  id: number;
  userId: string;
  channelName: string | null;
  isScreenSharing: boolean;
  startedAt: string;
  userName?: string;
  discordUsername?: string;
}

export default function AdminDiscordSettings() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  const [guildId, setGuildId] = useState("");
  const [guildName, setGuildName] = useState("");
  const [channelIds, setChannelIds] = useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery<DiscordSettings | null>({
    queryKey: ["/api/discord/settings"],
  });

  const { data: connections, isLoading: loadingConnections } = useQuery<DiscordConnection[]>({
    queryKey: ["/api/discord/connections"],
  });

  const { data: presence } = useQuery<ActivePresence[]>({
    queryKey: ["/api/discord/presence"],
    refetchInterval: 10000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { guildId: string; guildName: string; monitoredChannelIds: string }) => {
      const response = await apiRequest("POST", "/api/discord/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discord/settings"] });
      toast({ title: "Settings saved", description: "Discord settings have been updated." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save settings", 
        variant: "destructive" 
      });
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      guildId: guildId || settings?.guildId || "",
      guildName: guildName || settings?.guildName || "",
      monitoredChannelIds: channelIds || settings?.monitoredChannelIds || "",
    });
  };

  if (authLoading || loadingSettings) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-5xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-discord-settings">
              <SiDiscord className="h-6 w-6 text-[#5865F2]" />
              Discord Integration
            </h1>
            <p className="text-muted-foreground">
              Configure Discord bot and screen sharing monitoring
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Server Configuration
              </CardTitle>
              <CardDescription>
                Configure which Discord server and channels to monitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guildId">Server (Guild) ID</Label>
                <Input
                  id="guildId"
                  placeholder="Enter Discord server ID"
                  defaultValue={settings?.guildId || ""}
                  onChange={(e) => setGuildId(e.target.value)}
                  data-testid="input-guild-id"
                />
                <p className="text-xs text-muted-foreground">
                  Right-click your server and click "Copy Server ID"
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="guildName">Server Name (for display)</Label>
                <Input
                  id="guildName"
                  placeholder="e.g., Content Team"
                  defaultValue={settings?.guildName || ""}
                  onChange={(e) => setGuildName(e.target.value)}
                  data-testid="input-guild-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channelIds">Monitored Channel IDs (optional)</Label>
                <Input
                  id="channelIds"
                  placeholder="channel_id_1, channel_id_2"
                  defaultValue={settings?.monitoredChannelIds || ""}
                  onChange={(e) => setChannelIds(e.target.value)}
                  data-testid="input-channel-ids"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to monitor all voice channels
                </p>
              </div>
              <Button 
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                className="w-full"
                data-testid="button-save-discord-settings"
              >
                {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5" />
                Bot Status
              </CardTitle>
              <CardDescription>
                Connection status and bot health
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {settings?.botConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {settings?.botConnected ? "Bot Connected" : "Bot Offline"}
                    </p>
                    {settings?.lastBotHeartbeat && (
                      <p className="text-xs text-muted-foreground">
                        Last heartbeat: {formatDistanceToNow(new Date(settings.lastBotHeartbeat), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant={settings?.botConnected ? "default" : "secondary"}>
                  {settings?.botConnected ? "Online" : "Offline"}
                </Badge>
              </div>

              <Alert>
                <SiDiscord className="h-4 w-4" />
                <AlertDescription>
                  To connect the bot, add the DISCORD_BOT_TOKEN secret and restart the server.
                  The bot needs the "Server Members Intent" and "Voice State" permissions.
                </AlertDescription>
              </Alert>

              {settings?.guildName && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Monitoring:</span>
                  <Badge variant="outline">{settings.guildName}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-500" />
              Live Screen Sharing
              {presence && presence.length > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                  {presence.length} active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Team members currently sharing their screen on Discord
            </CardDescription>
          </CardHeader>
          <CardContent>
            {presence && presence.length > 0 ? (
              <div className="space-y-2">
                {presence.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    data-testid={`presence-${p.userId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-[#5865F2] flex items-center justify-center">
                          <SiDiscord className="h-5 w-5 text-white" />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                      </div>
                      <div>
                        <p className="font-medium">{p.userName || "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.discordUsername && `@${p.discordUsername} · `}
                          {p.channelName ? `#${p.channelName}` : "Voice Channel"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                        {p.isScreenSharing ? "Screen Sharing" : "In Voice"}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(p.startedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No team members currently screen sharing</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Linked Accounts
              {connections && (
                <Badge variant="secondary">{connections.length} linked</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Team members who have linked their Discord accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingConnections ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : connections && connections.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Discord Account</TableHead>
                    <TableHead>Linked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((conn) => {
                    const isLive = presence?.some(p => p.userId === conn.userId);
                    return (
                      <TableRow key={conn.id} data-testid={`connection-${conn.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{conn.userName || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{conn.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <SiDiscord className="h-4 w-4 text-[#5865F2]" />
                            <span>@{conn.discordUsername || conn.discordUserId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(conn.linkedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {isLive ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Offline</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No Discord accounts linked yet</p>
                <p className="text-sm">Team members can link their accounts from their profile</p>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
