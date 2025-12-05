import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Check, Clock, Circle, Trash2, Loader2, LayoutGrid, List, Calendar as CalendarIcon,
  FolderKanban, Settings, Users, Globe, Lock, User as UserIcon, Flag, ChevronDown,
  GripVertical, MessageSquare, CheckSquare, MoreHorizontal, Search, Filter, X, Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TeamBoard, TeamTask, TeamTaskComment, User } from "@shared/schema";

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground", bgColor: "bg-slate-100 dark:bg-slate-800" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950/30" },
  done: { label: "Done", icon: Check, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950/30" },
};

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-600 bg-red-100 dark:bg-red-950", borderColor: "border-l-red-500" },
  high: { label: "High", color: "text-orange-600 bg-orange-100 dark:bg-orange-950", borderColor: "border-l-orange-500" },
  normal: { label: "Normal", color: "text-blue-600 bg-blue-100 dark:bg-blue-950", borderColor: "border-l-blue-500" },
  low: { label: "Low", color: "text-slate-500 bg-slate-100 dark:bg-slate-800", borderColor: "border-l-slate-400" },
};

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock, description: "Only you can see" },
  { value: "web3", label: "Web3 Team", icon: Globe, description: "Web3 role can access" },
  { value: "content", label: "Content Team", icon: Globe, description: "Content role can access" },
  { value: "all_team", label: "All Team", icon: Users, description: "Everyone can access" },
];

