import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Wallet, 
  Plus, 
  RefreshCw, 
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowUpRight,
  Users,
  Shield
} from "lucide-react";

type SafeWallet = {
  id: number;
  address: string;
  chainId: number;
  label: string;
  owners: string | null;
  threshold: number | null;
  nonce: number | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
};

type SafeChain = {
  id: number;
  name: string;
};

type SafeBalance = {
  tokenAddress: string | null;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  balance: string;
  fiatBalance?: string;
};

type SafePendingTx = {
  safeTxHash: string;
  to: string;
  value: string;
  nonce: number;
  confirmationsRequired: number;
  confirmations: Array<{
    owner: string;
    submissionDate: string;
  }>;
  submissionDate: string;
  isExecuted: boolean;
  dataDecoded?: {
    method: string;
    parameters: any[];
  };
};

const CHAIN_COLORS: Record<number, string> = {
  1: "bg-blue-500",
  10: "bg-red-500",
  56: "bg-yellow-500",
  100: "bg-green-600",
  137: "bg-purple-500",
  8453: "bg-blue-600",
  42161: "bg-blue-400",
  43114: "bg-red-600",
  11155111: "bg-gray-500",
};

function formatBalance(balance: string, decimals: number): string {
  const value = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const significantFractional = fractionalStr.slice(0, 4).replace(/0+$/, "");
  
  if (significantFractional) {
    return `${integerPart.toLocaleString()}.${significantFractional}`;
  }
  return integerPart.toLocaleString();
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getExplorerUrl(address: string, chainId: number): string {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io",
    10: "https://optimistic.etherscan.io",
    56: "https://bscscan.com",
    100: "https://gnosisscan.io",
    137: "https://polygonscan.com",
    8453: "https://basescan.org",
    42161: "https://arbiscan.io",
    43114: "https://snowtrace.io",
    11155111: "https://sepolia.etherscan.io",
  };
  return `${explorers[chainId] || "https://etherscan.io"}/address/${address}`;
}

function getSafeUrl(address: string, chainId: number): string {
  const prefixes: Record<number, string> = {
    1: "eth",
    10: "oeth",
    56: "bnb",
    100: "gno",
    137: "matic",
    8453: "base",
    42161: "arb1",
    43114: "avax",
    11155111: "sep",
  };
  return `https://app.safe.global/home?safe=${prefixes[chainId] || "eth"}:${address}`;
}

