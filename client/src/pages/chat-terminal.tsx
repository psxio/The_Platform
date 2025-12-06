import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";
import {
  MessageSquare,
  Send,
  Pin,
  PinOff,
  Settings,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Mail,
  Calendar,
  Clock,
  Check,
  CheckCheck,
  AlertCircle,
  Wifi,
  WifiOff,
  ExternalLink,
  Paperclip,
  MoreVertical,
  Archive,
  BellOff,
  Trash2,
  X,
  Key,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SiDiscord, SiTelegram } from "react-icons/si";
import type { 
  ChatPlatform, 
  ChatContact, 
  ChatConversation, 
  ChatMessage,
  ChatPlatformType,
} from "@shared/schema";

const PLATFORM_COLORS: Record<ChatPlatformType, string> = {
  discord: "bg-[#5865F2]",
  telegram: "bg-[#0088cc]",
  farcaster: "bg-gradient-to-r from-purple-500 to-purple-700",
};

const PLATFORM_ICONS: Record<ChatPlatformType, typeof SiDiscord> = {
  discord: SiDiscord,
  telegram: SiTelegram,
  farcaster: SiTelegram,
};

function PlatformIcon({ platform, className }: { platform: ChatPlatformType; className?: string }) {
  const Icon = PLATFORM_ICONS[platform];
  return <Icon className={className} />;
}

