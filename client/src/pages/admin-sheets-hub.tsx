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
import { Checkbox } from "@/components/ui/checkbox";
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
  Building2,
  TableIcon,
  LayoutGrid
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

type SheetPreview = {
  sheetId: string;
  title: string;
  tabs: string[];
};

type SelectedTab = {
  tabName: string;
  sheetType: string;
  selected: boolean;
};

export default function AdminSheetsHub() {
  const { toast } = useToast();
  const [selectedSheet, setSelectedSheet] = useState<ConnectedSheet | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetPreview, setSheetPreview] = useState<SheetPreview | null>(null);
  const [selectedTabs, setSelectedTabs] = useState<SelectedTab[]>([]);
  const [sheetDescription, setSheetDescription] = useState("");

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
  
  // Fetch generic data for data or custom type sheets
  const { data: genericSheetData, isLoading: genericDataLoading } = useQuery<{
    headers: string[];
    rows: { rowIndex: number; cells: { [column: string]: string } }[];
  }>({
    queryKey: ["/api/sheets-hub", selectedSheet?.id, "data"],
    queryFn: async () => {
      if (!selectedSheet?.id || (selectedSheet.sheetType !== "data" && selectedSheet.sheetType !== "custom")) {
        return { headers: [], rows: [] };
      }
      const res = await fetch(`/api/sheets-hub/${selectedSheet.id}/data`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch data");
      return res.json();
    },
    enabled: !!selectedSheet?.id && (selectedSheet.sheetType === "data" || selectedSheet.sheetType === "custom"),
  });

  // Preview sheet mutation
  const previewMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/sheets-hub/preview", { sheetUrl: url });
      return res.json();
    },
    onSuccess: (data: SheetPreview) => {
      setSheetPreview(data);
      // Initialize all tabs as unselected with "data" type
      setSelectedTabs(data.tabs.map(tab => ({
        tabName: tab,
        sheetType: "data",
        selected: false,
      })));
      toast({
        title: "Sheet Found",
        description: `"${data.title}" has ${data.tabs.length} tab(s). Select which ones to import.`,
      });
    },
    onError: (error: Error) => {
      setSheetPreview(null);
      setSelectedTabs([]);
      toast({
        title: "Cannot access sheet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Connect multiple tabs mutation
  const connectMutation = useMutation({
    mutationFn: async (tabsToConnect: { tabName: string; sheetType: string }[]) => {
      const results = [];
      for (const tab of tabsToConnect) {
        const res = await apiRequest("POST", "/api/sheets-hub", {
          name: `${sheetPreview?.title || "Sheet"} - ${tab.tabName}`,
          sheetUrl,
          sheetType: tab.sheetType,
          tabName: tab.tabName,
          description: sheetDescription || null,
          syncDirection: "both",
        });
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sheets-hub"] });
      setShowAddDialog(false);
      resetAddDialog();
      toast({
        title: "Tabs connected",
        description: `Successfully connected ${data.length} tab(s). Click "Sync Now" to import data.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to connect",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to reset the add dialog
  const resetAddDialog = () => {
    setSheetUrl("");
    setSheetPreview(null);
    setSelectedTabs([]);
    setSheetDescription("");
  };

  // Toggle tab selection
  const toggleTabSelection = (tabName: string) => {
    setSelectedTabs(prev => prev.map(tab => 
      tab.tabName === tabName ? { ...tab, selected: !tab.selected } : tab
    ));
  };

  // Update tab type
  const updateTabType = (tabName: string, sheetType: string) => {
    setSelectedTabs(prev => prev.map(tab => 
      tab.tabName === tabName ? { ...tab, sheetType } : tab
    ));
  };

  // Get selected tabs for connection
  const getTabsToConnect = () => selectedTabs.filter(tab => tab.selected);

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
      case "data":
        return <Badge variant="secondary"><TableIcon className="w-3 h-3 mr-1" />Data</Badge>;
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
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetAddDialog();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-sheet">
              <Plus className="w-4 h-4 mr-2" />
              Connect Sheet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Connect Google Sheet</DialogTitle>
              <DialogDescription>
                Paste a Google Sheets URL, then select which tabs to import
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Step 1: Enter URL */}
              <div className="space-y-2">
                <Label htmlFor="sheetUrl">Sheet URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="sheetUrl"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => {
                      setSheetUrl(e.target.value);
                      setSheetPreview(null);
                      setSelectedTabs([]);
                    }}
                    data-testid="input-sheet-url"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => previewMutation.mutate(sheetUrl)}
                    disabled={!sheetUrl || previewMutation.isPending}
                    data-testid="button-preview-sheet"
                  >
                    {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load Tabs"}
                  </Button>
                </div>
              </div>
              
              {/* Step 2: Show available tabs */}
              {sheetPreview && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{sheetPreview.title}</span>
                    <Badge variant="outline">{sheetPreview.tabs.length} tabs</Badge>
                  </div>
                  
                  <Label>Select tabs to import:</Label>
                  <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                    {selectedTabs.map((tab) => (
                      <div 
                        key={tab.tabName}
                        className={`flex items-center gap-3 p-3 ${tab.selected ? 'bg-accent/50' : ''}`}
                      >
                        <Checkbox
                          id={`tab-${tab.tabName}`}
                          checked={tab.selected}
                          onCheckedChange={() => toggleTabSelection(tab.tabName)}
                          data-testid={`checkbox-tab-${tab.tabName}`}
                        />
                        <label 
                          htmlFor={`tab-${tab.tabName}`}
                          className="flex-1 font-medium cursor-pointer"
                        >
                          {tab.tabName}
                        </label>
                        {tab.selected && (
                          <Select
                            value={tab.sheetType}
                            onValueChange={(value) => updateTabType(tab.tabName, value)}
                          >
                            <SelectTrigger className="w-[160px]" data-testid={`select-type-${tab.tabName}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="data">
                                <div className="flex items-center gap-2">
                                  <TableIcon className="w-3 h-3" />
                                  Auto-detect
                                </div>
                              </SelectItem>
                              <SelectItem value="payroll">
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-3 h-3" />
                                  Payroll
                                </div>
                              </SelectItem>
                              <SelectItem value="tasks">
                                <div className="flex items-center gap-2">
                                  <ClipboardList className="w-3 h-3" />
                                  Task Board
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Quick select all */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTabs(prev => prev.map(t => ({ ...t, selected: true })))}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTabs(prev => prev.map(t => ({ ...t, selected: false })))}
                    >
                      Clear
                    </Button>
                  </div>
                  
                  {/* Optional description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="What is this sheet used for?"
                      value={sheetDescription}
                      onChange={(e) => setSheetDescription(e.target.value)}
                      data-testid="input-description"
                      className="h-16"
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowAddDialog(false);
                resetAddDialog();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={() => connectMutation.mutate(getTabsToConnect())}
                disabled={getTabsToConnect().length === 0 || connectMutation.isPending}
                data-testid="button-connect-sheet"
              >
                {connectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Import {getTabsToConnect().length} Tab{getTabsToConnect().length !== 1 ? 's' : ''}
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
                
                {(selectedSheet.sheetType === "data" || selectedSheet.sheetType === "custom") && (
                  <div>
                    {genericDataLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : !genericSheetData?.headers?.length ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <TableIcon className="w-12 h-12 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No data synced yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Sync Now" to pull data from the sheet</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <ScrollArea className="h-[400px]">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b">#</th>
                                {genericSheetData.headers.map((header, idx) => (
                                  <th key={idx} className="px-3 py-2 text-left font-medium border-b">
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {genericSheetData.rows.map((row, rowIdx) => (
                                <tr 
                                  key={row.rowIndex} 
                                  className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                                >
                                  <td className="px-3 py-2 text-muted-foreground border-b">{row.rowIndex}</td>
                                  {genericSheetData.headers.map((header, colIdx) => (
                                    <td key={colIdx} className="px-3 py-2 border-b">
                                      {row.cells[header] || "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollArea>
                        <div className="px-3 py-2 bg-muted/30 border-t text-xs text-muted-foreground">
                          {genericSheetData.rows.length} rows × {genericSheetData.headers.length} columns
                        </div>
                      </div>
                    )}
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
