import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Monitor, 
  Camera, 
  Clock, 
  BarChart3, 
  Users, 
  Eye,
  Image,
  Calendar,
  Activity,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface MonitoringSession {
  id: number;
  userId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  screenshotCount: number;
  totalDurationMinutes: number | null;
  user: UserInfo | null;
}

interface ScreenshotSummary {
  id: number;
  capturedAt: string;
  thumbnailData: string | null;
  ocrText: string | null;
  detectedApps: string[] | null;
  activityLevel: string;
}

interface Screenshot {
  id: number;
  imageData: string;
  thumbnailData: string | null;
  capturedAt: string;
  ocrText: string | null;
  detectedApps: string[] | null;
  activityLevel: string;
}

interface HourlyReport {
  id: number;
  userId: string;
  hourStart: string;
  hourEnd: string;
  activeMinutes: number;
  idleMinutes: number;
  screenshotsTaken: number;
  activitySummary: string | null;
  topAppsDetected: string[] | null;
  user: UserInfo | null;
  screenshot: {
    id: number;
    thumbnailData: string | null;
    capturedAt: string;
  } | null;
}

function getInitials(user: UserInfo | null): string {
  if (!user) return "?";
  return [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n?.[0])
    .join('')
    .toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
}

function getUserName(user: UserInfo | null): string {
  if (!user) return "Unknown";
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
}

