import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  Wallet,
  FileSearch,
  Database,
  GitCompare,
  History,
  Merge,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Coins,
  Shield,
  TrendingUp,
  Upload,
  RefreshCw,
  CopyCheck,
  Music,
} from "lucide-react";
import { format } from "date-fns";

type Collection = {
  id: number;
  name: string;
  addressCount: number;
  updatedAt: string;
};

type Comparison = {
  id: number;
  mintedFilename: string;
  eligibleFilename: string;
  mintedCount: number;
  eligibleCount: number;
  results: {
    notMinted: Array<{ address: string }>;
    alreadyMinted: string[];
    duplicates: string[];
  };
  createdAt: string;
};

type SafeWallet = {
  id: number;
  address: string;
  chainId: number;
  label: string;
  threshold: number | null;
  nonce: number | null;
  isActive: boolean;
  lastSyncedAt: string | null;
};

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BSC",
  100: "Gnosis",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
  11155111: "Sepolia",
};

function safeFormatDate(dateStr: string | null | undefined, formatStr: string = "MMM d"): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "—";
    return format(date, formatStr);
  } catch {
    return "—";
  }
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function QuickActionCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  variant = "default" 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  href: string;
  variant?: "default" | "primary";
}) {
  return (
    <Link href={href}>
      <Card className={`hover-elevate cursor-pointer h-full ${variant === "primary" ? "border-primary/20 bg-primary/5" : ""}`}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${variant === "primary" ? "bg-primary/10" : "bg-muted"}`}>
            <Icon className={`h-5 w-5 ${variant === "primary" ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function OnchainOps() {
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const { data: comparisons = [], isLoading: comparisonsLoading } = useQuery<Comparison[]>({
    queryKey: ["/api/comparisons"],
  });

  const { data: wallets = [], isLoading: walletsLoading } = useQuery<SafeWallet[]>({
    queryKey: ["/api/dao/safe-wallets"],
  });

  const activeWallets = wallets.filter(w => w.isActive);
  const recentComparisons = comparisons.slice(0, 3);
  const totalAddresses = collections.reduce((sum, c) => sum + c.addressCount, 0);
  const totalNotMinted = comparisons.reduce((sum, c) => sum + (c.results?.notMinted?.length || 0), 0);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-onchain-ops">
            Onchain Operations
          </h1>
          <p className="text-muted-foreground">
            Wallet tools, NFT management, and treasury oversight
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {walletsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-wallets">{activeWallets.length}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Safe Wallets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  {collectionsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-collections">{collections.length}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Collections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  {collectionsLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-addresses">{totalAddresses.toLocaleString()}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Total Addresses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <GitCompare className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  {comparisonsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-comparisons">{comparisons.length}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Comparisons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <QuickActionCard
                    title="Compare Addresses"
                    description="Find addresses that haven't minted yet"
                    icon={GitCompare}
                    href="/web3/compare"
                    variant="primary"
                  />
                  <QuickActionCard
                    title="Extract Addresses"
                    description="Extract EVM addresses from files"
                    icon={FileSearch}
                    href="/web3/extract"
                  />
                  <QuickActionCard
                    title="Merge Files"
                    description="Combine and deduplicate address lists"
                    icon={Merge}
                    href="/web3/merge"
                  />
                  <QuickActionCard
                    title="Manage Collections"
                    description="Create and manage NFT address lists"
                    icon={Database}
                    href="/web3/collections"
                  />
                  <QuickActionCard
                    title="Duplicate Checker"
                    description="Find and remove duplicate addresses"
                    icon={CopyCheck}
                    href="/web3/duplicates"
                  />
                  <QuickActionCard
                    title="Wallet Screener"
                    description="Screen wallets for bots, sybils, and suspicious activity"
                    icon={Shield}
                    href="/web3/screener"
                    variant="primary"
                  />
                  <QuickActionCard
                    title="YouTube to MP3"
                    description="Convert YouTube videos to MP3 audio files"
                    icon={Music}
                    href="/web3/mp3"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Recent Comparisons</CardTitle>
                  <Link href="/web3/history">
                    <Button variant="ghost" size="sm" data-testid="button-view-history">
                      View All
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {comparisonsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : recentComparisons.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GitCompare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No comparisons yet</p>
                    <Link href="/web3/compare">
                      <Button variant="ghost" size="sm" className="mt-2">
                        Run your first comparison
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentComparisons.map((comparison) => (
                      <div
                        key={comparison.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                        data-testid={`comparison-${comparison.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {comparison.eligibleFilename}
                            </span>
                            <Badge variant="outline" className="shrink-0">
                              {comparison.results?.notMinted?.length || 0} eligible
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            vs {comparison.mintedFilename} ({comparison.mintedCount} minted)
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0">
                          {safeFormatDate(comparison.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Collections</CardTitle>
                  <Link href="/web3/collections">
                    <Button variant="ghost" size="sm" data-testid="button-view-collections">
                      Manage
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {collectionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : collections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No collections yet</p>
                    <Link href="/web3/collections">
                      <Button variant="ghost" size="sm" className="mt-2">
                        Create your first collection
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collections.slice(0, 5).map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                        data-testid={`collection-${collection.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Database className="h-4 w-4 text-green-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{collection.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {collection.addressCount.toLocaleString()} addresses
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDate(collection.updatedAt)}
                        </div>
                      </div>
                    ))}
                    {collections.length > 5 && (
                      <Link href="/web3/collections">
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View all {collections.length} collections
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Safe Wallets
                  </CardTitle>
                  <Link href="/dao/dashboard">
                    <Button variant="ghost" size="sm" data-testid="button-manage-wallets">
                      Manage
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {walletsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : activeWallets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No Safe wallets connected</p>
                    <Link href="/dao/dashboard">
                      <Button variant="ghost" size="sm" className="mt-2">
                        Connect a wallet
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {activeWallets.map((wallet) => (
                        <div
                          key={wallet.id}
                          className="p-3 rounded-lg border bg-card"
                          data-testid={`wallet-${wallet.id}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="text-sm font-medium">{wallet.label}</p>
                              <p className="text-xs font-mono text-muted-foreground">
                                {shortenAddress(wallet.address)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">
                              {CHAIN_NAMES[wallet.chainId] || `Chain ${wallet.chainId}`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {wallet.threshold && (
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {wallet.threshold} signers
                              </span>
                            )}
                            {wallet.lastSyncedAt && (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {safeFormatDate(wallet.lastSyncedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Helpful Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a
                  href="https://app.safe.global"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Safe App</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href="https://etherscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                >
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Etherscan</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href="https://basescan.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate"
                >
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">BaseScan</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
