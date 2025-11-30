import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  Sheet, 
  RefreshCw, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Check, 
  X, 
  Clock, 
  FileSpreadsheet,
  DollarSign,
  ClipboardList,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Settings,
  Wallet,
  Building2
} from "lucide-react";

type ConnectedSheet = {
  id: number;
  name: string;
  sheetId: string;
  sheetUrl: string | null;
  sheetType: string;
  tabName: string | null;
  description: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncMessage: string | null;
  syncDirection: string | null;
  createdAt: string | null;
};

type PayrollRecord = {
  id: number;
  entityName: string;
  walletAddress: string | null;
  inflowItem: string | null;
  amountIn: string | null;
  amountOut: string | null;
  tokenType: string | null;
  tokenAddress: string | null;
  receiver: string | null;
  rawAmount: string | null;
  sheetRowId: string | null;
  syncedAt: string | null;
};

type PayrollAggregation = {
  entityName: string;
  totalIn: number;
  totalOut: number;
  count: number;
};

type MultiColumnTask = {
  columnName: string;
  tasks: { id: number; taskDescription: string; rowIndex: number }[];
};

export default function AdminSheetsHub() {
  const { toast } = useToast();
  const [selectedSheet, setSelectedSheet] = useState<ConnectedSheet | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [newSheet, setNewSheet] = useState({
    name: "",
    sheetUrl: "",
    sheetType: "payroll",
    tabName: "",
    description: "",
    syncDirection: "both",
  });

  // Fetch connected sheets
  const { data: sheets, isLoading: sheetsLoading } = useQuery<ConnectedSheet[]>({
    queryKey: ["/api/sheets-hub"],
  });

  // Fetch payroll records for selected sheet
  const { data: payrollRecords, isLoading: payrollLoading } = useQuery<PayrollRecord[]>({
    queryKey: ["/api/sheets-hub", selectedSheet?.id, "payroll"],
    queryFn: async () => {
      if (!selectedSheet?.id || selectedSheet.sheetType !== "payroll") return [];
      const res = await fetch(`/api/sheets-hub/${selectedSheet.id}/payroll`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payroll records");
      return res.json();
    },
    enabled: !!selectedSheet?.id && selectedSheet.sheetType === "payroll",
  });

  // Fetch aggregations for selected sheet
  const { data: aggregations, isLoading: aggregationsLoading } = useQuery<PayrollAggregation[]>({
    queryKey: ["/api/sheets-hub", selectedSheet?.id, "payroll", "aggregations"],
    queryFn: async () => {
      if (!selectedSheet?.id || selectedSheet.sheetType !== "payroll") return [];
      const res = await fetch(`/api/sheets-hub/${selectedSheet.id}/payroll/aggregations`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch aggregations");
      return res.json();
    },
    enabled: !!selectedSheet?.id && selectedSheet.sheetType === "payroll",
  });

  // Fetch multi-column tasks for selected sheet
  const { data: columnTasks, isLoading: tasksLoading } = useQuery<MultiColumnTask[]>({
    queryKey: ["/api/sheets-hub", selectedSheet?.id, "tasks"],
    queryFn: async () => {
      if (!selectedSheet?.id || selectedSheet.sheetType !== "tasks") return [];
      const res = await fetch(`/api/sheets-hub/${selectedSheet.id}/tasks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!selectedSheet?.id && selectedSheet.sheetType === "tasks",
  });

  // Preview sheet mutation
  const previewMutation = useMutation({
    mutationFn: async (sheetUrl: string) => {
      const res = await apiRequest("POST", "/api/sheets-hub/preview", { sheetUrl });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sheet Found",
        description: `"${data.title}" with ${data.tabs.length} tab(s): ${data.tabs.join(", ")}`,
      });
      setNewSheet(prev => ({ ...prev, name: data.title || prev.name }));
    },
    onError: (error: Error) => {
      toast({
        title: "Cannot access sheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Connect sheet mutation
  const connectMutation = useMutation({
    mutationFn: async (sheetData: typeof newSheet) => {
      const res = await apiRequest("POST", "/api/sheets-hub", sheetData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub"] });
      setShowAddDialog(false);
      setNewSheet({
        name: "",
        sheetUrl: "",
        sheetType: "payroll",
        tabName: "",
        description: "",
        syncDirection: "both",
      });
      toast({
        title: "Sheet connected",
        description: "You can now sync data from this sheet.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to connect sheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Sync sheet mutation
  const syncMutation = useMutation({
    mutationFn: async (sheetId: number) => {
      const res = await apiRequest("POST", `/api/sheets-hub/${sheetId}/sync`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub"] });
      if (selectedSheet) {
        queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub", selectedSheet.id, "payroll"] });
        queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub", selectedSheet.id, "payroll", "aggregations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub", selectedSheet.id, "tasks"] });
      }
      toast({
        title: "Sync complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete sheet mutation
  const deleteMutation = useMutation({
    mutationFn: async (sheetId: number) => {
      await apiRequest("DELETE", `/api/sheets-hub/${sheetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub"] });
      setSelectedSheet(null);
      toast({
        title: "Sheet disconnected",
        description: "The sheet and its data have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getSyncStatusBadge = (sheet: ConnectedSheet) => {
    if (!sheet.lastSyncStatus) {
      return <Badge variant="outline">Never synced</Badge>;
    }
    switch (sheet.lastSyncStatus) {
      case "success":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Synced</Badge>;
      case "error":
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Error</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Syncing...</Badge>;
      default:
        return <Badge variant="outline">{sheet.lastSyncStatus}</Badge>;
    }
  };

  const getSheetTypeBadge = (type: string) => {
    switch (type) {
      case "payroll":
        return <Badge variant="secondary"><DollarSign className="w-3 h-3 mr-1" />Payroll</Badge>;
      case "tasks":
        return <Badge variant="secondary"><ClipboardList className="w-3 h-3 mr-1" />Tasks</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate totals for aggregations
  const totals = aggregations?.reduce(
    (acc, agg) => ({
      totalIn: acc.totalIn + agg.totalIn,
      totalOut: acc.totalOut + agg.totalOut,
      count: acc.count + agg.count,
    }),
    { totalIn: 0, totalOut: 0, count: 0 }
  ) || { totalIn: 0, totalOut: 0, count: 0 };

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/codes">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <FileSpreadsheet className="h-6 w-6" />
            Sheets Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect and sync data from Google Sheets
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-sheet">
              <Plus className="w-4 h-4 mr-2" />
              Connect Sheet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Connect Google Sheet</DialogTitle>
              <DialogDescription>
                Paste a Google Sheets URL to connect and sync data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sheetUrl">Sheet URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="sheetUrl"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={newSheet.sheetUrl}
                    onChange={(e) => setNewSheet(prev => ({ ...prev, sheetUrl: e.target.value }))}
                    data-testid="input-sheet-url"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => previewMutation.mutate(newSheet.sheetUrl)}
                    disabled={!newSheet.sheetUrl || previewMutation.isPending}
                    data-testid="button-preview-sheet"
                  >
                    {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Payroll Sheet Q4"
                  value={newSheet.name}
                  onChange={(e) => setNewSheet(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-sheet-name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sheetType">Type</Label>
                  <Select
                    value={newSheet.sheetType}
                    onValueChange={(value) => setNewSheet(prev => ({ ...prev, sheetType: value }))}
                  >
                    <SelectTrigger data-testid="select-sheet-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payroll">Payroll</SelectItem>
                      <SelectItem value="tasks">Multi-Column Tasks</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tabName">Tab Name (optional)</Label>
                  <Input
                    id="tabName"
                    placeholder="Sheet1"
                    value={newSheet.tabName}
                    onChange={(e) => setNewSheet(prev => ({ ...prev, tabName: e.target.value }))}
                    data-testid="input-tab-name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this sheet used for?"
                  value={newSheet.description}
                  onChange={(e) => setNewSheet(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => connectMutation.mutate(newSheet)}
                disabled={!newSheet.name || !newSheet.sheetUrl || connectMutation.isPending}
                data-testid="button-connect-sheet"
              >
                {connectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Connect Sheet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sheets List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connected Sheets</CardTitle>
              <CardDescription>
                {sheets?.length || 0} sheets connected
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {sheetsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : sheets?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No sheets connected yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click "Connect Sheet" to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {sheets?.map((sheet) => (
                      <button
                        key={sheet.id}
                        className={`w-full text-left p-4 hover-elevate transition-colors ${
                          selectedSheet?.id === sheet.id ? "bg-accent" : ""
                        }`}
                        onClick={() => setSelectedSheet(sheet)}
                        data-testid={`sheet-item-${sheet.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{sheet.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getSheetTypeBadge(sheet.sheetType)}
                              {getSyncStatusBadge(sheet)}
                            </div>
                            {sheet.lastSyncAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Last sync: {new Date(sheet.lastSyncAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sheet Details */}
        <div className="lg:col-span-2">
          {selectedSheet ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedSheet.name}
                    {selectedSheet.sheetUrl && (
                      <a
                        href={selectedSheet.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedSheet.description || "No description"}
                  </CardDescription>
                  <div className="flex gap-2 mt-2">
                    {getSheetTypeBadge(selectedSheet.sheetType)}
                    {getSyncStatusBadge(selectedSheet)}
                    {selectedSheet.tabName && (
                      <Badge variant="outline">Tab: {selectedSheet.tabName}</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutate(selectedSheet.id)}
                    disabled={syncMutation.isPending}
                    data-testid="button-sync-sheet"
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to disconnect this sheet? All synced data will be deleted.")) {
                        deleteMutation.mutate(selectedSheet.id);
                      }
                    }}
                    data-testid="button-delete-sheet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedSheet.sheetType === "payroll" && (
                  <Tabs defaultValue="summary">
                    <TabsList className="mb-4">
                      <TabsTrigger value="summary" data-testid="tab-summary">Summary</TabsTrigger>
                      <TabsTrigger value="records" data-testid="tab-records">Records</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="summary">
                      {aggregationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : aggregations?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">No data synced yet</p>
                          <p className="text-xs text-muted-foreground mt-1">Click "Sync Now" to pull data from the sheet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Totals Cards */}
                          <div className="grid grid-cols-3 gap-4">
                            <Card>
                              <CardContent className="pt-4">
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalIn)}</div>
                                <p className="text-xs text-muted-foreground">Total In</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.totalOut)}</div>
                                <p className="text-xs text-muted-foreground">Total Out</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <div className="text-2xl font-bold">{totals.count}</div>
                                <p className="text-xs text-muted-foreground">Total Records</p>
                              </CardContent>
                            </Card>
                          </div>
                          
                          {/* Entity Breakdown */}
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">By Entity</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Entity</TableHead>
                                    <TableHead className="text-right">In</TableHead>
                                    <TableHead className="text-right">Out</TableHead>
                                    <TableHead className="text-right">Net</TableHead>
                                    <TableHead className="text-right">#</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {aggregations?.map((agg) => (
                                    <TableRow key={agg.entityName}>
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="w-4 h-4 text-muted-foreground" />
                                          {agg.entityName}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right text-green-600">
                                        {agg.totalIn > 0 ? formatCurrency(agg.totalIn) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right text-red-600">
                                        {agg.totalOut > 0 ? formatCurrency(agg.totalOut) : "-"}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(agg.totalIn - agg.totalOut)}
                                      </TableCell>
                                      <TableCell className="text-right text-muted-foreground">
                                        {agg.count}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="records">
                      {payrollLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : payrollRecords?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">No records synced yet</p>
                        </div>
                      ) : (
                        <ScrollArea className="h-[400px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Entity</TableHead>
                                <TableHead>Wallet</TableHead>
                                <TableHead className="text-right">In</TableHead>
                                <TableHead className="text-right">Out</TableHead>
                                <TableHead>Token</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {payrollRecords?.map((record) => (
                                <TableRow key={record.id}>
                                  <TableCell className="font-medium">{record.entityName}</TableCell>
                                  <TableCell>
                                    {record.walletAddress ? (
                                      <span className="font-mono text-xs">
                                        {record.walletAddress.slice(0, 6)}...{record.walletAddress.slice(-4)}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600">
                                    {record.amountIn || "-"}
                                  </TableCell>
                                  <TableCell className="text-right text-red-600">
                                    {record.amountOut || "-"}
                                  </TableCell>
                                  <TableCell>
                                    {record.tokenType || "-"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
                
                {selectedSheet.sheetType === "tasks" && (
                  <div>
                    {tasksLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : columnTasks?.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No tasks synced yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Sync Now" to pull data from the sheet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {columnTasks?.map((column) => (
                          <Card key={column.columnName}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center justify-between">
                                {column.columnName}
                                <Badge variant="outline">{column.tasks.length}</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-[200px]">
                                <div className="space-y-2">
                                  {column.tasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="p-2 rounded border bg-muted/30 text-sm"
                                    >
                                      {task.taskDescription}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {selectedSheet.sheetType === "custom" && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Settings className="w-12 h-12 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Custom sheet type</p>
                    <p className="text-xs text-muted-foreground mt-1">Configure sync settings for this sheet type</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Sheet className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">Select a sheet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a connected sheet from the list to view its data
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
