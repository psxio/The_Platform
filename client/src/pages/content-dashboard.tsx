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
import { Plus, ClipboardList, Users, Upload, Settings, FolderKanban, BarChart3, LayoutGrid, Columns3, Calendar, FileText, Image, Repeat, Clock, Download, Camera, DollarSign, Package, MoreHorizontal, ChevronDown, Rocket } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type TaskViewMode = "grid" | "kanban" | "calendar";

export default function ContentDashboard() {
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddCampaignDialogOpen, setIsAddCampaignDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("command");
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("grid");
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

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
            {activeTab === "tasks" && (
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
            {activeTab === "campaigns" && (
              <Button onClick={() => setIsAddCampaignDialogOpen(true)} data-testid="button-add-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Add Campaign
              </Button>
            )}
          </div>
        </div>

        <CreditBalanceDisplay />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center gap-2 mb-2">
            <TabsList className="inline-flex gap-1">
              <TabsTrigger value="command" className="gap-2" data-testid="tab-command">
                <Rocket className="h-4 w-4" />
                <span className="hidden sm:inline">Command</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2" data-testid="tab-tasks">
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">Tasks</span>
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2" data-testid="tab-campaigns">
                <FolderKanban className="h-4 w-4" />
                <span className="hidden sm:inline">Campaigns</span>
              </TabsTrigger>
              <TabsTrigger value="directory" className="gap-2" data-testid="tab-directory">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Team</span>
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="gap-2" data-testid="tab-deliverables">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Deliverables</span>
              </TabsTrigger>
            </TabsList>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant={["templates", "recurring", "assets", "brand-packs", "time-reports", "payments", "analytics", "settings"].includes(activeTab) ? "secondary" : "outline"} 
                  size="sm" 
                  className="gap-1"
                  data-testid="button-more-tabs"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">More</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => setActiveTab("templates")} data-testid="menu-templates">
                  <FileText className="h-4 w-4 mr-2" />
                  Templates
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("recurring")} data-testid="menu-recurring">
                  <Repeat className="h-4 w-4 mr-2" />
                  Recurring Tasks
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("assets")} data-testid="menu-assets">
                  <Image className="h-4 w-4 mr-2" />
                  Assets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("brand-packs")} data-testid="menu-brand-packs">
                  <Package className="h-4 w-4 mr-2" />
                  Brand Packs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("time-reports")} data-testid="menu-time-reports">
                  <Clock className="h-4 w-4 mr-2" />
                  Time Reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("payments")} data-testid="menu-payments">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Payments
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveTab("analytics")} data-testid="menu-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveTab("settings")} data-testid="menu-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <TabsContent value="command" className="mt-6">
            <ProductionCommandCenter />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            {taskViewMode === "grid" && <ContentTasksView />}
            {taskViewMode === "kanban" && <KanbanView />}
            {taskViewMode === "calendar" && <CalendarView />}
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <CampaignsView />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <TemplatesView />
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <RecurringTasksView />
          </TabsContent>

          <TabsContent value="directory" className="mt-6">
            <DirectoryTable />
          </TabsContent>

          <TabsContent value="deliverables" className="mt-6">
            <DeliverablesView />
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            <AssetsLibrary />
          </TabsContent>

          <TabsContent value="brand-packs" className="mt-6">
            <BrandPacksView />
          </TabsContent>

          <TabsContent value="time-reports" className="mt-6">
            <TimeReportsView />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentRequestsView />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <GoogleSheetsSync />
              
              <Separator />
              
              {/* Data Export */}
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
                      onClick={() => handleExport("csv")}
                      data-testid="button-export-csv"
                    >
                      Export as CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleExport("json")}
                      data-testid="button-export-json"
                    >
                      Export as JSON
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Admin-only settings */}
              {isAdmin && (
                <>
                  <Separator />
                  <IntegrationSettings />
                  <Separator />
                  <UserInvites />
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

        <AddContentTaskDialog
          open={isAddTaskDialogOpen}
          onOpenChange={setIsAddTaskDialogOpen}
        />
        
        <AddCampaignDialog
          open={isAddCampaignDialogOpen}
          onOpenChange={setIsAddCampaignDialogOpen}
        />
        
        <WelcomeModal />
      </div>
    </ContentAccessGuard>
  );
}