export default function TeamTasks() {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">("kanban");
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch boards
  const { data: boards = [], isLoading: boardsLoading } = useQuery<TeamBoard[]>({
    queryKey: ["/api/team-boards"],
    enabled: isAuthenticated,
  });

  // Auto-select first board or personal board
  useEffect(() => {
    if (boards.length > 0 && selectedBoardId === null) {
      const personalBoard = boards.find(b => b.name === "Personal");
      setSelectedBoardId(personalBoard?.id || boards[0].id);
    }
  }, [boards, selectedBoardId]);

  // Get or create personal board
  const { data: personalBoard } = useQuery<TeamBoard>({
    queryKey: ["/api/team-boards/personal"],
    enabled: isAuthenticated && boards.length === 0,
  });

  useEffect(() => {
    if (personalBoard && selectedBoardId === null) {
      setSelectedBoardId(personalBoard.id);
      queryClient.invalidateQueries({ queryKey: ["/api/team-boards"] });
    }
  }, [personalBoard, selectedBoardId]);

  // Fetch tasks for selected board
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TeamTask[]>({
    queryKey: ["/api/team-boards", selectedBoardId, "tasks"],
    enabled: !!selectedBoardId,
  });

  // Fetch all users for assignment
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
  });

  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; visibility: string; color?: string }) => {
      return apiRequest("POST", "/api/team-boards", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-boards"] });
      setCreateBoardOpen(false);
      toast({ title: "Board created" });
    },
    onError: () => {
      toast({ title: "Failed to create board", variant: "destructive" });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: Partial<TeamTask>) => {
      return apiRequest("POST", `/api/team-boards/${selectedBoardId}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-boards", selectedBoardId, "tasks"] });
      setCreateTaskOpen(false);
      toast({ title: "Task created" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<TeamTask>) => {
      return apiRequest("PATCH", `/api/team-tasks/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-boards", selectedBoardId, "tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/team-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-boards", selectedBoardId, "tasks"] });
      setTaskDetailOpen(false);
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-medium mb-2">Sign in to use Team Tasks</h2>
            <p className="text-muted-foreground mb-4">
              Create boards, collaborate with your team, and track your work.
            </p>
            <Button asChild>
              <a href="/api/login" data-testid="button-login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Board Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Boards</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCreateBoardOpen(true)}
              data-testid="button-create-board"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {boardsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
              ))
            ) : (
              boards.map(board => (
                <Button
                  key={board.id}
                  variant={selectedBoardId === board.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-auto py-2 px-3"
                  onClick={() => setSelectedBoardId(board.id)}
                  data-testid={`board-item-${board.id}`}
                >
                  <div 
                    className="w-3 h-3 rounded-sm shrink-0" 
                    style={{ backgroundColor: board.color || "#6366f1" }} 
                  />
                  <span className="truncate flex-1 text-left">{board.name}</span>
                  {board.visibility === "private" && <Lock className="w-3 h-3 text-muted-foreground" />}
                </Button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{selectedBoard?.name || "Select a board"}</h1>
              {selectedBoard && (
                <Badge variant="outline" className="text-xs">
                  {VISIBILITY_OPTIONS.find(v => v.value === selectedBoard.visibility)?.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedBoard && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBoardSettingsOpen(true)}
                    data-testid="button-board-settings"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => setCreateTaskOpen(true)}
                    data-testid="button-add-task"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters and View Switcher */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-tasks"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="list" data-testid="tab-list-view">
                  <List className="w-4 h-4 mr-1" />
                  List
                </TabsTrigger>
                <TabsTrigger value="kanban" data-testid="tab-kanban-view">
                  <LayoutGrid className="w-4 h-4 mr-1" />
                  Kanban
                </TabsTrigger>
                <TabsTrigger value="calendar" data-testid="tab-calendar-view">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4">
          {!selectedBoard ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Select a board to view tasks</p>
              </div>
            </div>
          ) : tasksLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "list" ? (
            <ListView 
              tasks={filteredTasks} 
              onTaskClick={(task) => { setSelectedTask(task); setTaskDetailOpen(true); }}
              onStatusChange={(id, status) => updateTaskMutation.mutate({ id, status: status as "todo" | "in_progress" | "done" })}
              users={allUsers}
            />
          ) : viewMode === "kanban" ? (
            <KanbanView 
              tasks={filteredTasks}
              onTaskClick={(task) => { setSelectedTask(task); setTaskDetailOpen(true); }}
              onStatusChange={(id, status) => updateTaskMutation.mutate({ id, status: status as "todo" | "in_progress" | "done" })}
            />
          ) : (
            <CalendarView 
              tasks={filteredTasks}
              onTaskClick={(task) => { setSelectedTask(task); setTaskDetailOpen(true); }}
            />
          )}
        </div>
      </div>

      {/* Create Board Dialog */}
      <CreateBoardDialog 
        open={createBoardOpen} 
        onOpenChange={setCreateBoardOpen}
        onSubmit={(data) => createBoardMutation.mutate(data)}
        isPending={createBoardMutation.isPending}
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        isPending={createTaskMutation.isPending}
        users={allUsers}
      />

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          open={taskDetailOpen}
          onOpenChange={setTaskDetailOpen}
          task={selectedTask}
          onUpdate={(data) => updateTaskMutation.mutate({ id: selectedTask.id, ...data })}
          onDelete={() => deleteTaskMutation.mutate(selectedTask.id)}
          users={allUsers}
        />
      )}

      {/* Board Settings Dialog */}
      {selectedBoard && (
        <BoardSettingsDialog
          open={boardSettingsOpen}
          onOpenChange={setBoardSettingsOpen}
          board={selectedBoard}
        />
      )}
    </div>
  );
}

// List View Component
function ListView({ 
  tasks, 
  onTaskClick, 
  onStatusChange,
  users 
}: { 
  tasks: TeamTask[]; 
  onTaskClick: (task: TeamTask) => void;
  onStatusChange: (id: number, status: string) => void;
  users: User[];
}) {
  const groupedTasks = {
    in_progress: tasks.filter(t => t.status === "in_progress"),
    todo: tasks.filter(t => t.status === "todo"),
    done: tasks.filter(t => t.status === "done"),
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
        </div>
      </div>
    );
  }

  const renderStatusGroup = (status: keyof typeof groupedTasks, tasks: TeamTask[]) => {
    if (tasks.length === 0) return null;
    const config = STATUS_CONFIG[status];
    
    return (
      <div key={status} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <config.icon className={cn("w-4 h-4", config.color)} />
          <h3 className="text-sm font-medium uppercase tracking-wide">{config.label}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
        <div className="space-y-2">
          {tasks.map(task => (
            <TaskListItem 
              key={task.id} 
              task={task} 
              onClick={() => onTaskClick(task)}
              onStatusChange={onStatusChange}
              users={users}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderStatusGroup("in_progress", groupedTasks.in_progress)}
      {renderStatusGroup("todo", groupedTasks.todo)}
      {renderStatusGroup("done", groupedTasks.done)}
    </div>
  );
}

function TaskListItem({ 
  task, 
  onClick, 
  onStatusChange,
  users 
}: { 
  task: TeamTask; 
  onClick: () => void;
  onStatusChange: (id: number, status: string) => void;
  users: User[];
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  const statusConfig = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.todo;
  const assignee = users.find(u => u.id === task.assigneeId);
  const subtasks = task.subtasks as { id: string; title: string; completed: boolean }[] || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  
  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const statusOrder = ["todo", "in_progress", "done"];
    const currentIndex = statusOrder.indexOf(task.status || "todo");
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    onStatusChange(task.id, nextStatus);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover-elevate active-elevate-2 border-l-4",
        priorityConfig.borderColor,
        task.status === "done" && "opacity-60"
      )}
      onClick={onClick}
      data-testid={`task-item-${task.id}`}
    >
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8"
          onClick={cycleStatus}
          data-testid={`button-status-${task.id}`}
        >
          <statusConfig.icon className={cn("w-5 h-5", statusConfig.color)} />
        </Button>

        <div className={cn("flex-1 min-w-0", task.status === "done" && "line-through")}>
          <p className="font-medium truncate">{task.title}</p>
          {task.description && (
            <p className="text-sm text-muted-foreground truncate">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.priority && task.priority !== "normal" && (
            <Badge variant="secondary" className={cn("text-xs", priorityConfig.color)}>
              <Flag className="w-3 h-3 mr-1" />
              {priorityConfig.label}
            </Badge>
          )}
          
          {subtasks.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <CheckSquare className="w-3 h-3 mr-1" />
              {completedSubtasks}/{subtasks.length}
            </Badge>
          )}
          
          {task.dueDate && (
            <Badge variant="outline" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString()}
            </Badge>
          )}
          
          {assignee && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="w-3 h-3" />
              </div>
              <span className="truncate max-w-[80px]">{assignee.firstName || assignee.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Kanban View Component
function KanbanView({ 
  tasks, 
  onTaskClick,
  onStatusChange 
}: { 
  tasks: TeamTask[];
  onTaskClick: (task: TeamTask) => void;
  onStatusChange: (id: number, status: string) => void;
}) {
  const [draggedTask, setDraggedTask] = useState<TeamTask | null>(null);

  const columns = [
    { id: "todo", title: "To Do", tasks: tasks.filter(t => t.status === "todo") },
    { id: "in_progress", title: "In Progress", tasks: tasks.filter(t => t.status === "in_progress") },
    { id: "done", title: "Done", tasks: tasks.filter(t => t.status === "done") },
  ];

  const handleDragStart = (e: React.DragEvent, task: TeamTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      onStatusChange(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(column => {
        const config = STATUS_CONFIG[column.id as keyof typeof STATUS_CONFIG];
        return (
          <div 
            key={column.id}
            className="flex flex-col min-w-[320px] w-[320px]"
            data-testid={`kanban-column-${column.id}`}
          >
            <div className={cn("p-4 rounded-t-xl", config.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <config.icon className={cn("w-4 h-4", config.color)} />
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                </div>
                <Badge variant="secondary" className="text-xs">{column.tasks.length}</Badge>
              </div>
            </div>
            
            <ScrollArea 
              className="flex-1 min-h-[400px] max-h-[calc(100vh-320px)] rounded-b-xl border border-t-0 bg-muted/20"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-3 space-y-3">
                {column.tasks.map(task => (
                  <KanbanCard 
                    key={task.id}
                    task={task}
                    isDragging={draggedTask?.id === task.id}
                    onDragStart={handleDragStart}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
                {column.tasks.length === 0 && (
                  <div className="py-12 text-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                    <p className="text-sm text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ 
  task, 
  isDragging,
  onDragStart, 
  onClick 
}: { 
  task: TeamTask;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: TeamTask) => void;
  onClick: () => void;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  const subtasks = task.subtasks as { id: string; title: string; completed: boolean }[] || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={onClick}
      className={cn(
        "cursor-pointer hover-elevate active-elevate-2 border-l-4",
        priorityConfig.borderColor,
        isDragging && "opacity-50 scale-95 rotate-1"
      )}
      data-testid={`kanban-card-${task.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5 cursor-grab" />
          <p className="text-sm font-medium flex-1 line-clamp-2">{task.title}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap pl-6">
          {task.priority && task.priority !== "normal" && (
            <Badge variant="secondary" className={cn("text-xs", priorityConfig.color)}>
              <Flag className="w-3 h-3 mr-1" />
              {priorityConfig.label}
            </Badge>
          )}
          
          {subtasks.length > 0 && (
            <Badge variant="outline" className="text-xs">
              <CheckSquare className="w-3 h-3 mr-1" />
              {completedSubtasks}/{subtasks.length}
            </Badge>
          )}
          
          {task.dueDate && (
            <Badge variant="outline" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Calendar View Component
function CalendarView({ 
  tasks, 
  onTaskClick 
}: { 
  tasks: TeamTask[];
  onTaskClick: (task: TeamTask) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const tasksWithDueDate = tasks.filter(t => t.dueDate);
  
  const getTasksForDay = (day: number) => {
    return tasksWithDueDate.filter(t => {
      const dueDate = new Date(t.dueDate!);
      return dueDate.getFullYear() === year && 
             dueDate.getMonth() === month && 
             dueDate.getDate() === day;
    });
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronDown className="w-4 h-4 rotate-90" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth} data-testid="button-next-month">
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-24 bg-muted/20 rounded-md" />;
          }
          
          const dayTasks = getTasksForDay(day);
          const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
          
          return (
            <div 
              key={day}
              className={cn(
                "h-24 p-1 rounded-md border overflow-hidden",
                isToday && "border-primary bg-primary/5"
              )}
              data-testid={`calendar-day-${day}`}
            >
              <div className={cn(
                "text-sm font-medium mb-1 text-center",
                isToday && "text-primary"
              )}>
                {day}
              </div>
              <div className="space-y-0.5 overflow-y-auto max-h-16">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80",
                      task.status === "done" 
                        ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                        : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    )}
                    data-testid={`calendar-task-${task.id}`}
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-muted-foreground text-center">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Create Board Dialog
function CreateBoardDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description?: string; visibility: string; color?: string }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [color, setColor] = useState("#6366f1");

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({ name: name.trim(), description: description.trim() || undefined, visibility, color });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Board</DialogTitle>
          <DialogDescription>Create a new board to organize your tasks.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Project board name"
              data-testid="input-board-name"
            />
          </div>
          
          <div>
            <Label>Description (optional)</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              data-testid="textarea-board-description"
            />
          </div>
          
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger data-testid="select-board-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-2">
              {["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"].map(c => (
                <button
                  key={c}
                  className={cn(
                    "w-8 h-8 rounded-md border-2",
                    color === c ? "border-foreground" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  data-testid={`color-${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending} data-testid="button-submit-board">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Create Task Dialog
function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isPending,
  users 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<TeamTask>) => void;
  isPending: boolean;
  users: User[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit({ 
        title: title.trim(), 
        description: description.trim() || undefined,
        priority: priority as any,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId: assigneeId || undefined,
      });
      setTitle("");
      setDescription("");
      setPriority("normal");
      setDueDate("");
      setAssigneeId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task to this board.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              data-testid="input-task-title"
            />
          </div>
          
          <div>
            <Label>Description (optional)</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              data-testid="textarea-task-description"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Input 
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                data-testid="input-task-due-date"
              />
            </div>
          </div>
          
          <div>
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger data-testid="select-task-assignee">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isPending} data-testid="button-submit-task">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Task Detail Dialog
function TaskDetailDialog({ 
  open, 
  onOpenChange, 
  task,
  onUpdate,
  onDelete,
  users 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TeamTask;
  onUpdate: (data: Partial<TeamTask>) => void;
  onDelete: () => void;
  users: User[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState<string>(task.priority || "normal");
  const [status, setStatus] = useState<string>(task.status || "todo");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || "");
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(
    (task.subtasks as any) || []
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  
  const { toast } = useToast();

  // Fetch comments
  const { data: comments = [] } = useQuery<TeamTaskComment[]>({
    queryKey: ["/api/team-tasks", task.id, "comments"],
    enabled: open,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/team-tasks/${task.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-tasks", task.id, "comments"] });
      setNewComment("");
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const handleSave = () => {
    onUpdate({
      title,
      description: description || undefined,
      priority: priority as any,
      status: status as any,
      assigneeId: assigneeId || undefined,
      subtasks,
    });
    setIsEditing(false);
  };

  const toggleSubtask = (id: string) => {
    const updated = subtasks.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    );
    setSubtasks(updated);
    onUpdate({ subtasks: updated });
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      const updated = [...subtasks, { id: Date.now().toString(), title: newSubtask.trim(), completed: false }];
      setSubtasks(updated);
      onUpdate({ subtasks: updated });
      setNewSubtask("");
    }
  };

  const removeSubtask = (id: string) => {
    const updated = subtasks.filter(s => s.id !== id);
    setSubtasks(updated);
    onUpdate({ subtasks: updated });
  };

  const assignee = users.find(u => u.id === assigneeId);
  const priorityConfig = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="text-lg font-semibold"
                data-testid="input-edit-title"
              />
            ) : (
              <DialogTitle className="pr-8">{task.title}</DialogTitle>
            )}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsEditing(!isEditing)}
                data-testid="button-toggle-edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={onDelete}
                    data-testid="button-delete-task"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Status & Priority */}
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={(v) => { setStatus(v); onUpdate({ status: v as any }); }}>
                  <SelectTrigger className="w-[140px]" data-testid="select-detail-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={priority} onValueChange={(v) => { setPriority(v); onUpdate({ priority: v as any }); }}>
                  <SelectTrigger className="w-[140px]" data-testid="select-detail-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Assignee</Label>
                <Select value={assigneeId} onValueChange={(v) => { setAssigneeId(v); onUpdate({ assigneeId: v || undefined }); }}>
                  <SelectTrigger className="w-[160px]" data-testid="select-detail-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              {isEditing ? (
                <Textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="min-h-[100px]"
                  data-testid="textarea-edit-description"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {description || "No description"}
                </p>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Subtasks ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </Label>
              <div className="space-y-2">
                {subtasks.map(subtask => (
                  <div key={subtask.id} className="flex items-center gap-2">
                    <Checkbox 
                      checked={subtask.completed}
                      onCheckedChange={() => toggleSubtask(subtask.id)}
                      data-testid={`checkbox-subtask-${subtask.id}`}
                    />
                    <span className={cn("flex-1 text-sm", subtask.completed && "line-through text-muted-foreground")}>
                      {subtask.title}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => removeSubtask(subtask.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Input 
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add subtask..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                    data-testid="input-new-subtask"
                  />
                  <Button size="sm" onClick={addSubtask} data-testid="button-add-subtask">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Comments ({comments.length})
              </Label>
              <div className="space-y-3">
                {comments.map(comment => (
                  <div key={comment.id} className="bg-muted/50 rounded-md p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-medium">
                        {users.find(u => u.id === comment.userId)?.firstName || "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
                <div className="flex items-start gap-2">
                  <Textarea 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 min-h-[60px]"
                    data-testid="textarea-new-comment"
                  />
                  <Button 
                    size="sm" 
                    onClick={() => addCommentMutation.mutate(newComment)}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                    data-testid="button-add-comment"
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {isEditing && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="button-save-changes">Save Changes</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Board Settings Dialog
function BoardSettingsDialog({ 
  open, 
  onOpenChange, 
  board 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: TeamBoard;
}) {
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [visibility, setVisibility] = useState<string>(board.visibility || "private");
  const { toast } = useToast();

  const updateBoardMutation = useMutation({
    mutationFn: async (data: Partial<TeamBoard>) => {
      return apiRequest("PATCH", `/api/team-boards/${board.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-boards"] });
      toast({ title: "Board updated" });
    },
    onError: () => {
      toast({ title: "Failed to update board", variant: "destructive" });
    },
  });

  // Fetch board members
  const { data: members = [] } = useQuery({
    queryKey: ["/api/team-boards", board.id, "members"],
    enabled: open,
  });

  const handleSave = () => {
    updateBoardMutation.mutate({ name, description, visibility: visibility as any });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Board Settings</DialogTitle>
          <DialogDescription>Configure your board settings and sharing options.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              data-testid="input-settings-name"
            />
          </div>
          
          <div>
            <Label>Description</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="textarea-settings-description"
            />
          </div>
          
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger data-testid="select-settings-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="w-4 h-4" />
                      <div>
                        <span>{opt.label}</span>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateBoardMutation.isPending} data-testid="button-save-settings">
            {updateBoardMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
