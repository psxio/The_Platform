import { useState } from "react";
import { ContentTasksView } from "@/components/content-tasks-view";
import { DirectoryTable } from "@/components/directory-table";
import { DeliverablesView } from "@/components/deliverables-view";
import { GoogleSheetsSync } from "@/components/google-sheets-sync";
import { CampaignsView } from "@/components/campaigns-view";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { KanbanView } from "@/components/kanban-view";
import { CalendarView } from "@/components/calendar-view";
import { TemplatesView } from "@/components/templates-view";
import { AssetsLibrary } from "@/components/assets-library";
import { RecurringTasksView } from "@/components/recurring-tasks-view";
import { TimeReportsView } from "@/components/time-reports-view";
import { PaymentRequestsView } from "@/components/payment-requests-view";
import { BrandPacksView } from "@/components/brand-packs-view";
import { ContentIdeasManageView } from "@/components/content-ideas-manage-view";
import { CreditBalanceDisplay } from "@/components/credit-balance-display";
import { AddContentTaskDialog } from "@/components/add-content-task-dialog";
import { AddCampaignDialog } from "@/components/add-campaign-dialog";
import { WelcomeModal } from "@/components/welcome-modal";
import { IntegrationSettings } from "@/components/integration-settings";
import { UserInvites } from "@/components/user-invites";
import { ContentAccessGuard } from "@/components/content-access-guard";
import { ProductionCommandCenter } from "@/components/production-command-center";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  ClipboardList, 
  Users, 
  Upload, 
  Settings, 
  FolderKanban, 
  BarChart3, 
  LayoutGrid, 
  Columns3, 
  Calendar, 
  FileText, 
  Image, 
  Repeat, 
  Clock, 
  Download, 
  Camera, 
  DollarSign, 
  Package, 
  Rocket, 
  Lightbulb,
  Briefcase,
  Library,
  TrendingUp,
  Cog,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type TaskViewMode = "grid" | "kanban" | "calendar";
type MainGroup = "work" | "team" | "library" | "reports" | "settings";

const GROUP_CONFIG = {
  work: {
    label: "Work",
    icon: Briefcase,
    subTabs: ["command", "tasks", "campaigns", "ideas"] as const,
    default: "command",
  },
  team: {
    label: "Team",
    icon: Users,
    subTabs: ["directory", "deliverables"] as const,
    default: "directory",
  },
  library: {
    label: "Library",
    icon: Library,
    subTabs: ["assets", "brand-packs", "templates"] as const,
    default: "assets",
  },
  reports: {
    label: "Reports",
    icon: TrendingUp,
    subTabs: ["analytics", "time-reports", "payments", "recurring"] as const,
    default: "analytics",
  },
  settings: {
    label: "Settings",
    icon: Cog,
    subTabs: ["settings"] as const,
    default: "settings",
  },
};

const SUB_TAB_LABELS: Record<string, { label: string; icon: any }> = {
  command: { label: "Command Center", icon: Rocket },
  tasks: { label: "Tasks", icon: ClipboardList },
  campaigns: { label: "Campaigns", icon: FolderKanban },
  ideas: { label: "Ideas", icon: Lightbulb },
  directory: { label: "Directory", icon: Users },
  deliverables: { label: "Deliverables", icon: Upload },
  assets: { label: "Assets", icon: Image },
  "brand-packs": { label: "Brand Packs", icon: Package },
  templates: { label: "Templates", icon: FileText },
  analytics: { label: "Analytics", icon: BarChart3 },
  "time-reports": { label: "Time Reports", icon: Clock },
  payments: { label: "Payments", icon: DollarSign },
  recurring: { label: "Recurring", icon: Repeat },
  settings: { label: "Settings", icon: Settings },
};

