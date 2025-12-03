import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingDown, RefreshCw, Calendar, CheckCircle2, Clock, AlertCircle, Pause } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import type { BurndownSnapshot, Campaign } from "@shared/schema";
import { format, subDays } from "date-fns";

interface BurndownChartProps {
  campaignId?: number;
  title?: string;
  showControls?: boolean;
}

export function BurndownChart({ campaignId, title = "Burndown Chart", showControls = true }: BurndownChartProps) {
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<string>(campaignId?.toString() || "all");
  const [dateRange, setDateRange] = useState<string>("30");

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const startDate = subDays(new Date(), parseInt(dateRange));
  const campaignFilter = selectedCampaign === "all" ? undefined : parseInt(selectedCampaign);

  const { data: snapshots = [], isLoading } = useQuery<BurndownSnapshot[]>({
    queryKey: ["/api/burndown", campaignFilter, startDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campaignFilter) params.append("campaignId", campaignFilter.toString());
      params.append("startDate", startDate.toISOString());
      const res = await fetch(`/api/burndown?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch burndown data");
      return res.json();
    },
  });

  const { data: latestSnapshot } = useQuery<BurndownSnapshot | null>({
    queryKey: ["/api/burndown/latest", campaignFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campaignFilter) params.append("campaignId", campaignFilter.toString());
      const res = await fetch(`/api/burndown/latest?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch latest snapshot");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/burndown/generate", {
        method: "POST",
        body: JSON.stringify({ campaignId: campaignFilter }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/burndown"] });
      toast({ title: "Snapshot generated", description: "New burndown snapshot has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to generate snapshot", variant: "destructive" });
    },
  });

  const chartData = snapshots
    .slice()
    .reverse()
    .map(snap => ({
      date: format(new Date(snap.snapshotDate), "MMM d"),
      fullDate: format(new Date(snap.snapshotDate), "MMM d, yyyy HH:mm"),
      total: snap.totalTasks,
      completed: snap.completedTasks,
      remaining: snap.totalTasks - snap.completedTasks,
      inProgress: snap.inProgressTasks,
      blocked: snap.blockedTasks,
      pending: snap.pendingTasks,
    }));

  const completionRate = latestSnapshot && latestSnapshot.totalTasks > 0
    ? Math.round((latestSnapshot.completedTasks / latestSnapshot.totalTasks) * 100)
    : 0;

  const velocity = chartData.length >= 2
    ? chartData[chartData.length - 1].completed - chartData[0].completed
    : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>
            Track task completion progress over time
          </CardDescription>
        </div>
        {showControls && (
          <div className="flex items-center gap-2">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-[180px]" data-testid="select-burndown-campaign">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[120px]" data-testid="select-burndown-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              data-testid="button-generate-snapshot"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              Update
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {latestSnapshot && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </div>
              <p className="text-2xl font-bold text-green-600">{latestSnapshot.completedTasks}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Clock className="h-3 w-3" />
                In Progress
              </div>
              <p className="text-2xl font-bold text-blue-600">{latestSnapshot.inProgressTasks}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <AlertCircle className="h-3 w-3" />
                Blocked
              </div>
              <p className="text-2xl font-bold text-red-600">{latestSnapshot.blockedTasks}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                <Pause className="h-3 w-3" />
                Pending
              </div>
              <p className="text-2xl font-bold text-gray-600">{latestSnapshot.pendingTasks}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              Completion: {completionRate}%
            </Badge>
            <Badge variant={velocity > 0 ? "default" : "secondary"} className="text-sm">
              Velocity: {velocity > 0 ? "+" : ""}{velocity} tasks/{dateRange}d
            </Badge>
          </div>
          {latestSnapshot?.snapshotDate && (
            <p className="text-xs text-muted-foreground">
              Last updated: {format(new Date(latestSnapshot.snapshotDate), "MMM d, yyyy HH:mm")}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <TrendingDown className="h-12 w-12 mb-4 opacity-50" />
            <p>No burndown data available yet.</p>
            <p className="text-sm">Click "Update" to generate the first snapshot.</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="remaining"
                  name="Remaining"
                  stackId="1"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted))"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stackId="2"
                  stroke="hsl(142 76% 36%)"
                  fill="hsl(142 76% 36% / 0.3)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length > 1 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-3">Burndown Trend</h4>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="remaining"
                    name="Remaining Tasks"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="blocked"
                    name="Blocked"
                    stroke="hsl(0 84% 60%)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BurndownMiniCard({ campaignId }: { campaignId?: number }) {
  const { data: latestSnapshot } = useQuery<BurndownSnapshot | null>({
    queryKey: ["/api/burndown/latest", campaignId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (campaignId) params.append("campaignId", campaignId.toString());
      const res = await fetch(`/api/burndown/latest?${params}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  if (!latestSnapshot) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">No burndown data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completionRate = latestSnapshot.totalTasks > 0
    ? Math.round((latestSnapshot.completedTasks / latestSnapshot.totalTasks) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-medium">Progress</span>
          </div>
          <Badge variant={completionRate >= 75 ? "default" : completionRate >= 50 ? "secondary" : "outline"}>
            {completionRate}%
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-green-600">{latestSnapshot.completedTasks}</p>
            <p className="text-xs text-muted-foreground">Done</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{latestSnapshot.inProgressTasks}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div>
            <p className="text-lg font-bold text-red-600">{latestSnapshot.blockedTasks}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </div>
          <div>
            <p className="text-lg font-bold">{latestSnapshot.pendingTasks}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
