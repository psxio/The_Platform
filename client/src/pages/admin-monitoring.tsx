import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  ChevronRight,
  Zap,
  AlertTriangle,
  TrendingUp,
  Coffee,
  Code,
  MessageSquare,
  Tv,
  Share2,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow, format, differenceInMinutes } from "date-fns";
import { getCategoryColor, getCategoryLabel, type AppCategory } from "@/lib/screen-capture";

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

interface ActivityFeedItem {
  id: number;
  sessionId: number;
  capturedAt: string;
  thumbnailData: string | null;
  detectedApps: string[] | null;
  activityLevel: string;
  user: UserInfo | null;
}

interface AppSummary {
  topApps: { name: string; count: number }[];
  totalActiveMinutes: number;
  totalIdleMinutes: number;
  totalReports: number;
}

const appCategories: Record<string, AppCategory> = {
  'Visual Studio Code': 'development',
  'Chrome': 'productivity',
  'Firefox': 'productivity',
  'Safari': 'productivity',
  'Slack': 'communication',
  'Discord': 'communication',
  'Microsoft Teams': 'communication',
  'Zoom': 'communication',
  'Terminal': 'development',
  'Figma': 'productivity',
  'Notion': 'productivity',
  'Microsoft Word': 'productivity',
  'Microsoft Excel': 'productivity',
  'Google Docs': 'productivity',
  'Google Sheets': 'productivity',
  'Gmail': 'communication',
  'Outlook': 'communication',
  'YouTube': 'entertainment',
  'Netflix': 'entertainment',
  'Spotify': 'entertainment',
  'Twitch': 'entertainment',
  'Twitter': 'social',
  'LinkedIn': 'social',
  'Facebook': 'social',
  'Instagram': 'social',
  'Reddit': 'social',
  'GitHub': 'development',
  'GitLab': 'development',
  'Jira': 'productivity',
  'Trello': 'productivity',
  'Asana': 'productivity',
  'Replit': 'development',
  'AWS Console': 'development',
  'Google Cloud': 'development',
  'Azure': 'development',
  'Postman': 'development',
  'Sublime Text': 'development',
  'IntelliJ': 'development',
  'WebStorm': 'development',
  'PyCharm': 'development',
  'Cursor': 'development',
};

function getAppCategory(appName: string): AppCategory {
  return appCategories[appName] || 'other';
}