export default function ContentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddCampaignDialogOpen, setIsAddCampaignDialogOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<MainGroup>("work");
  const [activeSubTab, setActiveSubTab] = useState("tasks");
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("grid");

  const getFilteredSubTabs = (group: MainGroup) => {
    const config = GROUP_CONFIG[group];
    if (group === "work" && !isAdmin) {
      return config.subTabs.filter((tab) => tab !== "command");
    }
    return config.subTabs;
  };

  const getDefaultSubTab = (group: MainGroup) => {
    if (group === "work" && !isAdmin) {
      return "tasks";
    }
    return GROUP_CONFIG[group].default;
  };

  const handleGroupChange = (group: MainGroup) => {
    setActiveGroup(group);
    setActiveSubTab(getDefaultSubTab(group));
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const response = await fetch(`/api/content-tasks/export/${format}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: `Tasks exported as ${format.toUpperCase()}` });
    } catch {
      toast({ title: "Failed to export tasks", variant: "destructive" });
    }
  };

  const currentGroupConfig = GROUP_CONFIG[activeGroup];
  const filteredSubTabs = getFilteredSubTabs(activeGroup);
  const showSubTabs = filteredSubTabs.length > 1;

  return (
    <ContentAccessGuard>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-content-dashboard">
                Content Studio
              </h1>
              <p className="text-muted-foreground">
                Manage tasks, track assignments, and collaborate with your team
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/content/monitoring">
                <Button variant="outline" size="sm" data-testid="button-monitoring">
                  <Camera className="h-4 w-4 mr-2" />
                  Monitoring
                </Button>
              </Link>
              {activeSubTab === "tasks" && (
                <>
                  <ToggleGroup 
                    type="single" 
                    value={taskViewMode} 
                    onValueChange={(value) => value && setTaskViewMode(value as TaskViewMode)}
                    className="border rounded-md"
                    data-testid="toggle-task-view"
                  >
                    <ToggleGroupItem value="grid" aria-label="Grid view" data-testid="toggle-grid-view">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="kanban" aria-label="Kanban view" data-testid="toggle-kanban-view">
                      <Columns3 className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="calendar" aria-label="Calendar view" data-testid="toggle-calendar-view">
                      <Calendar className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <Button onClick={() => setIsAddTaskDialogOpen(true)} data-testid="button-add-task">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </>
              )}
              {activeSubTab === "campaigns" && (
                <Button onClick={() => setIsAddCampaignDialogOpen(true)} data-testid="button-add-campaign">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Campaign
                </Button>
              )}
            </div>
          </div>

          <CreditBalanceDisplay />

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
              {(Object.keys(GROUP_CONFIG) as MainGroup[]).map((group) => {
                const config = GROUP_CONFIG[group];
                const Icon = config.icon;
                const isActive = activeGroup === group;
                return (
                  <Button
                    key={group}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleGroupChange(group)}
                    className={cn(
                      "gap-2 transition-all",
                      isActive && "shadow-sm"
                    )}
                    data-testid={`group-${group}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{config.label}</span>
                  </Button>
                );
              })}
            </div>

            {showSubTabs && (
              <div className="flex items-center gap-1 border-b pb-2">
                {filteredSubTabs.map((subTab) => {
                  const tabConfig = SUB_TAB_LABELS[subTab];
                  const Icon = tabConfig.icon;
                  const isActive = activeSubTab === subTab;
                  return (
                    <Button
                      key={subTab}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSubTab(subTab)}
                      className={cn(
                        "gap-2 relative",
                        isActive && "text-primary"
                      )}
                      data-testid={`subtab-${subTab}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tabConfig.label}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary -mb-2" />
                      )}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-2">
            {activeSubTab === "command" && isAdmin && <ProductionCommandCenter />}

            {activeSubTab === "tasks" && (
              <>
                {taskViewMode === "grid" && <ContentTasksView />}
                {taskViewMode === "kanban" && <KanbanView />}
                {taskViewMode === "calendar" && <CalendarView />}
              </>
            )}

            {activeSubTab === "campaigns" && <CampaignsView />}

            {activeSubTab === "ideas" && <ContentIdeasManageView />}

            {activeSubTab === "directory" && <DirectoryTable />}

            {activeSubTab === "deliverables" && <DeliverablesView />}

            {activeSubTab === "assets" && <AssetsLibrary />}

            {activeSubTab === "brand-packs" && <BrandPacksView />}

            {activeSubTab === "templates" && <TemplatesView />}

            {activeSubTab === "analytics" && <AnalyticsDashboard />}

            {activeSubTab === "time-reports" && <TimeReportsView />}

            {activeSubTab === "payments" && <PaymentRequestsView />}

            {activeSubTab === "recurring" && <RecurringTasksView />}

            {activeSubTab === "settings" && (
              <div className="space-y-6">
                <GoogleSheetsSync />
                
                <Separator />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Data Export
                    </CardTitle>
                    <CardDescription>
                      Export all your task data for backup or analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleExport("json")}
                        data-testid="button-export-json"
                      >
                        Export JSON
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleExport("csv")}
                        data-testid="button-export-csv"
                      >
                        Export CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Separator />
                
                {isAdmin && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Integration Settings</CardTitle>
                        <CardDescription>
                          Configure external integrations for notifications
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <IntegrationSettings />
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>User Invites</CardTitle>
                        <CardDescription>
                          Manage pending user invitations
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <UserInvites />
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <WelcomeModal />
      <AddContentTaskDialog 
        open={isAddTaskDialogOpen} 
        onOpenChange={setIsAddTaskDialogOpen} 
      />
      <AddCampaignDialog
        open={isAddCampaignDialogOpen}
        onOpenChange={setIsAddCampaignDialogOpen}
      />
    </ContentAccessGuard>
  );
}
