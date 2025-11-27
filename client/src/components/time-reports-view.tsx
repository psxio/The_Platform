import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContentTask, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  Clock, 
  Download, 
  Calendar as CalendarIcon, 
  FileSpreadsheet,
  BarChart3,
  Users,
  Inbox,
  AlertCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, isWithinInterval, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";

interface TimeEntry {
  id: number;
  taskId: number;
  userId: string;
  minutes: number;
  description: string | null;
  date: string;
  createdAt: string;
}

interface TimeEntryWithTask extends TimeEntry {
  task?: ContentTask;
}

export function TimeReportsView() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [groupBy, setGroupBy] = useState<"task" | "user" | "date">("task");
  const { toast } = useToast();

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: allTimeEntries, isLoading: entriesLoading, error: entriesError } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries/all"],
    queryFn: async () => {
      const res = await fetch("/api/time-entries/all", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch time entries");
      }
      return res.json();
    },
  });

  const { data: contentTasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const setPresetRange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case "this-week":
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case "last-week":
        setDateRange({ 
          from: startOfWeek(subDays(now, 7)), 
          to: endOfWeek(subDays(now, 7)) 
        });
        break;
      case "this-month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "last-30-days":
        setDateRange({ from: subDays(now, 30), to: now });
        break;
      case "all-time":
        setDateRange(undefined);
        break;
    }
  };

  const filteredEntries: TimeEntryWithTask[] = (allTimeEntries || [])
    .map((entry) => ({
      ...entry,
      task: contentTasks?.find((t) => t.id === entry.taskId),
    }))
    .filter((entry) => {
      if (!dateRange?.from && !dateRange?.to) return true;
      try {
        const entryDate = parseISO(entry.date);
        if (dateRange?.from && dateRange?.to) {
          return isWithinInterval(entryDate, { start: dateRange.from, end: dateRange.to });
        }
        if (dateRange?.from) return entryDate >= dateRange.from;
        if (dateRange?.to) return entryDate <= dateRange.to;
        return true;
      } catch {
        return false;
      }
    });

  const totalMinutes = filteredEntries.reduce((sum, e) => sum + e.minutes, 0);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const groupedEntries = () => {
    const groups: Record<string, { entries: TimeEntryWithTask[]; totalMinutes: number }> = {};

    filteredEntries.forEach((entry) => {
      let key: string;
      switch (groupBy) {
        case "task":
          key = entry.task?.description || `Task #${entry.taskId}`;
          break;
        case "user":
          key = entry.userId;
          break;
        case "date":
          key = entry.date;
          break;
        default:
          key = "Unknown";
      }

      if (!groups[key]) {
        groups[key] = { entries: [], totalMinutes: 0 };
      }
      groups[key].entries.push(entry);
      groups[key].totalMinutes += entry.minutes;
    });

    return Object.entries(groups)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Task", "Description", "Duration (minutes)", "Duration (formatted)"];
    const rows = filteredEntries.map((entry) => [
      entry.date,
      entry.task?.description || `Task #${entry.taskId}`,
      entry.description || "",
      entry.minutes.toString(),
      formatDuration(entry.minutes),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `time-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "Time report has been downloaded as CSV.",
    });
  };

  const exportToJSON = () => {
    const data = filteredEntries.map((entry) => ({
      date: entry.date,
      task: entry.task?.description || `Task #${entry.taskId}`,
      client: entry.task?.client || "",
      description: entry.description || "",
      minutes: entry.minutes,
      formattedDuration: formatDuration(entry.minutes),
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `time-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report exported",
      description: "Time report has been downloaded as JSON.",
    });
  };

  if (entriesError) {
    return (
      <Alert variant="destructive" data-testid="alert-time-reports-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load time entries. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold" data-testid="text-total-time">
                  {formatDuration(totalMinutes)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Entries</p>
                <p className="text-2xl font-bold" data-testid="text-entry-count">
                  {filteredEntries.length}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg per Entry</p>
                <p className="text-2xl font-bold" data-testid="text-avg-time">
                  {filteredEntries.length > 0 
                    ? formatDuration(Math.round(totalMinutes / filteredEntries.length))
                    : "0m"}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start" data-testid="button-date-range">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL d")} - {format(dateRange.to, "LLL d, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL d, y")
                      )
                    ) : (
                      "All time"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex flex-col">
                    <div className="flex gap-1 p-2 border-b flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => setPresetRange("this-week")}>
                        This Week
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPresetRange("last-week")}>
                        Last Week
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPresetRange("this-month")}>
                        This Month
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPresetRange("last-30-days")}>
                        Last 30 Days
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPresetRange("all-time")}>
                        All Time
                      </Button>
                    </div>
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <Label>Group By</Label>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                <SelectTrigger className="w-[160px]" data-testid="select-group-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={filteredEntries.length === 0}
                data-testid="button-export-csv"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={exportToJSON}
                disabled={filteredEntries.length === 0}
                data-testid="button-export-json"
              >
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Time Report</CardTitle>
          <CardDescription>
            {filteredEntries.length} entries · {formatDuration(totalMinutes)} total
            {dateRange?.from && dateRange?.to && (
              <> · {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entriesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" data-testid={`skeleton-report-${i}`} />
              ))}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-time-reports">
              <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No time entries</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                No time has been logged for the selected period. Track time on tasks to see reports here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedEntries().map(({ key, entries, totalMinutes: groupTotal }) => (
                <div key={key} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                      {groupBy === "task" && <Clock className="h-4 w-4" />}
                      {groupBy === "user" && <Users className="h-4 w-4" />}
                      {groupBy === "date" && <CalendarIcon className="h-4 w-4" />}
                      <span className="font-medium">
                        {groupBy === "date" && key !== "Unknown"
                          ? format(parseISO(key), "EEEE, MMM d, yyyy")
                          : key}
                      </span>
                    </div>
                    <Badge variant="secondary">{formatDuration(groupTotal)}</Badge>
                  </div>
                  
                  <div className="divide-y">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 text-sm">
                        <div className="flex-1 min-w-0">
                          {groupBy !== "task" && (
                            <p className="font-medium truncate">
                              {entry.task?.description || `Task #${entry.taskId}`}
                            </p>
                          )}
                          {groupBy !== "date" && (
                            <p className="text-muted-foreground">
                              {format(parseISO(entry.date), "MMM d, yyyy")}
                            </p>
                          )}
                          {entry.description && (
                            <p className="text-muted-foreground italic truncate">
                              {entry.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{formatDuration(entry.minutes)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