function getCategoryIcon(category: AppCategory) {
  switch (category) {
    case 'productivity': return TrendingUp;
    case 'communication': return MessageSquare;
    case 'entertainment': return Tv;
    case 'development': return Code;
    case 'social': return Share2;
    default: return Activity;
  }
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

  const { data: activeSessions, isLoading: isLoadingActive, refetch: refetchActive } = useQuery<MonitoringSession[]>({
    queryKey: ["/api/admin/monitoring/sessions/active"],
    refetchInterval: 15000,
  });

  const { data: allSessions, isLoading: isLoadingSessions } = useQuery<MonitoringSession[]>({
    queryKey: ["/api/admin/monitoring/sessions"],
  });

  const { data: reports, isLoading: isLoadingReports } = useQuery<HourlyReport[]>({
    queryKey: ["/api/admin/monitoring/reports"],
  });

  const { data: activityFeed, isLoading: isLoadingFeed, refetch: refetchFeed } = useQuery<ActivityFeedItem[]>({
    queryKey: ["/api/admin/monitoring/activity-feed"],
    refetchInterval: 10000,
  });

  const { data: appSummary, isLoading: isLoadingSummary } = useQuery<AppSummary>({
    queryKey: ["/api/admin/monitoring/app-summary"],
    refetchInterval: 60000,
  });

  // Check for idle workers - workers with sessions longer than 30 min but very few screenshots
  // This is a rough heuristic; proper idle detection would need last screenshot timestamp
  const idleWorkers = activeSessions?.filter(session => {
    const sessionDurationMinutes = differenceInMinutes(new Date(), new Date(session.startedAt));
    // Expected: roughly 1 screenshot per 5-10 minutes on average
    // Alert if session is > 30 min and has fewer than expected screenshots
    const expectedMinScreenshots = Math.floor(sessionDurationMinutes / 10);
    return sessionDurationMinutes > 30 && session.screenshotCount < expectedMinScreenshots;
  }) || [];

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

      {idleWorkers.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Idle Worker Alert</AlertTitle>
          <AlertDescription>
            {idleWorkers.length} worker{idleWorkers.length > 1 ? 's are' : ' is'} showing low activity. 
            Consider checking on: {idleWorkers.map(w => getUserName(w.user)).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-3xl font-bold text-green-600">{activeSessions?.length || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Active Time</p>
                <p className="text-3xl font-bold">{Math.round((appSummary?.totalActiveMinutes || 0) / 60)}h</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Idle Time</p>
                <p className="text-3xl font-bold text-yellow-600">{Math.round((appSummary?.totalIdleMinutes || 0) / 60)}h</p>
              </div>
              <Coffee className="h-8 w-8 text-yellow-500" />
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

      {appSummary && appSummary.totalActiveMinutes + appSummary.totalIdleMinutes > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Activity Rate</span>
              <span className="text-sm text-muted-foreground">
                {Math.round((appSummary.totalActiveMinutes / (appSummary.totalActiveMinutes + appSummary.totalIdleMinutes)) * 100)}% active
              </span>
            </div>
            <Progress 
              value={(appSummary.totalActiveMinutes / (appSummary.totalActiveMinutes + appSummary.totalIdleMinutes)) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Live Feed
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Active ({activeSessions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            App Usage
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Real-Time Activity Feed
                </CardTitle>
                <CardDescription>
                  Live updates from all active monitoring sessions
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchFeed()}
                data-testid="button-refresh-feed"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingFeed ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : activityFeed?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity. Start monitoring to see live updates.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {activityFeed?.map((item) => (
                      <div 
                        key={item.id}
                        className="flex gap-4 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                        onClick={() => handleViewScreenshot(item.id)}
                      >
                        {item.thumbnailData ? (
                          <div className="w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <img 
                              src={item.thumbnailData}
                              alt="Screenshot"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-20 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <Image className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(item.user)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium truncate">
                                {getUserName(item.user)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge 
                                variant={item.activityLevel === 'active' ? 'default' : 'secondary'}
                                className={
                                  item.activityLevel === 'active' 
                                    ? 'bg-green-500 text-white' 
                                    : item.activityLevel === 'idle'
                                    ? 'bg-yellow-500 text-white'
                                    : ''
                                }
                              >
                                {item.activityLevel}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.capturedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          
                          {item.detectedApps && item.detectedApps.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.detectedApps.slice(0, 4).map(app => {
                                const category = getAppCategory(app);
                                return (
                                  <Badge 
                                    key={app} 
                                    variant="outline" 
                                    className={`text-xs ${getCategoryColor(category)} text-white border-0`}
                                  >
                                    {app}
                                  </Badge>
                                );
                              })}
                              {item.detectedApps.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{item.detectedApps.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Applications</CardTitle>
                <CardDescription>Most frequently detected applications across all sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-64 w-full" />
                ) : appSummary?.topApps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No app usage data yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {appSummary?.topApps.map((app, index) => {
                        const category = getAppCategory(app.name);
                        const CategoryIcon = getCategoryIcon(category);
                        const maxCount = appSummary.topApps[0]?.count || 1;
                        
                        return (
                          <div key={app.name} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${getCategoryColor(category)}`}>
                                  <CategoryIcon className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-sm font-medium">{app.name}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getCategoryLabel(category)}
                                </Badge>
                              </div>
                              <span className="text-sm text-muted-foreground">{app.count}x</span>
                            </div>
                            <Progress value={(app.count / maxCount) * 100} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity by Category</CardTitle>
                <CardDescription>Application usage grouped by category</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-4">
                    {(['productivity', 'development', 'communication', 'entertainment', 'social'] as AppCategory[]).map(category => {
                      const appsInCategory = appSummary?.topApps.filter(app => getAppCategory(app.name) === category) || [];
                      const totalCount = appsInCategory.reduce((sum, app) => sum + app.count, 0);
                      const CategoryIcon = getCategoryIcon(category);
                      
                      if (totalCount === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded ${getCategoryColor(category)}`}>
                                <CategoryIcon className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium">{getCategoryLabel(category)}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">{totalCount} detections</span>
                          </div>
                          <div className="flex flex-wrap gap-1 pl-8">
                            {appsInCategory.slice(0, 5).map(app => (
                              <Badge key={app.name} variant="outline" className="text-xs">
                                {app.name} ({app.count})
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

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