export function DaoSafeWallets() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [newWallet, setNewWallet] = useState({ address: "", chainId: 1, label: "" });

  const { data: wallets, isLoading: walletsLoading } = useQuery<SafeWallet[]>({
    queryKey: ["/api/dao/safe-wallets"],
  });

  const { data: chains } = useQuery<SafeChain[]>({
    queryKey: ["/api/dao/safe-chains"],
  });

  const selectedWallet = wallets?.find(w => w.id === selectedWalletId);

  const { data: balances, isLoading: balancesLoading, refetch: refetchBalances } = useQuery<SafeBalance[]>({
    queryKey: [`/api/dao/safe-wallets/${selectedWalletId}/balances`],
    enabled: !!selectedWalletId,
  });

  const { data: pendingTxs, isLoading: pendingTxsLoading } = useQuery<SafePendingTx[]>({
    queryKey: [`/api/dao/safe-wallets/${selectedWalletId}/pending-txs`],
    enabled: !!selectedWalletId,
  });

  const addWalletMutation = useMutation({
    mutationFn: async (data: { address: string; chainId: number; label: string }) => {
      return apiRequest("POST", "/api/dao/safe-wallets", data);
    },
    onSuccess: () => {
      toast({ title: "Safe wallet connected successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/safe-wallets"] });
      setIsAddDialogOpen(false);
      setNewWallet({ address: "", chainId: 1, label: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to connect wallet",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteWalletMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/dao/safe-wallets/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Wallet removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/safe-wallets"] });
      setSelectedWalletId(null);
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/dao/safe-wallets/sync-all", {});
    },
    onSuccess: () => {
      toast({ title: "All wallets synced" });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/safe-wallets"] });
      if (selectedWalletId) {
        refetchBalances();
      }
    },
  });

  const totalBalanceUsd = balances?.reduce((sum, b) => {
    if (b.fiatBalance) {
      return sum + parseFloat(b.fiatBalance);
    }
    return sum;
  }, 0) || 0;

  const getChainName = (chainId: number) => {
    return chains?.find(c => c.id === chainId)?.name || `Chain ${chainId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Safe Wallets
          </h2>
          <p className="text-muted-foreground">
            Manage your DAO's multi-signature wallets across all chains
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            data-testid="button-sync-all"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
            Sync All
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-wallet">
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Safe Wallet</DialogTitle>
                <DialogDescription>
                  Enter the Safe wallet address and select the chain
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    placeholder="Treasury Main"
                    value={newWallet.label}
                    onChange={(e) => setNewWallet({ ...newWallet, label: e.target.value })}
                    data-testid="input-wallet-label"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Safe Address</Label>
                  <Input
                    id="address"
                    placeholder="0x..."
                    value={newWallet.address}
                    onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                    data-testid="input-wallet-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chain">Chain</Label>
                  <Select
                    value={newWallet.chainId.toString()}
                    onValueChange={(v) => setNewWallet({ ...newWallet, chainId: parseInt(v) })}
                  >
                    <SelectTrigger data-testid="select-chain">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {chains?.map((chain) => (
                        <SelectItem key={chain.id} value={chain.id.toString()}>
                          {chain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => addWalletMutation.mutate(newWallet)}
                  disabled={!newWallet.address || !newWallet.label || addWalletMutation.isPending}
                  data-testid="button-connect-wallet"
                >
                  {addWalletMutation.isPending ? "Connecting..." : "Connect Wallet"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Connected Wallets</CardTitle>
              <CardDescription>
                {wallets?.length || 0} wallets connected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {walletsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : wallets?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No wallets connected</p>
                  <p className="text-sm">Add your first Safe wallet to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {wallets?.map((wallet) => (
                      <button
                        key={wallet.id}
                        onClick={() => setSelectedWalletId(wallet.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors hover-elevate ${
                          selectedWalletId === wallet.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                        data-testid={`wallet-item-${wallet.id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{wallet.label}</span>
                          <Badge
                            variant="secondary"
                            className={`${CHAIN_COLORS[wallet.chainId] || "bg-gray-500"} text-white text-xs`}
                          >
                            {getChainName(wallet.chainId)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span className="font-mono">{shortenAddress(wallet.address)}</span>
                          <a
                            href={getSafeUrl(wallet.address, wallet.chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        {wallet.threshold && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>
                              {wallet.threshold} of {wallet.owners ? JSON.parse(wallet.owners).length : "?"} signers
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedWallet ? (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selectedWallet.label}
                    <Badge
                      variant="secondary"
                      className={`${CHAIN_COLORS[selectedWallet.chainId] || "bg-gray-500"} text-white`}
                    >
                      {getChainName(selectedWallet.chainId)}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="font-mono">
                    {selectedWallet.address}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetchBalances()}
                    data-testid="button-refresh-balances"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    asChild
                  >
                    <a
                      href={getSafeUrl(selectedWallet.address, selectedWallet.chainId)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm("Remove this wallet?")) {
                        deleteWalletMutation.mutate(selectedWallet.id);
                      }
                    }}
                    data-testid="button-delete-wallet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="balances">
                  <TabsList>
                    <TabsTrigger value="balances" data-testid="tab-balances">
                      <Coins className="h-4 w-4 mr-2" />
                      Balances
                    </TabsTrigger>
                    <TabsTrigger value="pending" data-testid="tab-pending">
                      <Clock className="h-4 w-4 mr-2" />
                      Pending ({pendingTxs?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="owners" data-testid="tab-owners">
                      <Users className="h-4 w-4 mr-2" />
                      Owners
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="balances" className="mt-4">
                    {balancesLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : balances?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Coins className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No token balances</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {totalBalanceUsd > 0 && (
                          <div className="p-4 rounded-lg bg-muted/50 mb-4">
                            <div className="text-sm text-muted-foreground">Total Value</div>
                            <div className="text-2xl font-bold">
                              ${totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                        {balances?.map((balance, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Coins className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="font-medium">{balance.tokenSymbol}</div>
                                <div className="text-sm text-muted-foreground">
                                  {balance.tokenName}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono">
                                {formatBalance(balance.balance, balance.tokenDecimals)}
                              </div>
                              {balance.fiatBalance && (
                                <div className="text-sm text-muted-foreground">
                                  ${parseFloat(balance.fiatBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="pending" className="mt-4">
                    {pendingTxsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : pendingTxs?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No pending transactions</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingTxs?.map((tx) => (
                          <div
                            key={tx.safeTxHash}
                            className="p-4 rounded-lg border space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-sm">
                                  To: {shortenAddress(tx.to)}
                                </span>
                              </div>
                              <Badge variant="outline">
                                Nonce #{tx.nonce}
                              </Badge>
                            </div>
                            {tx.value !== "0" && (
                              <div className="text-sm">
                                Value: {formatBalance(tx.value, 18)} ETH
                              </div>
                            )}
                            {tx.dataDecoded && (
                              <div className="text-sm text-muted-foreground">
                                Method: {tx.dataDecoded.method}
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <div className="flex items-center gap-1">
                                {tx.confirmations.length >= tx.confirmationsRequired ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                )}
                                <span>
                                  {tx.confirmations.length} / {tx.confirmationsRequired} confirmations
                                </span>
                              </div>
                              <a
                                href={getSafeUrl(selectedWallet.address, selectedWallet.chainId)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Sign in Safe
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="owners" className="mt-4">
                    {selectedWallet.owners ? (
                      <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-muted/50 mb-4">
                          <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            <span className="font-medium">
                              {selectedWallet.threshold} of {JSON.parse(selectedWallet.owners).length} signatures required
                            </span>
                          </div>
                        </div>
                        {JSON.parse(selectedWallet.owners).map((owner: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              <span className="font-mono text-sm">{shortenAddress(owner)}</span>
                            </div>
                            <a
                              href={getExplorerUrl(owner, selectedWallet.chainId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Owner information not available</p>
                        <p className="text-sm">Sync the wallet to load owner data</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Wallet className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">Select a wallet to view details</p>
                <p className="text-sm">Or add a new Safe wallet to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
