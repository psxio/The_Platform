import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Download, 
  FileText, 
  Trash2, 
  Search, 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Bot,
  Loader2,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Papa from "papaparse";
import { apiRequest } from "@/lib/queryClient";

interface WalletScreenResult {
  address: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  labels: string[];
  flags: {
    isBot: boolean;
    isSybil: boolean;
    isContract: boolean;
    isExchange: boolean;
    isNewWallet: boolean;
    lowActivity: boolean;
    highFrequencyTrader: boolean;
    airdropFarmer: boolean;
  };
  metrics: {
    txCount: number;
    firstTxDate: string | null;
    lastTxDate: string | null;
    walletAgeDays: number;
    avgTxPerDay: number;
    uniqueContractsInteracted: number;
    totalGasSpent: string;
    nftCollectionsHeld: number;
  };
  details: string;
}

interface ScreeningProgress {
  total: number;
  processed: number;
  currentAddress: string;
}

type RiskFilter = "all" | "low" | "medium" | "high" | "critical";
type SortBy = "risk" | "address" | "age" | "activity";

export default function WalletScreener() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ScreeningProgress | null>(null);
  const [results, setResults] = useState<WalletScreenResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("risk");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [chainId, setChainId] = useState<string>("1");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractAddresses = (csvFile: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(csvFile, {
        complete: (parseResults) => {
          const addresses: string[] = [];
          parseResults.data.forEach((row: unknown) => {
            if (Array.isArray(row)) {
              row.forEach((cell) => {
                if (typeof cell === "string" && cell.trim()) {
                  const cleaned = cell.trim().toLowerCase();
                  if (/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
                    addresses.push(cleaned);
                  } else if (/^[a-fA-F0-9]{40}$/.test(cleaned)) {
                    addresses.push(`0x${cleaned}`);
                  }
                }
              });
            }
          });
          const uniqueAddresses = Array.from(new Set(addresses));
          resolve(uniqueAddresses);
        },
        error: (error) => reject(error),
      });
    });
  };

  const screenWallets = useCallback(async (addresses: string[]) => {
    setIsProcessing(true);
    setResults([]);
    setProgress({ total: addresses.length, processed: 0, currentAddress: "" });

    const screenedResults: WalletScreenResult[] = [];
    const batchSize = 10;

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      try {
        const response = await apiRequest("POST", "/api/wallet-screener/batch", {
          addresses: batch,
          chainId: parseInt(chainId),
        });
        
        const batchResults = await response.json();
        screenedResults.push(...batchResults);
        
        setProgress({
          total: addresses.length,
          processed: Math.min(i + batchSize, addresses.length),
          currentAddress: batch[batch.length - 1],
        });
        
        setResults([...screenedResults]);
      } catch (error) {
        console.error("Batch screening error:", error);
        batch.forEach((addr) => {
          screenedResults.push({
            address: addr,
            riskScore: 0,
            riskLevel: "low",
            labels: ["Error fetching data"],
            flags: {
              isBot: false,
              isSybil: false,
              isContract: false,
              isExchange: false,
              isNewWallet: false,
              lowActivity: false,
              highFrequencyTrader: false,
              airdropFarmer: false,
            },
            metrics: {
              txCount: 0,
              firstTxDate: null,
              lastTxDate: null,
              walletAgeDays: 0,
              avgTxPerDay: 0,
              uniqueContractsInteracted: 0,
              totalGasSpent: "0",
              nftCollectionsHeld: 0,
            },
            details: "Failed to fetch wallet data",
          });
        });
        setResults([...screenedResults]);
      }
    }

    setIsProcessing(false);
    setProgress(null);

    const highRiskCount = screenedResults.filter(r => r.riskLevel === "high" || r.riskLevel === "critical").length;
    toast({
      title: "Screening complete",
      description: `Screened ${screenedResults.length} wallets. ${highRiskCount} flagged as high risk.`,
    });
  }, [chainId, toast]);

  const processCSV = useCallback(async (csvFile: File) => {
    try {
      const addresses = await extractAddresses(csvFile);
      if (addresses.length === 0) {
        toast({
          title: "No addresses found",
          description: "The CSV file doesn't contain valid EVM addresses",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Found addresses",
        description: `Detected ${addresses.length} unique addresses. Starting screening...`,
      });
      
      await screenWallets(addresses);
    } catch (error) {
      toast({
        title: "Error parsing CSV",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [screenWallets, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      processCSV(droppedFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  }, [processCSV, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processCSV(selectedFile);
    }
  }, [processCSV]);

  const resetScreener = useCallback(() => {
    setFile(null);
    setResults([]);
    setProgress(null);
    setSearchQuery("");
    setRiskFilter("all");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const toggleRowExpanded = useCallback((address: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(address)) {
        next.delete(address);
      } else {
        next.add(address);
      }
      return next;
    });
  }, []);

  const downloadResults = useCallback(() => {
    if (results.length === 0) return;

    const csvData = results.map((r) => ({
      address: r.address,
      risk_score: r.riskScore,
      risk_level: r.riskLevel,
      labels: r.labels.join("; "),
      is_bot: r.flags.isBot ? "Yes" : "No",
      is_sybil: r.flags.isSybil ? "Yes" : "No",
      is_contract: r.flags.isContract ? "Yes" : "No",
      is_exchange: r.flags.isExchange ? "Yes" : "No",
      is_new_wallet: r.flags.isNewWallet ? "Yes" : "No",
      low_activity: r.flags.lowActivity ? "Yes" : "No",
      high_frequency_trader: r.flags.highFrequencyTrader ? "Yes" : "No",
      airdrop_farmer: r.flags.airdropFarmer ? "Yes" : "No",
      tx_count: r.metrics.txCount,
      wallet_age_days: r.metrics.walletAgeDays,
      avg_tx_per_day: r.metrics.avgTxPerDay.toFixed(2),
      first_tx_date: r.metrics.firstTxDate || "",
      last_tx_date: r.metrics.lastTxDate || "",
      unique_contracts: r.metrics.uniqueContractsInteracted,
      total_gas_spent: r.metrics.totalGasSpent,
      nft_collections: r.metrics.nftCollectionsHeld,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet_screening_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: `Exported ${results.length} wallet screening results`,
    });
  }, [results, toast]);

  const filteredResults = results
    .filter((r) => {
      if (riskFilter !== "all" && r.riskLevel !== riskFilter) return false;
      if (searchQuery && !r.address.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "risk":
          comparison = a.riskScore - b.riskScore;
          break;
        case "address":
          comparison = a.address.localeCompare(b.address);
          break;
        case "age":
          comparison = a.metrics.walletAgeDays - b.metrics.walletAgeDays;
          break;
        case "activity":
          comparison = a.metrics.txCount - b.metrics.txCount;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

  const stats = {
    total: results.length,
    low: results.filter((r) => r.riskLevel === "low").length,
    medium: results.filter((r) => r.riskLevel === "medium").length,
    high: results.filter((r) => r.riskLevel === "high").length,
    critical: results.filter((r) => r.riskLevel === "critical").length,
    bots: results.filter((r) => r.flags.isBot).length,
    sybils: results.filter((r) => r.flags.isSybil).length,
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "medium":
        return <Shield className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getExplorerUrl = (address: string) => {
    const explorers: Record<string, string> = {
      "1": "https://etherscan.io/address/",
      "10": "https://optimistic.etherscan.io/address/",
      "56": "https://bscscan.com/address/",
      "137": "https://polygonscan.com/address/",
      "8453": "https://basescan.org/address/",
      "42161": "https://arbiscan.io/address/",
    };
    return `${explorers[chainId] || explorers["1"]}${address}`;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Wallet Screener</h1>
        <p className="text-muted-foreground">
          Screen wallet addresses for bot activity, sybil attacks, and suspicious behavior patterns
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Upload Wallet List
          </CardTitle>
          <CardDescription>
            Upload a CSV containing wallet addresses to screen them through multiple detection systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Target Chain</label>
              <Select value={chainId} onValueChange={setChainId}>
                <SelectTrigger data-testid="select-chain">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Ethereum</SelectItem>
                  <SelectItem value="10">Optimism</SelectItem>
                  <SelectItem value="56">BSC</SelectItem>
                  <SelectItem value="137">Polygon</SelectItem>
                  <SelectItem value="8453">Base</SelectItem>
                  <SelectItem value="42161">Arbitrum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
              data-testid="input-file"
            />
            {isProcessing ? (
              <div data-testid="progress-container">
                <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground mb-2" data-testid="progress-text">
                  Screening wallets... {progress?.processed || 0} / {progress?.total || 0}
                </p>
                <Progress 
                  value={progress ? (progress.processed / progress.total) * 100 : 0} 
                  className="max-w-xs mx-auto"
                  data-testid="progress-bar"
                />
                <p className="text-xs text-muted-foreground mt-2 font-mono" data-testid="progress-current">
                  {progress?.currentAddress ? `Processing: ${progress.currentAddress.slice(0, 10)}...` : ""}
                </p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Drag & drop a CSV file here, or click to select"}
                </p>
              </>
            )}
          </div>

          {file && !isProcessing && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetScreener();
                }}
                data-testid="button-reset"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Screening Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-xl font-bold" data-testid="stat-total">
                    {stats.total}
                  </div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="text-xl font-bold text-green-600" data-testid="stat-low">
                    {stats.low}
                  </div>
                  <div className="text-xs text-muted-foreground">Low Risk</div>
                </div>
                <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600" data-testid="stat-medium">
                    {stats.medium}
                  </div>
                  <div className="text-xs text-muted-foreground">Medium</div>
                </div>
                <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                  <div className="text-xl font-bold text-orange-600" data-testid="stat-high">
                    {stats.high}
                  </div>
                  <div className="text-xs text-muted-foreground">High Risk</div>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <div className="text-xl font-bold text-red-600" data-testid="stat-critical">
                    {stats.critical}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </div>
                <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                  <div className="text-xl font-bold text-purple-600" data-testid="stat-bots">
                    {stats.bots}
                  </div>
                  <div className="text-xs text-muted-foreground">Bots</div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-xl font-bold text-blue-600" data-testid="stat-sybils">
                    {stats.sybils}
                  </div>
                  <div className="text-xs text-muted-foreground">Sybils</div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={downloadResults} data-testid="button-download">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Detailed Results</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search address..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-full sm:w-48"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskFilter)}>
                    <SelectTrigger className="w-32" data-testid="select-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risks</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                    <SelectTrigger className="w-32" data-testid="select-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risk">Sort: Risk</SelectItem>
                      <SelectItem value="address">Sort: Address</SelectItem>
                      <SelectItem value="age">Sort: Age</SelectItem>
                      <SelectItem value="activity">Sort: Activity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSortAsc(!sortAsc)}
                    data-testid="button-sort-direction"
                  >
                    {sortAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredResults.map((result) => (
                    <Collapsible
                      key={result.address}
                      open={expandedRows.has(result.address)}
                      onOpenChange={() => toggleRowExpanded(result.address)}
                    >
                      <div
                        className="p-3 rounded-lg border bg-card hover-elevate"
                        data-testid={`row-wallet-${result.address.slice(0, 10)}`}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {getRiskIcon(result.riskLevel)}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono truncate">
                                    {result.address}
                                  </code>
                                  <a
                                    href={getExplorerUrl(result.address)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  {result.labels.slice(0, 3).map((label, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {label}
                                    </Badge>
                                  ))}
                                  {result.labels.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{result.labels.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <div className="text-sm font-medium">
                                  Score: {result.riskScore}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {result.metrics.txCount} txs • {result.metrics.walletAgeDays}d old
                                </div>
                              </div>
                              <Badge variant={getRiskBadgeVariant(result.riskLevel)}>
                                {result.riskLevel.toUpperCase()}
                              </Badge>
                              {expandedRows.has(result.address) ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="mt-4 pt-4 border-t space-y-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Flags
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {result.flags.isBot && (
                                  <Badge variant="destructive">Bot</Badge>
                                )}
                                {result.flags.isSybil && (
                                  <Badge variant="destructive">Sybil</Badge>
                                )}
                                {result.flags.isContract && (
                                  <Badge variant="secondary">Contract</Badge>
                                )}
                                {result.flags.isExchange && (
                                  <Badge variant="secondary">Exchange</Badge>
                                )}
                                {result.flags.isNewWallet && (
                                  <Badge variant="outline">New Wallet</Badge>
                                )}
                                {result.flags.lowActivity && (
                                  <Badge variant="outline">Low Activity</Badge>
                                )}
                                {result.flags.highFrequencyTrader && (
                                  <Badge variant="secondary">HFT</Badge>
                                )}
                                {result.flags.airdropFarmer && (
                                  <Badge variant="destructive">Airdrop Farmer</Badge>
                                )}
                                {!Object.values(result.flags).some(Boolean) && (
                                  <span className="text-sm text-muted-foreground">No flags detected</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Metrics
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Transactions</div>
                                      <div className="font-medium">{result.metrics.txCount}</div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Total transaction count</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Wallet Age</div>
                                      <div className="font-medium">{result.metrics.walletAgeDays} days</div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Days since first transaction</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Avg Tx/Day</div>
                                      <div className="font-medium">{result.metrics.avgTxPerDay.toFixed(2)}</div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Average transactions per day</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Contracts</div>
                                      <div className="font-medium">{result.metrics.uniqueContractsInteracted}</div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Unique contracts interacted with</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            {result.metrics.firstTxDate && (
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  First: {result.metrics.firstTxDate}
                                </span>
                                {result.metrics.lastTxDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last: {result.metrics.lastTxDate}
                                  </span>
                                )}
                              </div>
                            )}

                            {result.details && (
                              <p className="text-sm text-muted-foreground">
                                {result.details}
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}

                  {filteredResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p>No wallets match your filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
