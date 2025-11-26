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
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Connecting to Google Sheets...</p>
                <p className="text-sm">
                  The connection will be established automatically. If this persists, check that the Google Sheets API is enabled and the sheet is shared with the service account.
                </p>
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={() => connectMutation.mutate(undefined)}
              disabled={isSyncing}
              variant="outline"
              data-testid="button-reconnect-sheets"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${connectMutation.isPending ? 'animate-spin' : ''}`} />
              {connectMutation.isPending ? "Connecting..." : "Retry Connection"}
            </Button>
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
