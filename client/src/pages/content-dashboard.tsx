import { useState } from "react";
import { ContentTasksView } from "@/components/content-tasks-view";
import { DirectoryTable } from "@/components/directory-table";
import { DeliverablesView } from "@/components/deliverables-view";
import { GoogleSheetsSync } from "@/components/google-sheets-sync";
import { CampaignsView } from "@/components/campaigns-view";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { KanbanView } from "@/components/kanban-view";
import { CalendarView } from "@/components/calendar-view";
import { AddContentTaskDialog } from "@/components/add-content-task-dialog";
import { AddCampaignDialog } from "@/components/add-campaign-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, ClipboardList, Users, Upload, Settings, FolderKanban, BarChart3, LayoutGrid, Columns3, Calendar } from "lucide-react";

type TaskViewMode = "grid" | "kanban" | "calendar";

export default function ContentDashboard() {
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isAddCampaignDialogOpen, setIsAddCampaignDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>("grid");

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-content-dashboard">
              Content Tracker
            </h1>
            <p className="text-muted-foreground">
              Manage tasks, track assignments, and collaborate with your team
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
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
              <span className="hidden sm:inline">Directory</span>
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-2" data-testid="tab-deliverables">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Deliverables</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            {taskViewMode === "grid" && <ContentTasksView />}
            {taskViewMode === "kanban" && <KanbanView />}
            {taskViewMode === "calendar" && <CalendarView />}
          </TabsContent>

          <TabsContent value="campaigns" className="mt-6">
            <CampaignsView />
          </TabsContent>

          <TabsContent value="directory" className="mt-6">
            <DirectoryTable />
          </TabsContent>

          <TabsContent value="deliverables" className="mt-6">
            <DeliverablesView />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <GoogleSheetsSync />
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
    </div>
  );
}
