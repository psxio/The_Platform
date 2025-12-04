import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { LivePreviewViewer } from "@/components/live-preview-viewer";
import { useAuth } from "@/hooks/useAuth";
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
  RefreshCw,
  ShieldCheck,
  Gauge,
  Circle,
  MonitorPlay
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

function ActivityScoreGauge({ score, label }: { score: number; label?: string }) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-500";
    if (value >= 60) return "text-blue-500";
    if (value >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (value: number) => {
    if (value >= 80) return "stroke-green-500";
    if (value >= 60) return "stroke-blue-500";
    if (value >= 40) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          className={`${getScoreBgColor(score)} transition-all duration-500`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
          {Math.round(score)}%
        </span>
        {label && (
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        )}
      </div>
    </div>
  );
}

function CategoryBadge({ category, count }: { category: AppCategory; count?: number }) {
  const CategoryIcon = getCategoryIcon(category);
  return (
    <Badge 
      variant="secondary" 
      className={`${getCategoryColor(category)} text-white border-0 gap-1`}
    >
      <CategoryIcon className="h-3 w-3" />
      {getCategoryLabel(category)}
      {count !== undefined && <span className="ml-1 opacity-80">({count})</span>}
    </Badge>
  );
}

interface TimelineItem {
  id: number;
  capturedAt: string;
  thumbnailData: string | null;
  detectedApps: string[] | null;
  activityLevel: string;
  user?: UserInfo | null;
}

function ScreenshotTimeline({ 
  screenshots, 
  onViewScreenshot 
}: { 
  screenshots: TimelineItem[];
  onViewScreenshot: (id: number) => void;
}) {
  const sortedScreenshots = [...screenshots].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  );
  
  const groupedByDate = sortedScreenshots.reduce((acc, item) => {
    const dateKey = format(new Date(item.capturedAt), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, TimelineItem[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([dateKey, items]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {format(new Date(dateKey), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          
          <div className="relative pl-6 border-l-2 border-muted space-y-4">
            {items.map((item) => {
              const apps = item.detectedApps || [];
              const categoryCounts = apps.reduce((acc, app) => {
                const cat = getAppCategory(app);
                acc[cat] = (acc[cat] || 0) + 1;
                return acc;
              }, {} as Record<AppCategory, number>);

              return (
                <div 
                  key={item.id}
                  className="relative group"
                >
                  <div className="absolute -left-[25px] top-3 w-3 h-3 rounded-full bg-background border-2 border-primary" />
                  
                  <div 
                    className="ml-4 p-4 rounded-lg bg-muted/50 hover-elevate cursor-pointer transition-all"
                    onClick={() => onViewScreenshot(item.id)}
                    data-testid={`timeline-item-${item.id}`}
                  >
                    <div className="flex gap-4">
                      {item.thumbnailData ? (
                        <div className="w-40 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0 border">
                          <img 
                            src={item.thumbnailData}
                            alt="Screenshot"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-24 rounded-md bg-muted flex items-center justify-center flex-shrink-0 border">
                          <Image className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-medium">
                            {format(new Date(item.capturedAt), "h:mm:ss a")}
                          </span>
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
                            {item.activityLevel === 'active' && <Activity className="h-3 w-3 mr-1" />}
                            {item.activityLevel === 'idle' && <Coffee className="h-3 w-3 mr-1" />}
                            {item.activityLevel}
                          </Badge>
                        </div>
                        
                        {Object.keys(categoryCounts).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(Object.entries(categoryCounts) as [AppCategory, number][])
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 4)
                              .map(([cat, count]) => (
                                <CategoryBadge key={cat} category={cat} count={count} />
                              ))
                            }
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground mt-2">
                            No applications detected
                          </p>
                        )}
                        
                        {item.user && (
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-xs">
                                {getInitials(item.user)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              {getUserName(item.user)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminMonitoring() {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<MonitoringSession | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [showScreenshotDialog, setShowScreenshotDialog] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [livePreviewUser, setLivePreviewUser] = useState<UserInfo | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

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

  const idleWorkers = activeSessions?.filter(session => {
    const sessionDurationMinutes = differenceInMinutes(new Date(), new Date(session.startedAt));
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

  const handleWatchLive = (session: MonitoringSession) => {
    if (session.user) {
      setLivePreviewUser(session.user);
      setShowLivePreview(true);
    }
  };

  const activityScore = (() => {
    if (!appSummary) return 0;
    const total = (appSummary.totalActiveMinutes || 0) + (appSummary.totalIdleMinutes || 0);
    if (total === 0) return 0;
    const score = (appSummary.totalActiveMinutes || 0) / total * 100;
    return isNaN(score) ? 0 : Math.round(score);
  })();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="heading-monitoring">
            <Monitor className="h-6 w-6" />
            Worker Monitoring Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            View worker activity, sessions, and hourly reports
          </p>
        </div>
      </div>

      <Alert className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">Privacy & Consent Reminder</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          All monitored workers have provided explicit consent for screen capture and activity tracking. 
          Screenshots are captured at random intervals during active sessions only. 
          Workers can stop monitoring at any time from their dashboard.
        </AlertDescription>
      </Alert>

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <ActivityScoreGauge score={activityScore} label="Activity Score" />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Overall team productivity based on active vs idle time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-3xl font-bold text-green-600">{activeSessions?.length || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500/10">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Time</p>
                <p className="text-3xl font-bold">{Math.round((appSummary?.totalActiveMinutes || 0) / 60)}h</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500/10">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Idle Time</p>
                <p className="text-3xl font-bold text-yellow-600">{Math.round((appSummary?.totalIdleMinutes || 0) / 60)}h</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Coffee className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="timeline" className="flex items-center gap-2" data-testid="tab-timeline">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2" data-testid="tab-active">
            <Activity className="h-4 w-4" />
            Active ({activeSessions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="apps" className="flex items-center gap-2" data-testid="tab-apps">
            <TrendingUp className="h-4 w-4" />
            App Categories
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2" data-testid="tab-sessions">
            <Camera className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
            <BarChart3 className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>
                  Chronological view of all captured screenshots with app categories
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchFeed()}
                data-testid="button-refresh-timeline"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingFeed ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : activityFeed?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Camera className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No Activity Yet</p>
                  <p className="text-sm">Start monitoring to see activity in the timeline</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <ScreenshotTimeline 
                    screenshots={activityFeed || []}
                    onViewScreenshot={handleViewScreenshot}
                  />
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apps" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Category Breakdown
                </CardTitle>
                <CardDescription>Application usage by category</CardDescription>
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
                      const maxTotal = Math.max(
                        ...(['productivity', 'development', 'communication', 'entertainment', 'social'] as AppCategory[]).map(cat =>
                          (appSummary?.topApps.filter(app => getAppCategory(app.name) === cat) || [])
                            .reduce((sum, app) => sum + app.count, 0)
                        )
                      ) || 1;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                                <CategoryIcon className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium">{getCategoryLabel(category)}</span>
                            </div>
                            <span className="text-sm font-bold">{totalCount}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getCategoryColor(category)} transition-all duration-500`}
                              style={{ width: `${(totalCount / maxTotal) * 100}%` }}
                            />
                          </div>
                          {appsInCategory.length > 0 && (
                            <div className="flex flex-wrap gap-1 pl-10">
                              {appsInCategory.slice(0, 3).map(app => (
                                <Badge key={app.name} variant="outline" className="text-xs">
                                  {app.name} ({app.count})
                                </Badge>
                              ))}
                              {appsInCategory.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{appsInCategory.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Applications</CardTitle>
                <CardDescription>Most frequently detected applications</CardDescription>
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
                      {appSummary?.topApps.slice(0, 15).map((app, index) => {
                        const category = getAppCategory(app.name);
                        const CategoryIcon = getCategoryIcon(category);
                        const maxCount = appSummary.topApps[0]?.count || 1;
                        
                        return (
                          <div key={app.name} className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-5">{index + 1}</span>
                            <div className={`p-1.5 rounded ${getCategoryColor(category)}`}>
                              <CategoryIcon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium truncate">{app.name}</span>
                                <span className="text-sm text-muted-foreground ml-2">{app.count}x</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getCategoryColor(category)} transition-all`}
                                  style={{ width: `${(app.count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
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
                    <div className="flex items-center justify-between flex-wrap gap-4">
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
                      
                      <div className="flex items-center gap-4 flex-wrap">
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
                          variant="default"
                          onClick={() => handleWatchLive(session)}
                          className="bg-green-600 hover:bg-green-700 gap-1"
                          data-testid={`button-watch-live-${session.id}`}
                        >
                          <MonitorPlay className="h-4 w-4" />
                          Watch Live
                        </Button>
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
                        data-testid={`session-row-${session.id}`}
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
                    {reports?.map(report => {
                      const categoryCounts = (report.topAppsDetected || []).reduce((acc, app) => {
                        const cat = getAppCategory(app);
                        acc[cat] = (acc[cat] || 0) + 1;
                        return acc;
                      }, {} as Record<AppCategory, number>);

                      return (
                        <Card key={report.id}>
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {report.screenshot?.thumbnailData && (
                                <div 
                                  className="w-32 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer hover-elevate border"
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
                                <div className="flex items-center justify-between flex-wrap gap-2">
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
                                
                                <div className="flex gap-2 flex-wrap text-sm">
                                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                                    <Activity className="h-3 w-3 mr-1" />
                                    {report.activeMinutes}m active
                                  </Badge>
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                                    <Coffee className="h-3 w-3 mr-1" />
                                    {report.idleMinutes}m idle
                                  </Badge>
                                  <Badge variant="outline">
                                    <Camera className="h-3 w-3 mr-1" />
                                    {report.screenshotsTaken} captures
                                  </Badge>
                                </div>
                                
                                {Object.keys(categoryCounts).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {(Object.entries(categoryCounts) as [AppCategory, number][])
                                      .sort((a, b) => b[1] - a[1])
                                      .map(([cat, count]) => (
                                        <CategoryBadge key={cat} category={cat} count={count} />
                                      ))
                                    }
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
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
                <h4 className="text-sm font-medium mb-3">Screenshots Timeline</h4>
                {isLoadingScreenshots ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : sessionScreenshots && sessionScreenshots.length > 0 ? (
                  <ScrollArea className="h-[400px] pr-4">
                    <ScreenshotTimeline 
                      screenshots={sessionScreenshots}
                      onViewScreenshot={handleViewScreenshot}
                    />
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No screenshots in this session</p>
                  </div>
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
              <div className="rounded-lg overflow-hidden bg-muted border">
                <img 
                  src={fullScreenshot.imageData}
                  alt="Full screenshot"
                  className="w-full h-auto"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Capture Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(fullScreenshot.capturedAt), "MMM d, yyyy 'at' h:mm:ss a")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={fullScreenshot.activityLevel === 'active' ? 'default' : 'secondary'}
                        className={
                          fullScreenshot.activityLevel === 'active' 
                            ? 'bg-green-500 text-white' 
                            : fullScreenshot.activityLevel === 'idle'
                            ? 'bg-yellow-500 text-white'
                            : ''
                        }
                      >
                        {fullScreenshot.activityLevel === 'active' && <Activity className="h-3 w-3 mr-1" />}
                        {fullScreenshot.activityLevel === 'idle' && <Coffee className="h-3 w-3 mr-1" />}
                        {fullScreenshot.activityLevel}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Detected Applications</h4>
                  {fullScreenshot.detectedApps && fullScreenshot.detectedApps.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        const categoryCounts = fullScreenshot.detectedApps.reduce((acc, app) => {
                          const cat = getAppCategory(app);
                          acc[cat] = (acc[cat] || 0) + 1;
                          return acc;
                        }, {} as Record<AppCategory, number>);

                        return (
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(categoryCounts) as [AppCategory, number][])
                              .sort((a, b) => b[1] - a[1])
                              .map(([cat, count]) => (
                                <CategoryBadge key={cat} category={cat} count={count} />
                              ))
                            }
                          </div>
                        );
                      })()}
                      <Separator className="my-2" />
                      <div className="flex flex-wrap gap-1">
                        {fullScreenshot.detectedApps.map(app => (
                          <Badge key={app} variant="outline" className="text-xs">
                            {app}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No applications detected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LivePreviewViewer
        open={showLivePreview}
        onClose={() => {
          setShowLivePreview(false);
          setLivePreviewUser(null);
        }}
        targetUser={livePreviewUser}
        viewerId={user?.id || ''}
      />
    </div>
  );
}
