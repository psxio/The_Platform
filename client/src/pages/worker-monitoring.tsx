import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Camera, 
  PlayCircle, 
  StopCircle, 
  Clock, 
  BarChart3, 
  ShieldCheck,
  AlertTriangle,
  Monitor,
  CheckCircle2,
  Loader2,
  Image
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { MonitoringConsentDialog } from "@/components/monitoring-consent-dialog";
import { 
  requestScreenCapture, 
  captureScreenshot, 
  stopScreenCapture, 
  isScreenCaptureActive,
  terminateOcrWorker 
} from "@/lib/screen-capture";
import { ContentAccessGuard } from "@/components/content-access-guard";
import { useToast } from "@/hooks/use-toast";

interface MonitoringSession {
  id: number;
  userId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  screenshotCount: number;
  totalDurationMinutes: number | null;
}

interface MonitoringConsent {
  id: number;
  userId: string;
  consentVersion: string;
  consentedAt: string;
}

interface HourlyReport {
  id: number;
  hourStart: string;
  hourEnd: string;
  activeMinutes: number;
  idleMinutes: number;
  screenshotsTaken: number;
  activitySummary: string | null;
}

export default function WorkerMonitoring() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [captureInterval, setCaptureInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastCaptureTime, setLastCaptureTime] = useState<Date | null>(null);
  const [nextCaptureIn, setNextCaptureIn] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const { data: consentData, isLoading: isLoadingConsent } = useQuery<{ consent: MonitoringConsent | null; hasValidConsent: boolean }>({
    queryKey: ["/api/monitoring/consent"],
  });

  const { data: sessionData, isLoading: isLoadingSession } = useQuery<{ session: MonitoringSession | null }>({
    queryKey: ["/api/monitoring/session/active"],
    refetchInterval: 10000,
  });

  const { data: sessions, isLoading: isLoadingSessions } = useQuery<MonitoringSession[]>({
    queryKey: ["/api/monitoring/sessions"],
  });

  const { data: reports } = useQuery<HourlyReport[]>({
    queryKey: ["/api/monitoring/reports"],
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/monitoring/session/start");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/session/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/sessions"] });
      toast({
        title: "Monitoring Started",
        description: "Your work session is now being monitored.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Start",
        description: error.message || "Could not start monitoring session.",
        variant: "destructive",
      });
    },
  });

  const stopSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("POST", `/api/monitoring/session/${sessionId}/end`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/session/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/sessions"] });
      stopScreenCapture();
      terminateOcrWorker();
      if (captureInterval) {
        clearInterval(captureInterval);
        setCaptureInterval(null);
      }
      toast({
        title: "Monitoring Stopped",
        description: "Your work session has ended.",
      });
    },
  });

  const uploadScreenshotMutation = useMutation({
    mutationFn: async (data: { 
      sessionId: number; 
      imageData: string; 
      thumbnailData: string;
      ocrText: string | null;
      detectedApps: string[];
      activityLevel: string;
    }) => {
      const response = await apiRequest("POST", "/api/monitoring/screenshot", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/session/active"] });
      setLastCaptureTime(new Date());
    },
  });

  const getRandomInterval = () => {
    return Math.floor(Math.random() * (10 - 1 + 1) + 1) * 60 * 1000;
  };

  const performCapture = useCallback(async () => {
    const session = sessionData?.session;
    if (!session || session.status !== "active") return;

    const result = await captureScreenshot();
    if (result) {
      await uploadScreenshotMutation.mutateAsync({
        sessionId: session.id,
        imageData: result.imageData,
        thumbnailData: result.thumbnailData,
        ocrText: result.ocrText,
        detectedApps: result.detectedApps,
        activityLevel: result.activityLevel,
      });
    }
  }, [sessionData?.session, uploadScreenshotMutation]);

  const scheduleNextCapture = useCallback(() => {
    const interval = getRandomInterval();
    setNextCaptureIn(Math.floor(interval / 1000));
    
    const timer = setTimeout(async () => {
      await performCapture();
      scheduleNextCapture();
    }, interval);
    
    setCaptureInterval(timer);
  }, [performCapture]);

  useEffect(() => {
    if (nextCaptureIn !== null && nextCaptureIn > 0) {
      countdownRef.current = setInterval(() => {
        setNextCaptureIn(prev => prev !== null && prev > 0 ? prev - 1 : null);
      }, 1000);
    }
    
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [nextCaptureIn !== null]);

  useEffect(() => {
    return () => {
      if (captureInterval) {
        clearTimeout(captureInterval);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [captureInterval]);

  const handleStartMonitoring = async () => {
    const hasScreenAccess = await requestScreenCapture();
    if (!hasScreenAccess) {
      toast({
        title: "Screen Access Required",
        description: "Please allow screen capture to start monitoring.",
        variant: "destructive",
      });
      return;
    }

    await startSessionMutation.mutateAsync();
    scheduleNextCapture();
  };

  const handleStopMonitoring = async () => {
    const session = sessionData?.session;
    if (!session) return;
    
    if (captureInterval) {
      clearTimeout(captureInterval);
      setCaptureInterval(null);
    }
    
    await stopSessionMutation.mutateAsync(session.id);
  };

  const session = sessionData?.session;
  const hasConsent = consentData?.hasValidConsent;

  if (isLoadingConsent || isLoadingSession) {
    return (
      <ContentAccessGuard>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </ContentAccessGuard>
    );
  }

  return (
    <ContentAccessGuard>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Monitor className="h-6 w-6" />
              Worker Monitoring
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and log your work sessions with screen capture
            </p>
          </div>
          
          {hasConsent && (
            <Badge variant="outline" className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Consent Provided
            </Badge>
          )}
        </div>

        {!hasConsent && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Consent Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>
                Before you can start monitored work sessions, you need to review and provide consent for the monitoring activities.
              </span>
              <Button 
                onClick={() => setShowConsentDialog(true)}
                className="ml-4"
                data-testid="button-provide-consent"
              >
                Provide Consent
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {hasConsent && !session && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Start Work Session
              </CardTitle>
              <CardDescription>
                Begin a monitored work session. Your screen will be captured periodically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Camera className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Screen Capture</p>
                  <p className="text-sm text-muted-foreground">
                    Screenshots taken at random intervals (1-10 minutes)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Time Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Your active and idle time is automatically tracked
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Hourly Reports</p>
                  <p className="text-sm text-muted-foreground">
                    One random screenshot per hour included in your activity report
                  </p>
                </div>
              </div>
              
              <Button 
                className="w-full"
                size="lg"
                onClick={handleStartMonitoring}
                disabled={startSessionMutation.isPending}
                data-testid="button-start-monitoring"
              >
                {startSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Monitored Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {session && (
          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Camera className="h-5 w-5 animate-pulse" />
                  Monitoring Active
                </CardTitle>
                <Badge variant="default" className="animate-pulse">
                  Recording
                </Badge>
              </div>
              <CardDescription>
                Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{session.screenshotCount}</p>
                  <p className="text-sm text-muted-foreground">Screenshots</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">
                    {Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)}
                  </p>
                  <p className="text-sm text-muted-foreground">Minutes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">
                    {lastCaptureTime ? formatDistanceToNow(lastCaptureTime, { addSuffix: true }) : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Capture</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">
                    {nextCaptureIn !== null ? `${Math.floor(nextCaptureIn / 60)}:${String(nextCaptureIn % 60).padStart(2, '0')}` : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Next Capture</p>
                </div>
              </div>

              {isScreenCaptureActive() && (
                <Alert className="border-primary/50">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    Screen capture is active. Keep this browser tab open for monitoring to continue.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                variant="destructive"
                className="w-full"
                size="lg"
                onClick={handleStopMonitoring}
                disabled={stopSessionMutation.isPending}
                data-testid="button-stop-monitoring"
              >
                {stopSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Monitored Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {sessions && sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 5).map(s => (
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={s.status === "active" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(s.startedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.totalDurationMinutes ? `${s.totalDurationMinutes} minutes` : "In progress"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Image className="h-4 w-4" />
                      <span className="text-sm">{s.screenshotCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {reports && reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Hourly Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.slice(0, 5).map(report => (
                  <div 
                    key={report.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {format(new Date(report.hourStart), "MMM d, h:mm a")} - {format(new Date(report.hourEnd), "h:mm a")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.activeMinutes} active, {report.idleMinutes} idle
                      </p>
                    </div>
                    <Badge variant="outline">
                      {report.screenshotsTaken} captures
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <MonitoringConsentDialog
          open={showConsentDialog}
          onClose={() => setShowConsentDialog(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/monitoring/consent"] });
            setShowConsentDialog(false);
          }}
        />
      </div>
    </ContentAccessGuard>
  );
}
