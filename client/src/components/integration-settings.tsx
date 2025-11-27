import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Send, CheckCircle2, XCircle } from "lucide-react";
import { SiTelegram, SiDiscord } from "react-icons/si";

interface IntegrationSettings {
  telegramBotToken: string | null;
  telegramChatId: string | null;
  telegramEnabled: boolean;
  discordWebhookUrl: string | null;
  discordEnabled: boolean;
  notifyOnTaskCreate: boolean;
  notifyOnTaskComplete: boolean;
  notifyOnTaskAssign: boolean;
  notifyOnComment: boolean;
  notifyOnDueSoon: boolean;
  notifyOnOverdue: boolean;
}

export function IntegrationSettings() {
  const { toast } = useToast();
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [telegramTestStatus, setTelegramTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [discordTestStatus, setDiscordTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const { data: settings, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integration-settings"],
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<IntegrationSettings>) => 
      apiRequest("PUT", "/api/integration-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integration-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const testTelegramMutation = useMutation({
    mutationFn: async (data: { botToken: string; chatId: string }) => {
      const res = await apiRequest("POST", "/api/integration-settings/test-telegram", data);
      return res.json() as Promise<{ success: boolean; error?: string }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        setTelegramTestStatus("success");
        toast({ title: "Telegram connected! Check your channel for a test message." });
      } else {
        setTelegramTestStatus("error");
        toast({ title: "Telegram test failed", description: data.error, variant: "destructive" });
      }
    },
    onError: () => {
      setTelegramTestStatus("error");
      toast({ title: "Failed to test Telegram", variant: "destructive" });
    },
  });

  const testDiscordMutation = useMutation({
    mutationFn: async (data: { webhookUrl: string }) => {
      const res = await apiRequest("POST", "/api/integration-settings/test-discord", data);
      return res.json() as Promise<{ success: boolean; error?: string }>;
    },
    onSuccess: (data) => {
      if (data.success) {
        setDiscordTestStatus("success");
        toast({ title: "Discord connected! Check your channel for a test message." });
      } else {
        setDiscordTestStatus("error");
        toast({ title: "Discord test failed", description: data.error, variant: "destructive" });
      }
    },
    onError: () => {
      setDiscordTestStatus("error");
      toast({ title: "Failed to test Discord", variant: "destructive" });
    },
  });

  const handleTestTelegram = () => {
    if (!telegramBotToken || !telegramChatId) {
      toast({ title: "Please enter both Bot Token and Chat ID", variant: "destructive" });
      return;
    }
    setTelegramTestStatus("testing");
    testTelegramMutation.mutate({ botToken: telegramBotToken, chatId: telegramChatId });
  };

  const handleTestDiscord = () => {
    if (!discordWebhookUrl) {
      toast({ title: "Please enter a webhook URL", variant: "destructive" });
      return;
    }
    setDiscordTestStatus("testing");
    testDiscordMutation.mutate({ webhookUrl: discordWebhookUrl });
  };

  const handleSaveTelegram = () => {
    updateMutation.mutate({
      telegramBotToken,
      telegramChatId,
      telegramEnabled: true,
    });
  };

  const handleSaveDiscord = () => {
    updateMutation.mutate({
      discordWebhookUrl,
      discordEnabled: true,
    });
  };

  const handleToggleNotification = (key: keyof IntegrationSettings, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SiTelegram className="h-5 w-5 text-[#0088cc]" />
            Telegram Integration
          </CardTitle>
          <CardDescription>
            Send task notifications to a Telegram channel or group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telegram-token">Bot Token</Label>
            <Input
              id="telegram-token"
              type="password"
              placeholder={settings?.telegramBotToken ? "***configured***" : "Enter your bot token from @BotFather"}
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              data-testid="input-telegram-token"
            />
            <p className="text-xs text-muted-foreground">
              Create a bot with @BotFather on Telegram to get your token
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="telegram-chat">Chat ID</Label>
            <Input
              id="telegram-chat"
              placeholder={settings?.telegramChatId ? "***configured***" : "Enter your channel/group chat ID"}
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              data-testid="input-telegram-chat-id"
            />
            <p className="text-xs text-muted-foreground">
              Add your bot to a channel/group and use @RawDataBot to get the chat ID
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestTelegram}
              disabled={testTelegramMutation.isPending}
              data-testid="button-test-telegram"
            >
              {telegramTestStatus === "testing" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : telegramTestStatus === "success" ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              ) : telegramTestStatus === "error" ? (
                <XCircle className="mr-2 h-4 w-4 text-destructive" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>
            <Button 
              onClick={handleSaveTelegram}
              disabled={!telegramBotToken || !telegramChatId || updateMutation.isPending}
              data-testid="button-save-telegram"
            >
              Save Telegram Settings
            </Button>
          </div>

          {settings?.telegramEnabled && (
            <div className="flex items-center justify-between pt-2">
              <Label>Telegram Notifications</Label>
              <Switch
                checked={settings.telegramEnabled}
                onCheckedChange={(checked) => handleToggleNotification("telegramEnabled", checked)}
                data-testid="switch-telegram-enabled"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SiDiscord className="h-5 w-5 text-[#5865F2]" />
            Discord Integration
          </CardTitle>
          <CardDescription>
            Send task notifications to a Discord channel via webhooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discord-webhook">Webhook URL</Label>
            <Input
              id="discord-webhook"
              type="password"
              placeholder={settings?.discordWebhookUrl ? "***configured***" : "Enter your Discord webhook URL"}
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              data-testid="input-discord-webhook"
            />
            <p className="text-xs text-muted-foreground">
              Go to Channel Settings → Integrations → Webhooks → Create Webhook
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleTestDiscord}
              disabled={testDiscordMutation.isPending}
              data-testid="button-test-discord"
            >
              {discordTestStatus === "testing" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : discordTestStatus === "success" ? (
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
              ) : discordTestStatus === "error" ? (
                <XCircle className="mr-2 h-4 w-4 text-destructive" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Test Connection
            </Button>
            <Button 
              onClick={handleSaveDiscord}
              disabled={!discordWebhookUrl || updateMutation.isPending}
              data-testid="button-save-discord"
            >
              Save Discord Settings
            </Button>
          </div>

          {settings?.discordEnabled && (
            <div className="flex items-center justify-between pt-2">
              <Label>Discord Notifications</Label>
              <Switch
                checked={settings.discordEnabled}
                onCheckedChange={(checked) => handleToggleNotification("discordEnabled", checked)}
                data-testid="switch-discord-enabled"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Events</CardTitle>
          <CardDescription>
            Choose which events trigger notifications to your channels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">New Task Created</p>
              <p className="text-xs text-muted-foreground">Notify when a new task is created</p>
            </div>
            <Switch
              checked={settings?.notifyOnTaskCreate ?? true}
              onCheckedChange={(checked) => handleToggleNotification("notifyOnTaskCreate", checked)}
              data-testid="switch-notify-task-create"
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Task Completed</p>
              <p className="text-xs text-muted-foreground">Notify when a task is marked complete</p>
            </div>
            <Switch
              checked={settings?.notifyOnTaskComplete ?? true}
              onCheckedChange={(checked) => handleToggleNotification("notifyOnTaskComplete", checked)}
              data-testid="switch-notify-task-complete"
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Task Assigned</p>
              <p className="text-xs text-muted-foreground">Notify when someone is assigned a task</p>
            </div>
            <Switch
              checked={settings?.notifyOnTaskAssign ?? true}
              onCheckedChange={(checked) => handleToggleNotification("notifyOnTaskAssign", checked)}
              data-testid="switch-notify-task-assign"
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">New Comment</p>
              <p className="text-xs text-muted-foreground">Notify when someone comments on a task</p>
            </div>
            <Switch
              checked={settings?.notifyOnComment ?? false}
              onCheckedChange={(checked) => handleToggleNotification("notifyOnComment", checked)}
              data-testid="switch-notify-comment"
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Task Due Soon</p>
              <p className="text-xs text-muted-foreground">Notify when a task is due within 2 days</p>
            </div>
            <Switch
              checked={settings?.notifyOnDueSoon ?? true}
              onCheckedChange={(checked) => handleToggleNotification("notifyOnDueSoon", checked)}
              data-testid="switch-notify-due-soon"
            />
          </div>
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Task Overdue</p>
              <p className="text-xs text-muted-foreground">Notify when a task becomes overdue</p>
            </div>
            <Switch
              checked={settings?.notifyOnOverdue ?? true}
              onCheckedChange={(checked) => handleToggleNotification("notifyOnOverdue", checked)}
              data-testid="switch-notify-overdue"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
