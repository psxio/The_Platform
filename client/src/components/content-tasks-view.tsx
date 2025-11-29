import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContentTask, User, DirectoryMember } from "@shared/schema";
import { ContentTaskCard } from "@/components/content-task-card";
import { AdvancedTaskFilters } from "@/components/advanced-task-filters";
import { BulkTaskActions } from "@/components/bulk-task-actions";
import { AddContentTaskDialog } from "@/components/add-content-task-dialog";
import { TaskDetailsDialog } from "@/components/task-details-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertCircle, Inbox, User as UserIcon, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DateRange } from "react-day-picker";

export function ContentTasksView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [editingTask, setEditingTask] = useState<ContentTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<ContentTask | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(true);

  const { data: tasks, isLoading, error } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: directoryMembers } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory-members"],
  });

  const currentUserDisplayName = (() => {
    if (!currentUser) return null;
    const directoryMember = directoryMembers?.find(
      (m) => m.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    if (directoryMember) return directoryMember.person;
    const fullName = [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || currentUser.email;
  })();

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-tasks-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load tasks. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const filteredTasks = tasks?.filter((task) => {
    if (showMyTasksOnly && currentUserDisplayName) {
      if (task.assignedTo?.toLowerCase() !== currentUserDisplayName.toLowerCase()) {
        return false;
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.description.toLowerCase().includes(query) ||
        task.assignedTo?.toLowerCase().includes(query) ||
        task.client?.toLowerCase().includes(query) ||
        task.notes?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status)) {
      return false;
    }

    if (selectedAssignees.length > 0) {
      if (!task.assignedTo || !selectedAssignees.includes(task.assignedTo)) {
        return false;
      }
    }

    if (selectedClients.length > 0) {
      if (!task.client || !selectedClients.includes(task.client)) {
        return false;
      }
    }

    if (dateRange?.from || dateRange?.to) {
      if (!task.dueDate || task.dueDate.trim() === '') return false;
      const taskDate = new Date(task.dueDate);
      if (isNaN(taskDate.getTime())) return false;
      if (dateRange.from && taskDate < dateRange.from) return false;
      if (dateRange.to && taskDate > dateRange.to) return false;
    }

    return true;
  }) || [];

  const uniqueAssignees = Array.from(new Set(tasks?.map(t => t.assignedTo).filter(Boolean))) as string[];
  const uniqueClients = Array.from(new Set(tasks?.map(t => t.client).filter(Boolean))) as string[];

  const handleStatusToggle = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleAssigneeToggle = (assignee: string) => {
    setSelectedAssignees(prev =>
      prev.includes(assignee)
        ? prev.filter(a => a !== assignee)
        : [...prev, assignee]
    );
  };

  const handleClientToggle = (client: string) => {
    setSelectedClients(prev =>
      prev.includes(client)
        ? prev.filter(c => c !== client)
        : [...prev, client]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedStatuses([]);
    setSelectedAssignees([]);
    setSelectedClients([]);
    setDateRange(undefined);
  };

  const handleTaskSelectionChange = (taskId: number, selected: boolean) => {
    setSelectedTaskIds(prev =>
      selected
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  const handleTaskClick = (task: ContentTask) => {
    setViewingTask(task);
    setIsDetailsDialogOpen(true);
  };

  const handleTaskEdit = (task: ContentTask) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setViewingTask(null);
  };

  const myTaskCount = tasks?.filter(
    (t) => t.assignedTo?.toLowerCase() === currentUserDisplayName?.toLowerCase()
  ).length || 0;

  const allTaskCount = tasks?.length || 0;

  return (
    <div className="space-y-6">
      {/* My Tasks / All Tasks Toggle */}
      <div className="flex items-center gap-2" data-testid="task-visibility-toggle">
        <Button
          variant={showMyTasksOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowMyTasksOnly(true)}
          data-testid="button-my-tasks"
        >
          <UserIcon className="h-4 w-4 mr-2" />
          My Tasks ({myTaskCount})
        </Button>
        <Button
          variant={!showMyTasksOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setShowMyTasksOnly(false)}
          data-testid="button-all-tasks"
        >
          <Users className="h-4 w-4 mr-2" />
          All Tasks ({allTaskCount})
        </Button>
      </div>

      <AdvancedTaskFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatuses={selectedStatuses}
        onStatusToggle={handleStatusToggle}
        selectedAssignees={selectedAssignees}
        onAssigneeToggle={handleAssigneeToggle}
        selectedClients={selectedClients}
        onClientToggle={handleClientToggle}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        assignees={uniqueAssignees}
        clients={uniqueClients}
        onClearFilters={handleClearFilters}
      />

      <BulkTaskActions
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
        assignees={uniqueAssignees}
      />

      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" data-testid={`skeleton-task-${i}`} />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-tasks">
            <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No tasks found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {tasks?.length === 0
                ? "Get started by creating your first task."
                : "Try adjusting your filters to see more tasks."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <ContentTaskCard 
                key={task.id} 
                task={task}
                isSelected={selectedTaskIds.includes(task.id)}
                onSelectionChange={(selected) => handleTaskSelectionChange(task.id, selected)}
                onEdit={handleTaskClick}
              />
            ))}
          </div>
        )}
      </div>

      <AddContentTaskDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        task={editingTask || undefined}
      />

      <TaskDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={handleDetailsDialogClose}
        task={viewingTask}
        onEdit={handleTaskEdit}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
