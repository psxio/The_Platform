import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Link, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Settings,
  ExternalLink,
  HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SheetStatus {
  configured: boolean;
  sheetId: string | null;
  hasCredentials: boolean;
  serviceAccountEmail?: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  error?: string;
}

export function GoogleSheetsSync() {
  const { toast } = useToast();
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [sheetIdInput, setSheetIdInput] = useState("");
  const [showSetupHelp, setShowSetupHelp] = useState(false);

  const { data: status, isLoading: statusLoading, error: statusError } = useQuery<SheetStatus>({
    queryKey: ["/api/sheets/status"],
    refetchInterval: 30000,
  });

  const connectMutation = useMutation({
    mutationFn: async (sheetId?: string) => {
      const response = await apiRequest("POST", "/api/sheets/connect", { sheetId });
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/status"] });
      if (data.success) {
        toast({
          title: "Connected",
          description: data.message || "Connected to Google Sheets",
        });
        setSheetIdInput("");
      } else {
        toast({
          title: "Connection Failed",
          description: data.error || data.message || "Failed to connect",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to Google Sheets",
        variant: "destructive",
      });
    },
  });

  const pushMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sheets/sync/push");
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      setLastSync(new Date().toLocaleTimeString());
      toast({
        title: "Push Complete",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Push Failed",
        description: error instanceof Error ? error.message : "Failed to push to Google Sheet",
        variant: "destructive",
      });
    },
  });

  const pullMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sheets/sync/pull");
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      setLastSync(new Date().toLocaleTimeString());
      toast({
        title: "Pull Complete",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Pull Failed",
        description: error instanceof Error ? error.message : "Failed to pull from Google Sheet",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sheets/disconnect");
      return await response.json() as SyncResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/status"] });
      toast({
        title: "Disconnected",
        description: "Disconnected from Google Sheets",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  // Directory sync mutations
  const pushDirectoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sheets/sync/directory/push");
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      setLastSync(new Date().toLocaleTimeString());
      toast({
        title: "Directory Push Complete",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Directory Push Failed",
        description: error instanceof Error ? error.message : "Failed to push directory to Google Sheet",
        variant: "destructive",
      });
    },
  });

  const pullDirectoryMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sheets/sync/directory/pull");
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      setLastSync(new Date().toLocaleTimeString());
      toast({
        title: "Directory Pull Complete",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Directory Pull Failed",
        description: error instanceof Error ? error.message : "Failed to pull directory from Google Sheet",
        variant: "destructive",
      });
    },
  });

  const isSyncing = pushMutation.isPending || pullMutation.isPending || connectMutation.isPending || 
                   pushDirectoryMutation.isPending || pullDirectoryMutation.isPending;

  const extractSheetId = (input: string): string => {
    if (input.includes("docs.google.com/spreadsheets")) {
      const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) return match[1];
    }
    return input.trim();
  };

  const handleConnect = () => {
    const sheetId = extractSheetId(sheetIdInput);
    connectMutation.mutate(sheetId || undefined);
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (statusError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            Google Sheets Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to check Google Sheets status. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-sheets-sync">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5" />
              Google Sheets Sync
            </CardTitle>
            {status?.configured ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <XCircle className="h-3 w-3" />
                Not Connected
              </Badge>
            )}
          </div>
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Last sync: {lastSync}
            </span>
          )}
        </div>
        <CardDescription>
          Sync tasks between your database and Google Sheets for external collaboration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.configured ? (
          <div className="space-y-4">
            {!status?.hasCredentials ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Service account credentials required</p>
                  <p className="text-sm mb-2">
                    To connect to Google Sheets, you need to set up a Google Cloud service account.
                  </p>
                  <Collapsible open={showSetupHelp} onOpenChange={setShowSetupHelp}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:bg-transparent hover:text-primary/80">
                        <HelpCircle className="h-3 w-3 mr-1" />
                        {showSetupHelp ? "Hide setup instructions" : "Show setup instructions"}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3">
                      <div className="text-sm space-y-2 bg-muted p-3 rounded-md">
                        <p className="font-medium">Step 1: Create a Google Cloud Project</p>
                        <p>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a> and create a new project.</p>
                        
                        <p className="font-medium mt-3">Step 2: Enable Google Sheets API</p>
                        <p>In your project, go to APIs & Services and enable the Google Sheets API.</p>
                        
                        <p className="font-medium mt-3">Step 3: Create a Service Account</p>
                        <p>Go to IAM & Admin, then Service Accounts, and create a new service account.</p>
                        
                        <p className="font-medium mt-3">Step 4: Create a Key</p>
                        <p>Click on the service account, go to Keys tab, and create a new JSON key. Download it.</p>
                        
                        <p className="font-medium mt-3">Step 5: Set Environment Variables</p>
                        <ul className="list-disc ml-4 space-y-1">
                          <li><code className="text-xs bg-background px-1 py-0.5 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> - The "client_email" from the JSON key</li>
                          <li><code className="text-xs bg-background px-1 py-0.5 rounded">GOOGLE_PRIVATE_KEY</code> - The "private_key" from the JSON key</li>
                        </ul>
                        
                        <p className="font-medium mt-3">Step 6: Share Your Sheet</p>
                        <p>Open your Google Sheet and share it with the service account email (with Editor access).</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-400">
                    Service account credentials are configured!
                    {status.serviceAccountEmail && (
                      <span className="block text-xs mt-1">
                        Service account: {status.serviceAccountEmail}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="sheet-id">Google Sheet URL or ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sheet-id"
                      placeholder="Paste your Google Sheet URL or ID here"
                      value={sheetIdInput}
                      onChange={(e) => setSheetIdInput(e.target.value)}
                      data-testid="input-sheet-id"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleConnect}
                      disabled={isSyncing || !sheetIdInput.trim()}
                      data-testid="button-connect-sheets"
                    >
                      <Link className="h-4 w-4 mr-2" />
                      {connectMutation.isPending ? "Connecting..." : "Connect"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Make sure you've shared the sheet with: {status.serviceAccountEmail || "your service account email"}
                  </p>
                </div>
              </div>
            )}
            
            {!status?.hasCredentials && (
              <Button 
                onClick={() => connectMutation.mutate(undefined)}
                disabled={isSyncing}
                variant="outline"
                data-testid="button-try-connect-sheets"
              >
                <Link className="h-4 w-4 mr-2" />
                Try to Connect Anyway
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {status.sheetId && (
              <div className="text-sm text-muted-foreground">
                Connected to sheet: <code className="bg-muted px-1 py-0.5 rounded text-xs">{status.sheetId}</code>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => pullMutation.mutate()}
                disabled={isSyncing}
                data-testid="button-pull-from-sheet"
              >
                <ArrowDownToLine className={`h-4 w-4 mr-2 ${pullMutation.isPending ? 'animate-spin' : ''}`} />
                {pullMutation.isPending ? "Pulling..." : "Pull from Sheet"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => pushMutation.mutate()}
                disabled={isSyncing}
                data-testid="button-push-to-sheet"
              >
                <ArrowUpFromLine className={`h-4 w-4 mr-2 ${pushMutation.isPending ? 'animate-spin' : ''}`} />
                {pushMutation.isPending ? "Pushing..." : "Push to Sheet"}
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => connectMutation.mutate(undefined)}
                disabled={isSyncing}
                title="Reconnect"
                data-testid="button-reconnect-sheets"
              >
                <RefreshCw className={`h-4 w-4 ${connectMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => disconnectMutation.mutate()}
                disabled={isSyncing}
                className="text-muted-foreground hover:text-destructive"
                data-testid="button-disconnect-sheets"
              >
                Disconnect
              </Button>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3 text-sm">Directory Sync</h4>
              <div className="flex flex-wrap gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => pullDirectoryMutation.mutate()}
                  disabled={isSyncing}
                  data-testid="button-pull-directory-from-sheet"
                >
                  <ArrowDownToLine className={`h-4 w-4 mr-2 ${pullDirectoryMutation.isPending ? 'animate-spin' : ''}`} />
                  {pullDirectoryMutation.isPending ? "Pulling..." : "Pull Directory"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => pushDirectoryMutation.mutate()}
                  disabled={isSyncing}
                  data-testid="button-push-directory-to-sheet"
                >
                  <ArrowUpFromLine className={`h-4 w-4 mr-2 ${pushDirectoryMutation.isPending ? 'animate-spin' : ''}`} />
                  {pushDirectoryMutation.isPending ? "Pushing..." : "Push Directory"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Directory syncs to a separate "Directory" sheet tab in your Google Sheet.
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Tasks:</strong> Pull/Push imports/exports tasks from the "Tasks" sheet.
                <br />
                <strong>Directory:</strong> Pull/Push imports/exports team members from the "Directory" sheet.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