function PlatformBadge({ platform }: { platform: ChatPlatformType }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${PLATFORM_COLORS[platform]}`}>
      <PlatformIcon platform={platform} className="w-3 h-3 text-white" />
    </div>
  );
}

function formatMessageTime(dateValue: string | Date | null): string {
  if (!dateValue) return "";
  try {
    const date = typeof dateValue === "string" ? parseISO(dateValue) : dateValue;
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "MMM d");
  } catch {
    return "";
  }
}

function groupConversationsByDate(conversations: ConversationWithDetails[]): Record<string, ConversationWithDetails[]> {
  const groups: Record<string, ConversationWithDetails[]> = {
    "Pinned": [],
    "Today": [],
    "Yesterday": [],
    "This Week": [],
    "Earlier": [],
  };
  
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  conversations.forEach(conv => {
    if (conv.isPinned) {
      groups["Pinned"].push(conv);
    } else {
      const lastMsgRaw = conv.lastMessageAt;
      const lastMsg = lastMsgRaw 
        ? (typeof lastMsgRaw === "string" ? parseISO(lastMsgRaw) : lastMsgRaw)
        : new Date(0);
      if (isToday(lastMsg)) {
        groups["Today"].push(conv);
      } else if (isYesterday(lastMsg)) {
        groups["Yesterday"].push(conv);
      } else if (lastMsg > weekAgo) {
        groups["This Week"].push(conv);
      } else {
        groups["Earlier"].push(conv);
      }
    }
  });
  
  return groups;
}

type ConversationWithDetails = ChatConversation & {
  contact: ChatContact;
  platform: ChatPlatform;
  isPinned: boolean;
};

type MessageWithDetails = ChatMessage & {
  isOwn: boolean;
};

function SetupDialog({ platform, onClose }: { platform: ChatPlatformType; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [label, setLabel] = useState("");
  const [secretConfigured, setSecretConfigured] = useState(false);
  const { toast } = useToast();

  const setupMutation = useMutation({
    mutationFn: async (data: { platform: ChatPlatformType; label: string; settings: Record<string, any> }) => {
      return apiRequest("POST", "/api/chat/platforms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/platforms"] });
      toast({ title: "Platform registered", description: `${platform} has been registered. Configure the environment secret to complete setup.` });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const getSecretName = () => {
    switch (platform) {
      case "discord": return "DISCORD_BOT_TOKEN";
      case "telegram": return "TELEGRAM_BOT_TOKEN";
      case "farcaster": return "NEYNAR_API_KEY";
      default: return "API_KEY";
    }
  };

  const handleSubmit = () => {
    if (!label) {
      toast({ title: "Missing name", description: "Please provide a name for this connection.", variant: "destructive" });
      return;
    }
    if (!secretConfigured) {
      toast({ title: "Secret not configured", description: "Please confirm that you've set the environment secret.", variant: "destructive" });
      return;
    }
    setupMutation.mutate({
      platform,
      label,
      settings: { secretName: getSecretName() },
    });
  };

  const renderDiscordSetup = () => (
    <div className="space-y-4">
      {step === 1 && (
        <>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Step 1: Create Discord Bot</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Discord Developer Portal</a></li>
              <li>Click "New Application" and give it a name</li>
              <li>Go to the "Bot" section in the sidebar</li>
              <li>Click "Reset Token" and copy your bot token</li>
              <li>Enable "Message Content Intent" under Privileged Gateway Intents</li>
            </ol>
          </div>
          <Button onClick={() => setStep(2)} className="w-full">I've created my bot</Button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-500" />
              Step 2: Set Environment Secret
            </h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>For security, bot tokens are stored as environment secrets, not in the database.</p>
              <div className="p-2 bg-background rounded font-mono text-xs">
                DISCORD_BOT_TOKEN=your_discord_bot_token
              </div>
              <p>Add this secret in the Replit Secrets tab, then continue below.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="label">Connection Name</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Main Discord Bot"
                data-testid="input-discord-label"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="secret-configured" 
                checked={secretConfigured}
                onCheckedChange={(checked) => setSecretConfigured(checked === true)}
                data-testid="checkbox-secret-configured"
              />
              <Label htmlFor="secret-configured" className="text-sm cursor-pointer">
                I've added DISCORD_BOT_TOKEN to Secrets
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={setupMutation.isPending || !secretConfigured}
              className="flex-1"
              data-testid="button-connect-discord"
            >
              {setupMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Register Discord
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderTelegramSetup = () => (
    <div className="space-y-4">
      {step === 1 && (
        <>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Step 1: Create Telegram Bot</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Open Telegram and search for <span className="font-mono">@BotFather</span></li>
              <li>Send <span className="font-mono">/newbot</span> to create a new bot</li>
              <li>Follow the prompts to name your bot</li>
              <li>Copy the bot token BotFather gives you</li>
            </ol>
          </div>
          <Button onClick={() => setStep(2)} className="w-full">I've created my bot</Button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-500" />
              Step 2: Set Environment Secret
            </h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>For security, bot tokens are stored as environment secrets, not in the database.</p>
              <div className="p-2 bg-background rounded font-mono text-xs">
                TELEGRAM_BOT_TOKEN=your_telegram_bot_token
              </div>
              <p>Add this secret in the Replit Secrets tab, then continue below.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="label">Connection Name</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Main Telegram Bot"
                data-testid="input-telegram-label"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="secret-configured" 
                checked={secretConfigured}
                onCheckedChange={(checked) => setSecretConfigured(checked === true)}
                data-testid="checkbox-secret-configured"
              />
              <Label htmlFor="secret-configured" className="text-sm cursor-pointer">
                I've added TELEGRAM_BOT_TOKEN to Secrets
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={setupMutation.isPending || !secretConfigured}
              className="flex-1"
              data-testid="button-connect-telegram"
            >
              {setupMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Register Telegram
            </Button>
          </div>
        </>
      )}
    </div>
  );

  const renderFarcasterSetup = () => (
    <div className="space-y-4">
      {step === 1 && (
        <>
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Step 1: Get Neynar API Key</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to <a href="https://neynar.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Neynar.com</a></li>
              <li>Create an account or log in</li>
              <li>Generate an API key from the dashboard</li>
              <li>Copy your API key</li>
            </ol>
          </div>
          <Button onClick={() => setStep(2)} className="w-full">I have my API key</Button>
        </>
      )}
      {step === 2 && (
        <>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-500" />
              Step 2: Set Environment Secret
            </h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>For security, API keys are stored as environment secrets, not in the database.</p>
              <div className="p-2 bg-background rounded font-mono text-xs">
                NEYNAR_API_KEY=your_neynar_api_key
              </div>
              <p>Add this secret in the Replit Secrets tab, then continue below.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="label">Connection Name</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Farcaster DMs"
                data-testid="input-farcaster-label"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="secret-configured" 
                checked={secretConfigured}
                onCheckedChange={(checked) => setSecretConfigured(checked === true)}
                data-testid="checkbox-secret-configured"
              />
              <Label htmlFor="secret-configured" className="text-sm cursor-pointer">
                I've added NEYNAR_API_KEY to Secrets
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button 
              onClick={handleSubmit} 
              disabled={setupMutation.isPending || !secretConfigured}
              className="flex-1"
              data-testid="button-connect-farcaster"
            >
              {setupMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Register Farcaster
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <PlatformBadge platform={platform} />
          Connect {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </DialogTitle>
        <DialogDescription>
          Follow the steps to connect your {platform} account.
        </DialogDescription>
      </DialogHeader>
      {platform === "discord" && renderDiscordSetup()}
      {platform === "telegram" && renderTelegramSetup()}
      {platform === "farcaster" && renderFarcasterSetup()}
    </DialogContent>
  );
}

function ConversationListItem({ 
  conversation, 
  isSelected, 
  onClick,
  onPin,
  onUnpin,
}: { 
  conversation: ConversationWithDetails;
  isSelected: boolean;
  onClick: () => void;
  onPin: () => void;
  onUnpin: () => void;
}) {
  const platform = conversation.platform?.platform as ChatPlatformType;
  
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected ? "bg-accent" : "hover-elevate"
      }`}
      onClick={onClick}
      data-testid={`conversation-${conversation.id}`}
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.contact?.avatarUrl || undefined} />
          <AvatarFallback>
            {(conversation.contact?.displayName || conversation.contact?.username || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1">
          <PlatformBadge platform={platform} />
        </div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">
            {conversation.contact?.displayName || conversation.contact?.username || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatMessageTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground truncate flex-1">
            {conversation.lastMessagePreview || "No messages yet"}
          </p>
          {(conversation.unreadCount ?? 0) > 0 && (
            <Badge className="h-5 min-w-[20px] px-1.5 text-xs">
              {conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              conversation.isPinned ? onUnpin() : onPin();
            }}
          >
            {conversation.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {conversation.isPinned ? "Unpin" : "Pin to top"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function MessageBubble({ message, showAvatar = false }: { message: MessageWithDetails; showAvatar?: boolean }) {
  const isOwn = message.direction === "outbound";
  
  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
      {showAvatar && isOwn && <div className="w-8" />}
      {!showAvatar && <div className="w-8" />}
      
      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
        <div className={`rounded-2xl px-4 py-2 ${
          isOwn 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-muted rounded-bl-md"
        }`}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
          <span className="text-xs text-muted-foreground">
            {message.sentAt ? format(typeof message.sentAt === "string" ? parseISO(message.sentAt) : message.sentAt, "h:mm a") : ""}
          </span>
          {isOwn && (
            <span className="text-xs text-muted-foreground">
              {message.status === "read" ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : message.status === "delivered" ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No conversations yet</h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        Connect your Discord, Telegram, or Farcaster accounts to start seeing your DMs here.
      </p>
    </div>
  );
}

function NoPlatformsState({ onSetup }: { onSetup: (platform: ChatPlatformType) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Connect Your Platforms</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Set up your messaging platforms to unify all your DMs in one place.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => onSetup("discord")} className="gap-2" data-testid="button-setup-discord">
          <SiDiscord className="h-4 w-4" />
          Connect Discord
        </Button>
        <Button onClick={() => onSetup("telegram")} variant="outline" className="gap-2" data-testid="button-setup-telegram">
          <SiTelegram className="h-4 w-4" />
          Connect Telegram
        </Button>
        <Button onClick={() => onSetup("farcaster")} variant="outline" className="gap-2" data-testid="button-setup-farcaster">
          <PlatformIcon platform="farcaster" className="h-4 w-4" />
          Connect Farcaster
        </Button>
      </div>
    </div>
  );
}

export default function ChatTerminal() {
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [activeFilter, setActiveFilter] = useState<ChatPlatformType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [setupPlatform, setSetupPlatform] = useState<ChatPlatformType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: platforms = [], isLoading: platformsLoading } = useQuery<ChatPlatform[]>({
    queryKey: ["/api/chat/platforms"],
  });

  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<ConversationWithDetails[]>({
    queryKey: ["/api/chat/conversations"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages", selectedConversation?.id],
    enabled: !!selectedConversation?.id,
  });

  const { data: digestPrefs } = useQuery({
    queryKey: ["/api/chat/digest-preferences"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: number; content: string }) => {
      return apiRequest("POST", "/api/chat/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      setMessageInput("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const pinMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest("POST", "/api/chat/pinned-contacts", { contactId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      toast({ title: "Contact pinned" });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: async (contactId: number) => {
      return apiRequest("DELETE", `/api/chat/pinned-contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      toast({ title: "Contact unpinned" });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter(conv => {
    if (activeFilter !== "all" && conv.platform?.platform !== activeFilter) {
      return false;
    }
    if (searchQuery) {
      const name = conv.contact?.displayName || conv.contact?.username || "";
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const groupedConversations = groupConversationsByDate(filteredConversations);

  const connectedPlatforms = platforms.filter(p => p.connectionStatus === "connected");
  const platformCounts = platforms.reduce((acc, p) => {
    acc[p.platform as ChatPlatformType] = (acc[p.platform as ChatPlatformType] || 0) + 1;
    return acc;
  }, {} as Record<ChatPlatformType, number>);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      content: messageInput.trim(),
    });
  };

  if (platformsLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl h-[calc(100vh-120px)]">
      <div className="flex flex-col h-full gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="heading-chat-terminal">
              <MessageSquare className="h-6 w-6" />
              Chat Terminal
            </h1>
            <p className="text-muted-foreground text-sm">
              Unified inbox for Discord, Telegram & Farcaster DMs
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {connectedPlatforms.length > 0 && (
              <div className="flex items-center gap-1">
                {connectedPlatforms.map(p => (
                  <Tooltip key={p.id}>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10">
                        <Wifi className="h-3 w-3 text-green-500" />
                        <PlatformIcon platform={p.platform as ChatPlatformType} className="h-4 w-4" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{p.label} - Connected</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-daily-digest">
                  <Mail className="h-4 w-4 mr-2" />
                  Daily Digest
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Daily Digest Settings</DialogTitle>
                  <DialogDescription>
                    Configure your daily summary of chat activity.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Daily Digest</Label>
                      <p className="text-xs text-muted-foreground">Get a summary of activity each morning</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-digest-enabled" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Notification</Label>
                      <p className="text-xs text-muted-foreground">Receive digest via email</p>
                    </div>
                    <Switch defaultChecked data-testid="switch-digest-email" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Only for Pinned Contacts</Label>
                      <p className="text-xs text-muted-foreground">Only notify if pinned contacts have unreads</p>
                    </div>
                    <Switch data-testid="switch-digest-pinned-only" />
                  </div>
                  <div>
                    <Label>Delivery Time</Label>
                    <Input type="time" defaultValue="08:00" className="mt-1" data-testid="input-digest-time" />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-platform">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Platform
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Platform</DialogTitle>
                  <DialogDescription>
                    Choose a platform to connect.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto py-4"
                    onClick={() => setSetupPlatform("discord")}
                    data-testid="button-add-discord"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PLATFORM_COLORS.discord}`}>
                        <SiDiscord className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Discord</p>
                        <p className="text-xs text-muted-foreground">Connect your Discord bot for DMs</p>
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto py-4"
                    onClick={() => setSetupPlatform("telegram")}
                    data-testid="button-add-telegram"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PLATFORM_COLORS.telegram}`}>
                        <SiTelegram className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Telegram</p>
                        <p className="text-xs text-muted-foreground">Connect your Telegram bot</p>
                      </div>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start h-auto py-4"
                    onClick={() => setSetupPlatform("farcaster")}
                    data-testid="button-add-farcaster"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${PLATFORM_COLORS.farcaster}`}>
                        <PlatformIcon platform="farcaster" className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Farcaster</p>
                        <p className="text-xs text-muted-foreground">Connect via Neynar API</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {platforms.length === 0 ? (
          <Card className="flex-1">
            <CardContent className="h-full p-0">
              <NoPlatformsState onSetup={setSetupPlatform} />
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 overflow-hidden">
            <div className="flex h-full">
              <div className="w-80 border-r flex flex-col">
                <div className="p-3 border-b space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search conversations..." 
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      data-testid="input-search-conversations"
                    />
                  </div>
                  
                  <div className="flex gap-1 flex-wrap">
                    <Button
                      variant={activeFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveFilter("all")}
                    >
                      All
                      {totalUnread > 0 && (
                        <Badge className="ml-1 h-4 px-1">{totalUnread}</Badge>
                      )}
                    </Button>
                    {(["discord", "telegram", "farcaster"] as ChatPlatformType[]).map(platform => {
                      const platformConvs = conversations.filter(c => c.platform?.platform === platform);
                      const platformUnread = platformConvs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                      const hasConnection = platformCounts[platform] > 0;
                      
                      if (!hasConnection) return null;
                      
                      return (
                        <Button
                          key={platform}
                          variant={activeFilter === platform ? "default" : "ghost"}
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setActiveFilter(platform)}
                        >
                          <PlatformIcon platform={platform} className="h-3 w-3" />
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          {platformUnread > 0 && (
                            <Badge variant="secondary" className="ml-1 h-4 px-1">{platformUnread}</Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {conversationsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <EmptyState />
                    ) : (
                      Object.entries(groupedConversations).map(([group, convs]) => {
                        if (convs.length === 0) return null;
                        return (
                          <div key={group} className="mb-4">
                            <div className="flex items-center gap-2 px-2 mb-2">
                              {group === "Pinned" && <Pin className="h-3 w-3 text-primary" />}
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {group}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {convs.map(conv => (
                                <ConversationListItem
                                  key={conv.id}
                                  conversation={conv}
                                  isSelected={selectedConversation?.id === conv.id}
                                  onClick={() => setSelectedConversation(conv)}
                                  onPin={() => pinMutation.mutate(conv.contactId)}
                                  onUnpin={() => unpinMutation.mutate(conv.contactId)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              <div className="flex-1 flex flex-col">
                {selectedConversation ? (
                  <>
                    <div className="p-4 border-b flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={selectedConversation.contact?.avatarUrl || undefined} />
                            <AvatarFallback>
                              {(selectedConversation.contact?.displayName || "?").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1">
                            <PlatformBadge platform={selectedConversation.platform?.platform as ChatPlatformType} />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {selectedConversation.contact?.displayName || selectedConversation.contact?.username}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            @{selectedConversation.contact?.username} on {selectedConversation.platform?.platform}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              {selectedConversation.isPinned ? (
                                <PinOff className="h-4 w-4" />
                              ) : (
                                <Pin className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {selectedConversation.isPinned ? "Unpin" : "Pin"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Open in {selectedConversation.platform?.platform}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messagesLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                              <Skeleton key={i} className="h-12 w-3/4" />
                            ))}
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No messages yet</p>
                          </div>
                        ) : (
                          messages.map((msg, i) => (
                            <MessageBubble 
                              key={msg.id} 
                              message={{ ...msg, isOwn: msg.direction === "outbound" }} 
                              showAvatar={i === 0 || messages[i - 1]?.direction !== msg.direction}
                            />
                          ))
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                    
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Type a message..."
                          className="min-h-[44px] max-h-32 resize-none"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          data-testid="input-message"
                        />
                        <div className="flex flex-col gap-1">
                          <Button 
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || sendMessageMutation.isPending}
                            data-testid="button-send-message"
                          >
                            {sendMessageMutation.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="font-medium text-lg mb-1">Select a conversation</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a conversation from the list to start messaging
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
      
      {setupPlatform && (
        <Dialog open={!!setupPlatform} onOpenChange={() => setSetupPlatform(null)}>
          <SetupDialog platform={setupPlatform} onClose={() => setSetupPlatform(null)} />
        </Dialog>
      )}
    </div>
  );
}