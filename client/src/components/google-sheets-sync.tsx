import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Link, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface SheetStatus {
  configured: boolean;
  sheetId: string | null;
}

interface SyncResult {
  success: boolean;
  message: string;
}

export function GoogleSheetsSync() {
  const { toast } = useToast();
  const [lastSync, setLastSync] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading, error: statusError } = useQuery<SheetStatus>({
    queryKey: ["/api/sheets/status"],
    refetchInterval: 30000,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sheets/connect");
      return await response.json() as SyncResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets/status"] });
      toast({
        title: data.success ? "Connected" : "Connection Failed",
        description: data.message || (data.success ? "Connected to Google Sheets" : "Failed to connect"),
        variant: data.success ? "default" : "destructive",
      });
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

  const isSyncing = pushMutation.isPending || pullMutation.isPending || connectMutation.isPending;

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
      <CardContent>
        {!status?.configured ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                To enable Google Sheets sync, you need to configure the following environment variables:
                <ul className="list-disc ml-4 mt-2 text-sm">
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code> - Service account email</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">GOOGLE_PRIVATE_KEY</code> - Service account private key</li>
                  <li><code className="text-xs bg-muted px-1 py-0.5 rounded">GOOGLE_SHEET_ID</code> - The ID of your Google Sheet</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => connectMutation.mutate()}
              disabled={isSyncing}
              data-testid="button-connect-sheets"
            >
              <Link className="h-4 w-4 mr-2" />
              {connectMutation.isPending ? "Connecting..." : "Connect to Google Sheets"}
            </Button>
          </div>
        ) : (
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
              onClick={() => connectMutation.mutate()}
              disabled={isSyncing}
              title="Reconnect"
              data-testid="button-reconnect-sheets"
            >
              <RefreshCw className={`h-4 w-4 ${connectMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
