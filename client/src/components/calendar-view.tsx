import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContentTask, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, 
  ChevronRight, 
  User as UserIcon, 
  Building2, 
  Flag,
  Calendar as CalendarIcon
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO
} from "date-fns";
import { cn } from "@/lib/utils";
import { TaskDetailsDialog } from "./task-details-dialog";
import { AddContentTaskDialog } from "./add-content-task-dialog";

const priorityConfig = {
  low: { className: "bg-muted text-muted-foreground border-muted" },
  medium: { className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  high: { className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  urgent: { className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const statusConfig = {
  "TO BE STARTED": { dot: "bg-muted-foreground" },
  "IN PROGRESS": { dot: "bg-primary" },
  "COMPLETED": { dot: "bg-emerald-500" },
};

function parseTaskDate(dueDate: string | null | undefined): Date | null {
  if (!dueDate) return null;
  try {
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

interface CalendarDayProps {
  date: Date;
  tasks: ContentTask[];
  currentMonth: Date;
  onTaskClick: (task: ContentTask) => void;
}

function CalendarDay({ date, tasks, currentMonth, onTaskClick }: CalendarDayProps) {
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isCurrentDay = isToday(date);

  return (
    <div 
      className={cn(
        "min-h-[100px] p-1 border-r border-b",
        !isCurrentMonth && "bg-muted/30"
      )}
      data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span 
          className={cn(
            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
            isCurrentDay && "bg-primary text-primary-foreground",
            !isCurrentMonth && "text-muted-foreground"
          )}
        >
          {format(date, 'd')}
        </span>
        {tasks.length > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1">
            {tasks.length}
          </Badge>
        )}
      </div>
      <ScrollArea className="h-[70px]">
        <div className="space-y-1">
          {tasks.slice(0, 3).map((task) => {
            const priorityStyle = priorityConfig[(task.priority || "medium") as keyof typeof priorityConfig];
            const statusStyle = statusConfig[task.status as keyof typeof statusConfig] || statusConfig["TO BE STARTED"];
            
            return (
              <div
                key={task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskClick(task);
                }}
                className={cn(
                  "text-xs p-1 rounded cursor-pointer truncate flex items-center gap-1 hover-elevate",
                  priorityStyle.className
                )}
                title={task.description}
                data-testid={`calendar-task-${task.id}`}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusStyle.dot)} />
                <span className="truncate">{task.description}</span>
              </div>
            );
          })}
          {tasks.length > 3 && (
            <div className="text-xs text-muted-foreground pl-2">
              +{tasks.length - 3} more
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewingTask, setViewingTask] = useState<ContentTask | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ContentTask | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: tasks, isLoading } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = monthStart.getDay();
    const endDayOfWeek = monthEnd.getDay();
    
    const prevMonthDays = [];
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(monthStart);
      date.setDate(date.getDate() - i - 1);
      prevMonthDays.push(date);
    }
    
    const nextMonthDays = [];
    for (let i = 1; i < 7 - endDayOfWeek; i++) {
      const date = new Date(monthEnd);
      date.setDate(date.getDate() + i);
      nextMonthDays.push(date);
    }
    
    return [...prevMonthDays, ...days, ...nextMonthDays];
  }, [monthStart, monthEnd]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, ContentTask[]> = {};
    tasks?.forEach((task) => {
      const date = parseTaskDate(task.dueDate);
      if (date) {
        const key = format(date, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [tasks]);

  const handleTaskClick = (task: ContentTask) => {
    setViewingTask(task);
    setIsDetailsDialogOpen(true);
  };

  const handleTaskEdit = (task: ContentTask) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setViewingTask(null);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToToday}
                data-testid="button-calendar-today"
              >
                Today
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToPreviousMonth}
                data-testid="button-calendar-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={goToNextMonth}
                data-testid="button-calendar-next"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day) => (
                <div 
                  key={day} 
                  className="p-2 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((date, index) => (
                <CalendarDay
                  key={index}
                  date={date}
                  tasks={tasksByDate[format(date, 'yyyy-MM-dd')] || []}
                  currentMonth={currentMonth}
                  onTaskClick={handleTaskClick}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <TaskDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={handleDetailsDialogClose}
        task={viewingTask}
        onEdit={handleTaskEdit}
        currentUserId={currentUser?.id}
      />

      <AddContentTaskDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        task={editingTask || undefined}
      />
    </div>
  );
}
