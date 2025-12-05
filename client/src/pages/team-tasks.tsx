import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, Check, Clock, Circle, Trash2, Loader2, LayoutGrid, List, Calendar as CalendarIcon,
  FolderKanban, Settings, Users, Globe, Lock, User as UserIcon, Flag, ChevronDown,
  GripVertical, MessageSquare, CheckSquare, MoreHorizontal, Search, Filter, X, Edit2,
  Rocket, Lightbulb, Target, FileText, Eye, EyeOff, Shield, Layers, Bookmark, Sparkles
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

// Task type configurations
const TASK_TYPE_CONFIG = {
  executable: { 
    label: "Executable", 
    icon: Rocket, 
    color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-950",
    description: "High-priority action item"
  },
  idea: { 
    label: "Idea", 
    icon: Lightbulb, 
    color: "text-purple-600 bg-purple-100 dark:bg-purple-950",
    description: "Future improvement or backlog item"
  },
  milestone: { 
    label: "Milestone", 
    icon: Target, 
    color: "text-amber-600 bg-amber-100 dark:bg-amber-950",
    description: "Launch date or key deadline"
  },
};

// Project tag configurations with colors
const PROJECT_TAG_CONFIG: Record<string, { color: string; bgColor: string }> = {
  "Internal": { color: "text-slate-700 dark:text-slate-300", bgColor: "bg-slate-100 dark:bg-slate-800" },
  "4444 Portal": { color: "text-violet-700 dark:text-violet-300", bgColor: "bg-violet-100 dark:bg-violet-900" },
  "Fireside": { color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-900" },
  "Miggles": { color: "text-pink-700 dark:text-pink-300", bgColor: "bg-pink-100 dark:bg-pink-900" },
  "Titanium": { color: "text-cyan-700 dark:text-cyan-300", bgColor: "bg-cyan-100 dark:bg-cyan-900" },
  "PSX": { color: "text-indigo-700 dark:text-indigo-300", bgColor: "bg-indigo-100 dark:bg-indigo-900" },
  "Signals": { color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-100 dark:bg-emerald-900" },
  "RYFT": { color: "text-red-700 dark:text-red-300", bgColor: "bg-red-100 dark:bg-red-900" },
  "Tenge": { color: "text-yellow-700 dark:text-yellow-300", bgColor: "bg-yellow-100 dark:bg-yellow-900" },
  "Agency Website": { color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900" },
  "Other": { color: "text-gray-700 dark:text-gray-300", bgColor: "bg-gray-100 dark:bg-gray-800" },
};

const PROJECT_TAGS = Object.keys(PROJECT_TAG_CONFIG);

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private", icon: Lock, description: "Only you can see" },
  { value: "web3", label: "Web3 Team", icon: Globe, description: "Web3 role can access" },
  { value: "content", label: "Content Team", icon: Globe, description: "Content role can access" },
  { value: "all_team", label: "All Team", icon: Users, description: "Everyone can access" },
];

const STORAGE_KEY = "team-tasks-view-mode";
const WIP_LIMIT_DEFAULT = 5; // Default WIP limit per person

// Workload Summary Component
function WorkloadSummary({ 
  tasks, 
  users, 
  currentUserId,
  onAssigneeClick
}: { 
  tasks: TeamTask[]; 
  users: User[];
  currentUserId?: string;
  onAssigneeClick: (userId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Calculate workload per user (only active tasks - not done)
  const workloadData = users.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id);
    const activeTasks = userTasks.filter(t => t.status !== "done");
    const inProgressTasks = userTasks.filter(t => t.status === "in_progress");
    const todoTasks = userTasks.filter(t => t.status === "todo");
    const wipLimit = WIP_LIMIT_DEFAULT;
    const isOverWip = inProgressTasks.length > wipLimit;
    
    return {
      user,
      totalActive: activeTasks.length,
      inProgress: inProgressTasks.length,
      todo: todoTasks.length,
      wipLimit,
      isOverWip,
      isCurrentUser: user.id === currentUserId
    };
  }).filter(w => w.totalActive > 0).sort((a, b) => b.totalActive - a.totalActive);

  const unassignedTasks = tasks.filter(t => !t.assigneeId && t.status !== "done");
  
  if (workloadData.length === 0 && unassignedTasks.length === 0) {
    return null;
  }

  return (
    <div className="border-t">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between text-left hover-elevate"
        data-testid="button-toggle-workload"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Team Workload</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {workloadData.slice(0, 8).map(({ user, totalActive, inProgress, todo, wipLimit, isOverWip, isCurrentUser }) => (
            <button
              key={user.id}
              onClick={() => onAssigneeClick(user.id)}
              className={cn(
                "w-full p-2 rounded-md text-left hover-elevate active-elevate-2 flex items-center gap-2",
                isCurrentUser && "bg-primary/5 border border-primary/20"
              )}
              data-testid={`workload-user-${user.id}`}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserIcon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{user.firstName || user.email?.split("@")[0]}</span>
                  {isOverWip && (
                    <Badge variant="destructive" className="text-[10px] h-4">WIP</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all",
                        isOverWip ? "bg-red-500" : inProgress > 0 ? "bg-yellow-500" : "bg-primary/40"
                      )}
                      style={{ width: `${Math.min(100, (inProgress / wipLimit) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {inProgress}/{wipLimit}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px] shrink-0">{totalActive}</Badge>
            </button>
          ))}
          
          {unassignedTasks.length > 0 && (
            <button
              onClick={() => onAssigneeClick("")}
              className="w-full p-2 rounded-md text-left hover-elevate flex items-center gap-2"
              data-testid="workload-unassigned"
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                <UserIcon className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground flex-1">Unassigned</span>
              <Badge variant="outline" className="text-[10px]">{unassignedTasks.length}</Badge>
            </button>
          )}
          
          {workloadData.length > 8 && (
            <p className="text-[10px] text-muted-foreground text-center">
              +{workloadData.length - 8} more team members
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TeamTasks() {
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "list" || saved === "kanban" || saved === "calendar") {
        return saved;
      }
    }
    return "kanban";
  });
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectTagFilter, setProjectTagFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string>("none");
  const [swimlaneBy, setSwimlaneBy] = useState<"none" | "project" | "assignee" | "priority">("none");
  
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Fetch boards
  const { data: boards = [], isLoading: boardsLoading } = useQuery<TeamBoard[]>({
    queryKey: ["/api/team-boards"],
    enabled: isAuthenticated,
  });

  // Persist view mode preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

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

  // Apply quick filter presets first
  const applyQuickFilter = (filter: string) => {
    if (filter === "my-work") {
      setAssigneeFilter("me");
      setStatusFilter("all");
      setTaskTypeFilter("all");
      setProjectTagFilter("all");
    } else if (filter === "milestones") {
      setTaskTypeFilter("milestone");
      setStatusFilter("all");
      setAssigneeFilter("all");
      setProjectTagFilter("all");
    } else if (filter === "ideas") {
      setTaskTypeFilter("idea");
      setStatusFilter("all");
      setAssigneeFilter("all");
      setProjectTagFilter("all");
    } else if (filter === "executables") {
      setTaskTypeFilter("executable");
      setStatusFilter("all");
      setAssigneeFilter("all");
      setProjectTagFilter("all");
    } else {
      // Reset all filters
      setStatusFilter("all");
      setPriorityFilter("all");
      setProjectTagFilter("all");
      setAssigneeFilter("all");
      setTaskTypeFilter("all");
    }
    setQuickFilter(filter);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesProjectTag = projectTagFilter === "all" || (task as any).projectTag === projectTagFilter;
    const matchesTaskType = taskTypeFilter === "all" || (task as any).taskType === taskTypeFilter;
    const matchesAssignee = assigneeFilter === "all" || 
                           (assigneeFilter === "me" && task.assigneeId === user?.id) ||
                           (assigneeFilter === "unassigned" && !task.assigneeId) ||
                           task.assigneeId === assigneeFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesProjectTag && matchesTaskType && matchesAssignee;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setProjectTagFilter("all");
    setAssigneeFilter("all");
    setTaskTypeFilter("all");
    setQuickFilter("none");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || priorityFilter !== "all" || 
                           projectTagFilter !== "all" || assigneeFilter !== "all" || taskTypeFilter !== "all";

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
        
        {/* Workload Summary */}
        <WorkloadSummary 
          tasks={tasks}
          users={allUsers}
          currentUserId={user?.id}
          onAssigneeClick={(userId) => {
            if (userId === "") {
              setAssigneeFilter("unassigned");
            } else {
              setAssigneeFilter(userId);
            }
            setQuickFilter("none");
          }}
        />
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

          {/* Quick Filters Row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">Quick:</span>
            <Button 
              variant={quickFilter === "my-work" ? "default" : "outline"} 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => applyQuickFilter(quickFilter === "my-work" ? "none" : "my-work")}
              data-testid="quick-filter-my-work"
            >
              <UserIcon className="w-3 h-3 mr-1" />
              My Work
            </Button>
            <Button 
              variant={quickFilter === "milestones" ? "default" : "outline"} 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => applyQuickFilter(quickFilter === "milestones" ? "none" : "milestones")}
              data-testid="quick-filter-milestones"
            >
              <Target className="w-3 h-3 mr-1" />
              Milestones
            </Button>
            <Button 
              variant={quickFilter === "executables" ? "default" : "outline"} 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => applyQuickFilter(quickFilter === "executables" ? "none" : "executables")}
              data-testid="quick-filter-executables"
            >
              <Rocket className="w-3 h-3 mr-1" />
              Executables
            </Button>
            <Button 
              variant={quickFilter === "ideas" ? "default" : "outline"} 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => applyQuickFilter(quickFilter === "ideas" ? "none" : "ideas")}
              data-testid="quick-filter-ideas"
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Ideas
            </Button>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
            <div className="flex-1" />
            <Badge variant="secondary" className="text-xs">
              {filteredTasks.length} of {tasks.length} tasks
            </Badge>
          </div>

          {/* Filters and View Switcher */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 max-w-xs min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-tasks"
                />
              </div>
              
              <Select value={projectTagFilter} onValueChange={setProjectTagFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-project-filter">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {PROJECT_TAGS.map(tag => (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", PROJECT_TAG_CONFIG[tag]?.bgColor)} />
                        {tag}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-assignee-filter">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="me">Assigned to Me</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]" data-testid="select-status-filter">
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
                <SelectTrigger className="w-[120px]" data-testid="select-priority-filter">
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

            <div className="flex items-center gap-2">
              {viewMode === "kanban" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-swimlane-toggle">
                      <Layers className="w-4 h-4 mr-2" />
                      {swimlaneBy === "none" ? "Swimlanes" : `By ${swimlaneBy.charAt(0).toUpperCase() + swimlaneBy.slice(1)}`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSwimlaneBy("none")}>
                      <Check className={cn("w-4 h-4 mr-2", swimlaneBy !== "none" && "opacity-0")} />
                      No Swimlanes
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSwimlaneBy("project")}>
                      <Check className={cn("w-4 h-4 mr-2", swimlaneBy !== "project" && "opacity-0")} />
                      By Project
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSwimlaneBy("assignee")}>
                      <Check className={cn("w-4 h-4 mr-2", swimlaneBy !== "assignee" && "opacity-0")} />
                      By Assignee
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSwimlaneBy("priority")}>
                      <Check className={cn("w-4 h-4 mr-2", swimlaneBy !== "priority" && "opacity-0")} />
                      By Priority
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
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
              swimlaneBy={swimlaneBy}
              users={allUsers}
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
  const taskTypeConfig = TASK_TYPE_CONFIG[(task as any).taskType as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.executable;
  const projectTagConfig = (task as any).projectTag ? PROJECT_TAG_CONFIG[(task as any).projectTag] : null;
  const assignee = users.find(u => u.id === task.assigneeId);
  const subtasks = task.subtasks as { id: string; title: string; completed: boolean }[] || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const TaskTypeIcon = taskTypeConfig.icon;
  
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
          <div className="flex items-center gap-2 mb-0.5">
            {/* Task Type Icon */}
            <TaskTypeIcon className={cn("w-4 h-4 shrink-0", taskTypeConfig.color.split(" ")[0])} />
            <p className="font-medium truncate">{task.title}</p>
            {/* Private indicator */}
            {!(task as any).isPublic && (
              <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Project Tag */}
            {projectTagConfig && (task as any).projectTag && (
              <Badge variant="secondary" className={cn("text-xs", projectTagConfig.color, projectTagConfig.bgColor)}>
                {(task as any).projectTag}
              </Badge>
            )}
            {task.description && (
              <p className="text-sm text-muted-foreground truncate">{task.description}</p>
            )}
          </div>
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

          {/* Launch Date for milestones */}
          {(task as any).launchDate && (
            <Badge variant="secondary" className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-950">
              <Target className="w-3 h-3 mr-1" />
              {new Date((task as any).launchDate).toLocaleDateString()}
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

// Kanban View Component with Swimlanes
function KanbanView({ 
  tasks, 
  onTaskClick,
  onStatusChange,
  swimlaneBy,
  users = []
}: { 
  tasks: TeamTask[];
  onTaskClick: (task: TeamTask) => void;
  onStatusChange: (id: number, status: string) => void;
  swimlaneBy: "none" | "project" | "assignee" | "priority";
  users?: User[];
}) {
  const [draggedTask, setDraggedTask] = useState<TeamTask | null>(null);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(new Set());

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

  const toggleSwimlane = (key: string) => {
    setCollapsedSwimlanes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Group tasks by swimlane
  const getSwimlanesData = () => {
    if (swimlaneBy === "none") {
      return [{ key: "all", label: "", tasks, color: "" }];
    }

    const groups: { key: string; label: string; tasks: TeamTask[]; color?: string }[] = [];

    if (swimlaneBy === "project") {
      const projectGroups = new Map<string, TeamTask[]>();
      tasks.forEach(task => {
        const project = (task as any).projectTag || "Untagged";
        if (!projectGroups.has(project)) {
          projectGroups.set(project, []);
        }
        projectGroups.get(project)!.push(task);
      });
      PROJECT_TAGS.forEach(tag => {
        if (projectGroups.has(tag)) {
          const config = PROJECT_TAG_CONFIG[tag];
          groups.push({ 
            key: tag, 
            label: tag, 
            tasks: projectGroups.get(tag)!, 
            color: config?.bgColor
          });
        }
      });
      if (projectGroups.has("Untagged")) {
        groups.push({ key: "Untagged", label: "Untagged", tasks: projectGroups.get("Untagged")! });
      }
    } else if (swimlaneBy === "assignee") {
      const assigneeGroups = new Map<string, TeamTask[]>();
      tasks.forEach(task => {
        const assigneeId = task.assigneeId || "unassigned";
        if (!assigneeGroups.has(assigneeId)) {
          assigneeGroups.set(assigneeId, []);
        }
        assigneeGroups.get(assigneeId)!.push(task);
      });
      assigneeGroups.forEach((groupTasks, assigneeId) => {
        const user = users.find(u => u.id === assigneeId);
        groups.push({
          key: assigneeId,
          label: assigneeId === "unassigned" ? "Unassigned" : (user?.firstName || user?.email || assigneeId),
          tasks: groupTasks
        });
      });
    } else if (swimlaneBy === "priority") {
      const priorityOrder = ["urgent", "high", "normal", "low"];
      const priorityGroups = new Map<string, TeamTask[]>();
      tasks.forEach(task => {
        const priority = task.priority || "normal";
        if (!priorityGroups.has(priority)) {
          priorityGroups.set(priority, []);
        }
        priorityGroups.get(priority)!.push(task);
      });
      priorityOrder.forEach(priority => {
        if (priorityGroups.has(priority)) {
          const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
          groups.push({
            key: priority,
            label: config?.label || priority,
            tasks: priorityGroups.get(priority)!,
            color: config?.color.split(" ")[1]
          });
        }
      });
    }

    return groups;
  };

  const swimlanes = getSwimlanesData();

  // Render a standard Kanban (no swimlanes)
  if (swimlaneBy === "none") {
    const columns = [
      { id: "todo", title: "To Do", tasks: tasks.filter(t => t.status === "todo") },
      { id: "in_progress", title: "In Progress", tasks: tasks.filter(t => t.status === "in_progress") },
      { id: "done", title: "Done", tasks: tasks.filter(t => t.status === "done") },
    ];

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
                className="flex-1 min-h-[400px] max-h-[calc(100vh-400px)] rounded-b-xl border border-t-0 bg-muted/20"
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
                      users={users}
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

  // Render with swimlanes
  return (
    <div className="space-y-4 overflow-auto pb-4">
      {swimlanes.map(swimlane => {
        const isCollapsed = collapsedSwimlanes.has(swimlane.key);
        const columns = [
          { id: "todo", title: "To Do", tasks: swimlane.tasks.filter(t => t.status === "todo") },
          { id: "in_progress", title: "In Progress", tasks: swimlane.tasks.filter(t => t.status === "in_progress") },
          { id: "done", title: "Done", tasks: swimlane.tasks.filter(t => t.status === "done") },
        ];

        return (
          <div key={swimlane.key} className="border rounded-xl overflow-hidden" data-testid={`swimlane-${swimlane.key}`}>
            {/* Swimlane Header */}
            <button
              onClick={() => toggleSwimlane(swimlane.key)}
              className={cn(
                "w-full flex items-center justify-between p-3 hover-elevate",
                swimlane.color || "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={cn("w-4 h-4 transition-transform", isCollapsed && "-rotate-90")} />
                <span className="font-semibold">{swimlane.label}</span>
                <Badge variant="secondary" className="text-xs">{swimlane.tasks.length}</Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{columns[0].tasks.length} To Do</span>
                <span>·</span>
                <span>{columns[1].tasks.length} In Progress</span>
                <span>·</span>
                <span>{columns[2].tasks.length} Done</span>
              </div>
            </button>

            {/* Swimlane Content */}
            {!isCollapsed && (
              <div className="flex gap-4 p-4 overflow-x-auto bg-background/50">
                {columns.map(column => {
                  const config = STATUS_CONFIG[column.id as keyof typeof STATUS_CONFIG];
                  return (
                    <div 
                      key={column.id}
                      className="flex flex-col min-w-[280px] w-[280px]"
                    >
                      <div className={cn("p-3 rounded-t-lg", config.bgColor)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <config.icon className={cn("w-3 h-3", config.color)} />
                            <h4 className="font-medium text-xs">{column.title}</h4>
                          </div>
                          <Badge variant="secondary" className="text-xs h-5">{column.tasks.length}</Badge>
                        </div>
                      </div>
                      
                      <div 
                        className="flex-1 min-h-[150px] max-h-[300px] overflow-y-auto rounded-b-lg border border-t-0 bg-muted/10 p-2 space-y-2"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, column.id)}
                      >
                        {column.tasks.map(task => (
                          <KanbanCard 
                            key={task.id}
                            task={task}
                            isDragging={draggedTask?.id === task.id}
                            onDragStart={handleDragStart}
                            onClick={() => onTaskClick(task)}
                            compact
                            users={users}
                          />
                        ))}
                        {column.tasks.length === 0 && (
                          <div className="py-6 text-center rounded-lg border-2 border-dashed border-muted-foreground/20">
                            <p className="text-xs text-muted-foreground">Empty</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
  onClick,
  compact = false,
  users = []
}: { 
  task: TeamTask;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, task: TeamTask) => void;
  onClick: () => void;
  compact?: boolean;
  users?: User[];
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  const taskTypeConfig = TASK_TYPE_CONFIG[(task as any).taskType as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.executable;
  const projectTagConfig = (task as any).projectTag ? PROJECT_TAG_CONFIG[(task as any).projectTag] : null;
  const subtasks = task.subtasks as { id: string; title: string; completed: boolean }[] || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;
  const TaskTypeIcon = taskTypeConfig.icon;
  const assignee = users.find(u => u.id === task.assigneeId);

  // Compact version for swimlanes
  if (compact) {
    return (
      <Card
        draggable
        onDragStart={(e) => onDragStart(e, task)}
        onClick={onClick}
        className={cn(
          "cursor-pointer hover-elevate active-elevate-2 border-l-2",
          priorityConfig.borderColor,
          isDragging && "opacity-50 scale-95 rotate-1"
        )}
        data-testid={`kanban-card-${task.id}`}
      >
        <CardContent className="p-2 space-y-1.5">
          <div className="flex items-start gap-1.5">
            <TaskTypeIcon className={cn("w-3 h-3 shrink-0 mt-0.5", taskTypeConfig.color.split(" ")[0])} />
            <p className="text-xs font-medium line-clamp-2 flex-1">{task.title}</p>
            {!(task as any).isPublic && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 justify-between">
            <div className="flex items-center gap-1">
              {task.dueDate && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
            {assignee && (
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0" title={assignee.firstName || assignee.email}>
                <UserIcon className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

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
          <TaskTypeIcon className={cn("w-4 h-4 shrink-0 mt-0.5", taskTypeConfig.color.split(" ")[0])} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2">{task.title}</p>
            {!(task as any).isPublic && (
              <div className="flex items-center gap-1 mt-1">
                <Lock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Private</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pl-6">
          {/* Project Tag */}
          {projectTagConfig && (task as any).projectTag && (
            <Badge variant="secondary" className={cn("text-xs", projectTagConfig.color, projectTagConfig.bgColor)}>
              {(task as any).projectTag}
            </Badge>
          )}

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

          {/* Launch Date for milestones */}
          {(task as any).launchDate && (
            <Badge variant="secondary" className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-950">
              <Target className="w-3 h-3 mr-1" />
              {new Date((task as any).launchDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Badge>
          )}
          
          {task.dueDate && (
            <Badge variant="outline" className="text-xs">
              <CalendarIcon className="w-3 h-3 mr-1" />
              {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Badge>
          )}
          
          {/* Spacer */}
          <div className="flex-1" />
          
          {/* Assignee Avatar */}
          {assignee && (
            <div 
              className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20" 
              title={assignee.firstName || assignee.email}
              data-testid={`card-assignee-${task.id}`}
            >
              <UserIcon className="w-3 h-3" />
            </div>
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
  const [taskType, setTaskType] = useState("executable");
  const [projectTag, setProjectTag] = useState("");
  const [richNotes, setRichNotes] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit({ 
        title: title.trim(), 
        description: description.trim() || undefined,
        priority: priority as any,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assigneeId: assigneeId || undefined,
        taskType: taskType as any,
        projectTag: projectTag || undefined,
        richNotes: richNotes.trim() || undefined,
        launchDate: launchDate ? new Date(launchDate) : undefined,
        isPublic,
      });
      setTitle("");
      setDescription("");
      setPriority("normal");
      setDueDate("");
      setAssigneeId("");
      setTaskType("executable");
      setProjectTag("");
      setRichNotes("");
      setLaunchDate("");
      setIsPublic(true);
    }
  };

  const selectedTaskType = TASK_TYPE_CONFIG[taskType as keyof typeof TASK_TYPE_CONFIG];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task to this board.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Task Type Selection */}
          <div>
            <Label className="mb-2 block">Task Type</Label>
            <div className="flex gap-2">
              {Object.entries(TASK_TYPE_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Button
                    key={key}
                    type="button"
                    variant={taskType === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTaskType(key)}
                    className="flex items-center gap-2"
                    data-testid={`task-type-${key}`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedTaskType?.description}</p>
          </div>

          {/* Project Tag */}
          <div>
            <Label>Project</Label>
            <Select value={projectTag || "none"} onValueChange={(v) => setProjectTag(v === "none" ? "" : v)}>
              <SelectTrigger data-testid="select-project-tag">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {PROJECT_TAGS.map(tag => {
                  const config = PROJECT_TAG_CONFIG[tag];
                  return (
                    <SelectItem key={tag} value={tag}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", config.bgColor)} />
                        {tag}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

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
              rows={2}
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

          {/* Launch Date (for milestones) */}
          {taskType === "milestone" && (
            <div>
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                Launch Date
              </Label>
              <Input 
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                data-testid="input-launch-date"
              />
              <p className="text-xs text-muted-foreground mt-1">This date will appear in the launch calendar</p>
            </div>
          )}
          
          <div>
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger data-testid="select-task-assignee">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rich Notes (for ideas with detailed documentation) */}
          {taskType === "idea" && (
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                Detailed Notes
              </Label>
              <Textarea 
                value={richNotes}
                onChange={(e) => setRichNotes(e.target.value)}
                placeholder="Add detailed documentation, requirements, or context for this idea..."
                rows={4}
                data-testid="textarea-rich-notes"
              />
            </div>
          )}

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {isPublic ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{isPublic ? "Visible to Team" : "Private Task"}</p>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? "All team members can see this task" : "Only you and assignees can see this"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsPublic(!isPublic)}
              data-testid="toggle-visibility"
            >
              {isPublic ? "Make Private" : "Make Public"}
            </Button>
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
  const [taskType, setTaskType] = useState<string>((task as any).taskType || "executable");
  const [projectTag, setProjectTag] = useState<string>((task as any).projectTag || "");
  const [richNotes, setRichNotes] = useState<string>((task as any).richNotes || "");
  const [launchDate, setLaunchDate] = useState<string>(
    (task as any).launchDate ? new Date((task as any).launchDate).toISOString().split('T')[0] : ""
  );
  const [isPublic, setIsPublic] = useState<boolean>((task as any).isPublic !== false);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>(
    (task.subtasks as any) || []
  );
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  
  const { toast } = useToast();

  const { user } = useAuth();
  
  // Fetch comments
  const { data: comments = [] } = useQuery<TeamTaskComment[]>({
    queryKey: ["/api/team-tasks", task.id, "comments"],
    enabled: open,
  });

  // Fetch watchers for the task
  const { data: watcherData = [] } = useQuery<any[]>({
    queryKey: ["/api/task-watchers", "team", task.id],
    enabled: open,
  });

  // Check if current user is watching
  const isWatching = watcherData.some((w: any) => w.userId === user?.id);

  // Watch mutation
  const watchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/task-watchers/team/${task.id}/watch`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-watchers", "team", task.id] });
      toast({ title: "You're now watching this task" });
    },
    onError: () => {
      toast({ title: "Failed to watch task", variant: "destructive" });
    },
  });

  // Unwatch mutation
  const unwatchMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/task-watchers/team/${task.id}/watch`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/task-watchers", "team", task.id] });
      toast({ title: "You've stopped watching this task" });
    },
    onError: () => {
      toast({ title: "Failed to unwatch task", variant: "destructive" });
    },
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
      taskType: taskType as any,
      projectTag: projectTag || undefined,
      richNotes: richNotes || undefined,
      launchDate: launchDate ? new Date(launchDate) : undefined,
      isPublic,
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
            {/* Task Type & Project Tag Header */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Task Type Badge */}
              {(() => {
                const config = TASK_TYPE_CONFIG[taskType as keyof typeof TASK_TYPE_CONFIG] || TASK_TYPE_CONFIG.executable;
                const Icon = config.icon;
                return (
                  <Badge variant="secondary" className={cn("text-sm", config.color)}>
                    <Icon className="w-4 h-4 mr-1" />
                    {config.label}
                  </Badge>
                );
              })()}
              
              {/* Project Tag Badge */}
              {projectTag && PROJECT_TAG_CONFIG[projectTag] && (
                <Badge variant="secondary" className={cn("text-sm", PROJECT_TAG_CONFIG[projectTag].color, PROJECT_TAG_CONFIG[projectTag].bgColor)}>
                  {projectTag}
                </Badge>
              )}

              {/* Launch Date Badge */}
              {launchDate && (
                <Badge variant="secondary" className="text-sm text-amber-600 bg-amber-100 dark:bg-amber-950">
                  <Target className="w-4 h-4 mr-1" />
                  Launch: {new Date(launchDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Badge>
              )}

              {/* Visibility Badge */}
              <Badge variant="outline" className="text-sm">
                {isPublic ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-1" />
                    Private
                  </>
                )}
              </Badge>

              {/* Watch Button */}
              <Button
                variant={isWatching ? "default" : "outline"}
                size="sm"
                onClick={() => isWatching ? unwatchMutation.mutate() : watchMutation.mutate()}
                disabled={watchMutation.isPending || unwatchMutation.isPending}
                className="ml-auto"
                data-testid="button-watch-task"
              >
                {isWatching ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Watching
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    Watch
                  </>
                )}
              </Button>
            </div>

            {/* Watchers */}
            {watcherData.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Watchers:</span>
                <div className="flex -space-x-2">
                  {watcherData.slice(0, 5).map((watcher: any) => {
                    const watcherUser = users.find(u => u.id === watcher.userId);
                    return (
                      <div
                        key={watcher.id}
                        className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                        title={watcherUser?.firstName || watcherUser?.email || "Unknown"}
                      >
                        <UserIcon className="w-3 h-3" />
                      </div>
                    );
                  })}
                  {watcherData.length > 5 && (
                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                      <span className="text-xs">+{watcherData.length - 5}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status & Priority */}
            <div className="flex items-center gap-4 flex-wrap">
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
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Task Type, Project, and Visibility (Editable) */}
            {isEditing && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Task Settings
                </h4>
                
                {/* Task Type */}
                <div>
                  <Label className="text-xs text-muted-foreground">Task Type</Label>
                  <div className="flex gap-2 mt-1">
                    {Object.entries(TASK_TYPE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <Button
                          key={key}
                          type="button"
                          variant={taskType === key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaskType(key)}
                          className="flex items-center gap-2"
                        >
                          <Icon className="w-4 h-4" />
                          {config.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Project Tag */}
                <div>
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <Select value={projectTag || "none"} onValueChange={(v) => setProjectTag(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-detail-project">
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project</SelectItem>
                      {PROJECT_TAGS.map(tag => {
                        const config = PROJECT_TAG_CONFIG[tag];
                        return (
                          <SelectItem key={tag} value={tag}>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-2 h-2 rounded-full", config.bgColor)} />
                              {tag}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Launch Date (for milestones) */}
                {taskType === "milestone" && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Target className="w-3 h-3 text-amber-600" />
                      Launch Date
                    </Label>
                    <Input 
                      type="date"
                      value={launchDate}
                      onChange={(e) => setLaunchDate(e.target.value)}
                      data-testid="input-detail-launch-date"
                    />
                  </div>
                )}

                {/* Visibility */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {isPublic ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    <div>
                      <p className="text-sm font-medium">{isPublic ? "Visible to Team" : "Private Task"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isPublic ? "All team members can see this task" : "Only you and assignees can see this"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPublic(!isPublic)}
                  >
                    {isPublic ? "Make Private" : "Make Public"}
                  </Button>
                </div>
              </div>
            )}

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

            {/* Rich Notes (for ideas) */}
            {(taskType === "idea" || richNotes) && (
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3 text-purple-600" />
                  Detailed Notes
                </Label>
                {isEditing ? (
                  <Textarea 
                    value={richNotes}
                    onChange={(e) => setRichNotes(e.target.value)}
                    placeholder="Add detailed documentation, requirements, or context..."
                    className="min-h-[120px]"
                    data-testid="textarea-edit-rich-notes"
                  />
                ) : richNotes ? (
                  <div className="mt-1 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-md border border-purple-200 dark:border-purple-800">
                    <p className="text-sm whitespace-pre-wrap">{richNotes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 italic">No detailed notes</p>
                )}
              </div>
            )}

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
