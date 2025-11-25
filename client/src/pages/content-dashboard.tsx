import { useState } from "react";
import { ContentTasksView } from "@/components/content-tasks-view";
import { DirectoryTable } from "@/components/directory-table";
import { DeliverablesView } from "@/components/deliverables-view";
import { AddContentTaskDialog } from "@/components/add-content-task-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList, Users, Upload } from "lucide-react";

export default function ContentDashboard() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");

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
          {activeTab === "tasks" && (
            <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="tasks" className="gap-2" data-testid="tab-tasks">
              <ClipboardList className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="directory" className="gap-2" data-testid="tab-directory">
              <Users className="h-4 w-4" />
              Directory
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-2" data-testid="tab-deliverables">
              <Upload className="h-4 w-4" />
              Deliverables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-6">
            <ContentTasksView />
          </TabsContent>

          <TabsContent value="directory" className="mt-6">
            <DirectoryTable />
          </TabsContent>

          <TabsContent value="deliverables" className="mt-6">
            <DeliverablesView />
          </TabsContent>
        </Tabs>
      </div>

      <AddContentTaskDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  );
}