export default function AdminMonitoring() {
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);

  const { data: activeSessions, isLoading: isLoadingActive } = useQuery<MonitoringSession[]>({
    queryKey: ["/api/admin/monitoring/sessions/active"],
    refetchInterval: 30000,
  });

  const { data: allSessions, isLoading: isLoadingSessions } = useQuery<MonitoringSession[]>({
    queryKey: ["/api/admin/monitoring/sessions"],
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery<HourlyReport[]>({
    queryKey: ["/api/admin/monitoring/reports"],
  });

  const { data: sessionScreenshots, isLoading: isLoadingScreenshots } = useQuery<ScreenshotSummary[]>({
    queryKey: ["/api/admin/monitoring/session", selectedSession?.id, "screenshots"],
    enabled: !!selectedSession,
  });

  const { data: fullScreenshot, isLoading: isLoadingFullScreenshot } = useQuery<Screenshot>({
    queryKey: ["/api/admin/monitoring/screenshot", selectedScreenshot?.id],
    enabled: !!selectedScreenshot,
  });

  const handleViewSession = (session: MonitoringSession) => {
    setSelectedSession(session);
    setShowSessionDialog(true);
  };

  const handleViewScreenshot = (screenshotId: number) => {
    setSelectedScreenshot({ id: screenshotId } as Screenshot);
    setShowScreenshotDialog(true);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6" />
            Worker Monitoring Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            View worker activity, sessions, and hourly reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-3xl font-bold">{activeSessions?.length || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold">{allSessions?.length || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hourly Reports</p>
                <p className="text-3xl font-bold">{reports?.length || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Active Now ({activeSessions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            All Sessions
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Hourly Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {isLoadingActive ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : activeSessions?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No workers are currently being monitored</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeSessions?.map(session => (
                <Card key={session.id} className="border-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{getInitials(session.user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{getUserName(session.user)}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.user?.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold">{session.screenshotCount}</p>
                          <p className="text-xs text-muted-foreground">Captures</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold">
                            {Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000)}m
                          </p>
                          <p className="text-xs text-muted-foreground">Duration</p>
                        </div>
                        <Badge variant="default" className="animate-pulse">
                          <Camera className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewSession(session)}
                          data-testid={`button-view-session-${session.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          {isLoadingSessions ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Monitoring Sessions</CardTitle>
                <CardDescription>
                  Complete history of worker monitoring sessions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {allSessions?.map(session => (
                      <div 
                        key={session.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                        onClick={() => handleViewSession(session)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(session.user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{getUserName(session.user)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(session.startedAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <Badge variant={session.status === "active" ? "default" : "secondary"}>
                            {session.status}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Image className="h-4 w-4" />
                            <span className="text-sm">{session.screenshotCount}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.totalDurationMinutes 
                              ? `${session.totalDurationMinutes}m`
                              : "In progress"
                            }
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {isLoadingReports ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Hourly Activity Reports</CardTitle>
                <CardDescription>
                  Summarized hourly reports with random screenshot samples
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {reports?.map(report => (
                      <Card key={report.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {report.screenshot?.thumbnailData && (
                              <div 
                                className="w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover-elevate"
                                onClick={() => report.screenshot && handleViewScreenshot(report.screenshot.id)}
                              >
                                <img 
                                  src={report.screenshot.thumbnailData} 
                                  alt="Screenshot"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-xs">
                                      {getInitials(report.user)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">
                                    {getUserName(report.user)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(report.hourStart), "MMM d, h:mm a")} - {format(new Date(report.hourEnd), "h:mm a")}
                                </div>
                              </div>
                              
                              <div className="flex gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600">
                                    {report.activeMinutes}m active
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                    {report.idleMinutes}m idle
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline">
                                    {report.screenshotsTaken} captures
                                  </Badge>
                                </div>
                              </div>
                              
                              {report.topAppsDetected && report.topAppsDetected.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {report.topAppsDetected.slice(0, 5).map(app => (
                                    <Badge key={app} variant="secondary" className="text-xs">
                                      {app}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {report.activitySummary && (
                                <p className="text-xs text-muted-foreground">
                                  {report.activitySummary}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Session Details - {selectedSession?.user ? getUserName(selectedSession.user) : "Unknown"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-lg font-bold">{selectedSession.screenshotCount}</p>
                  <p className="text-xs text-muted-foreground">Screenshots</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-lg font-bold">
                    {selectedSession.totalDurationMinutes || Math.floor((Date.now() - new Date(selectedSession.startedAt).getTime()) / 60000)}
                  </p>
                  <p className="text-xs text-muted-foreground">Minutes</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium">
                    {format(new Date(selectedSession.startedAt), "h:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground">Started</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm font-medium">
                    {selectedSession.endedAt 
                      ? format(new Date(selectedSession.endedAt), "h:mm a")
                      : "Active"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Ended</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Screenshots</h4>
                {isLoadingScreenshots ? (
                  <div className="grid grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-4 gap-3">
                      {sessionScreenshots?.map(screenshot => (
                        <div 
                          key={screenshot.id}
                          className="relative rounded-md overflow-hidden bg-muted cursor-pointer hover-elevate"
                          onClick={() => handleViewScreenshot(screenshot.id)}
                        >
                          {screenshot.thumbnailData ? (
                            <img 
                              src={screenshot.thumbnailData}
                              alt="Screenshot"
                              className="w-full h-24 object-cover"
                            />
                          ) : (
                            <div className="w-full h-24 flex items-center justify-center">
                              <Image className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                            {format(new Date(screenshot.capturedAt), "h:mm a")}
                          </div>
                          {screenshot.activityLevel && (
                            <Badge 
                              variant="outline" 
                              className={`absolute top-1 right-1 text-xs ${
                                screenshot.activityLevel === 'active' 
                                  ? 'bg-green-500/80 text-white border-0' 
                                  : screenshot.activityLevel === 'idle'
                                  ? 'bg-yellow-500/80 text-white border-0'
                                  : 'bg-gray-500/80 text-white border-0'
                              }`}
                            >
                              {screenshot.activityLevel}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showScreenshotDialog} onOpenChange={setShowScreenshotDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Screenshot Details</DialogTitle>
          </DialogHeader>
          
          {isLoadingFullScreenshot ? (
            <Skeleton className="h-[500px] w-full" />
          ) : fullScreenshot && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-muted">
                <img 
                  src={fullScreenshot.imageData}
                  alt="Full screenshot"
                  className="w-full h-auto"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Capture Details</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Captured: {format(new Date(fullScreenshot.capturedAt), "MMM d, yyyy 'at' h:mm:ss a")}</p>
                    <p>Activity Level: {fullScreenshot.activityLevel}</p>
                  </div>
                </div>
                
                {fullScreenshot.detectedApps && fullScreenshot.detectedApps.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Detected Applications</h4>
                    <div className="flex flex-wrap gap-1">
                      {fullScreenshot.detectedApps.map(app => (
                        <Badge key={app} variant="secondary">{app}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {fullScreenshot.ocrText && (
                <div>
                  <h4 className="text-sm font-medium mb-2">OCR Text (excerpt)</h4>
                  <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground max-h-32 overflow-y-auto">
                    {fullScreenshot.ocrText.substring(0, 500)}
                    {fullScreenshot.ocrText.length > 500 && "..."}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
