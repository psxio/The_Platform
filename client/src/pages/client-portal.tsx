import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  CreditCard, 
  Plus, 
  ShoppingCart, 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Package,
  FileText,
  Send,
  Loader2,
  FolderOpen,
  Download,
  ExternalLink,
  TrendingUp,
  Timer,
  AlertTriangle,
  Eye,
  Calendar,
  User,
  Activity,
  BarChart3,
  Zap,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from "lucide-react";
import { ClientWelcomeModal } from "@/components/client-welcome-modal";
import { OrderMessages } from "@/components/order-messages";
import type { CreditRequest, ContentOrder, CreditTransaction, ClientOnboarding, ContentIdea } from "@shared/schema";

const formatCurrency = (cents: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
};

const formatDate = (date: string | Date | null) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (date: string | Date | null) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    approved: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
    rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    cancelled: { variant: "outline", icon: <AlertCircle className="h-3 w-3" /> },
    draft: { variant: "secondary", icon: <FileText className="h-3 w-3" /> },
    submitted: { variant: "default", icon: <Send className="h-3 w-3" /> },
    in_progress: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    review: { variant: "secondary", icon: <Eye className="h-3 w-3" /> },
    completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  };
  const config = variants[status] || variants.pending;
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {status.replace("_", " ").charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
    </Badge>
  );
};

const getPriorityBadge = (priority: string) => {
  const colors: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    normal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };
  return (
    <Badge variant="outline" className={colors[priority] || colors.normal}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
};

interface DashboardSummary {
  balance: number;
  currency: string;
  stats: {
    activeOrders: number;
    completedOrders: number;
    totalOrders: number;
    pendingRequests: number;
    overdueOrders: number;
    avgCompletionDays: number;
  };
  recentOrders: ContentOrder[];
  activeOrderDetails: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    createdAt: Date | null;
    dueDate: Date | null;
    orderType: string;
  }>;
}

interface WorkLibraryItem {
  id: number;
  title: string;
  orderType: string;
  deliverableUrl: string | null;
  completedAt: Date | null;
  createdAt: Date | null;
  description: string;
  specifications: string | null;
}

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: dashboardSummary, isLoading: summaryLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/client/dashboard-summary"],
  });

  const { data: workLibrary, isLoading: libraryLoading } = useQuery<WorkLibraryItem[]>({
    queryKey: ["/api/client/work-library"],
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/client-credits", user?.id, "transactions"],
    enabled: !!user?.id,
  });

  const { data: creditRequests, isLoading: requestsLoading } = useQuery<CreditRequest[]>({
    queryKey: ["/api/credit-requests"],
  });

  const { data: contentOrders, isLoading: ordersLoading } = useQuery<ContentOrder[]>({
    queryKey: ["/api/content-orders"],
  });

  const { data: onboarding } = useQuery<ClientOnboarding>({
    queryKey: ["/api/client-onboarding"],
  });

  const { data: contentIdeas, isLoading: ideasLoading } = useQuery<ContentIdea[]>({
    queryKey: ["/api/content-ideas"],
  });

  const markOnboardingStep = useMutation({
    mutationFn: async (step: string) => {
      return await apiRequest("POST", "/api/client-onboarding/mark-step", { step });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-onboarding"] });
    },
  });

  useEffect(() => {
    if (onboarding && !onboarding.hasViewedCredits && activeTab === "overview") {
      markOnboardingStep.mutate("hasViewedCredits");
    }
    if (onboarding && !onboarding.hasViewedTransactionHistory && activeTab === "history") {
      markOnboardingStep.mutate("hasViewedTransactionHistory");
    }
  }, [activeTab, onboarding]);

  const pendingRequests = creditRequests?.filter(r => r.status === "pending") || [];
  const activeOrders = contentOrders?.filter(o => !["completed", "cancelled"].includes(o.status)) || [];
  const balance = dashboardSummary?.balance || 0;
  const currency = dashboardSummary?.currency || "USD";

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <ClientWelcomeModal />
      
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-client-portal">
              Client Portal
            </h1>
            <p className="text-muted-foreground">
              Manage your projects, orders, and deliverables
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsOrderDialogOpen(true)}
              disabled={balance <= 0}
              data-testid="button-quick-order"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              New Order
            </Button>
            <Button 
              variant="outline"
              onClick={() => setIsRequestDialogOpen(true)}
              data-testid="button-quick-request"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Buy Power
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Buy Power</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold text-primary" data-testid="text-credit-balance">
                  {formatCurrency(balance, currency)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Available balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-orders">
                {summaryLoading ? <Skeleton className="h-8 w-12" /> : dashboardSummary?.stats.activeOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="text-completed-orders">
                {summaryLoading ? <Skeleton className="h-8 w-12" /> : dashboardSummary?.stats.completedOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Delivered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Delivery</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-delivery">
                {summaryLoading ? <Skeleton className="h-8 w-16" /> : `${dashboardSummary?.stats.avgCompletionDays || 0} days`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Turnaround time</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">
              <Package className="h-4 w-4 mr-2" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="library" data-testid="tab-library">
              <FolderOpen className="h-4 w-4 mr-2" />
              Work Library
            </TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">
              <CreditCard className="h-4 w-4 mr-2" />
              Buy Power
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="ideas" data-testid="tab-ideas" className="relative">
              <Lightbulb className="h-4 w-4 mr-2" />
              Ideas
              {contentIdeas && contentIdeas.filter(i => i.status === "pending").length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {contentIdeas.filter(i => i.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard/Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Orders Panel */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Active Orders</CardTitle>
                        <CardDescription>Orders currently being worked on</CardDescription>
                      </div>
                      {dashboardSummary?.stats.overdueOrders && dashboardSummary.stats.overdueOrders > 0 && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {dashboardSummary.stats.overdueOrders} overdue
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {summaryLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ) : dashboardSummary?.activeOrderDetails && dashboardSummary.activeOrderDetails.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardSummary.activeOrderDetails.map((order) => (
                          <div 
                            key={order.id} 
                            className="p-4 border rounded-lg hover-elevate cursor-pointer"
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setActiveTab("orders");
                            }}
                            data-testid={`active-order-${order.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{order.title}</h4>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {order.orderType.replace("_", " ")}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {getStatusBadge(order.status)}
                                {getPriorityBadge(order.priority || "normal")}
                              </div>
                            </div>
                            {order.dueDate && (
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Due: {formatDate(order.dueDate)}
                                {new Date(order.dueDate) < new Date() && (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No active orders</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => setIsOrderDialogOpen(true)}
                          disabled={balance <= 0}
                        >
                          Place Your First Order
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Deliveries */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Deliveries</CardTitle>
                    <CardDescription>Your latest completed work</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {libraryLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : workLibrary && workLibrary.length > 0 ? (
                      <div className="space-y-2">
                        {workLibrary.slice(0, 3).map((item) => (
                          <div 
                            key={item.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover-elevate"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  Delivered {formatDate(item.completedAt)}
                                </p>
                              </div>
                            </div>
                            {item.deliverableUrl && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={item.deliverableUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                        {workLibrary.length > 3 && (
                          <Button 
                            variant="ghost" 
                            className="w-full" 
                            onClick={() => setActiveTab("library")}
                          >
                            View All ({workLibrary.length})
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-muted-foreground">
                        No deliveries yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      onClick={() => setIsOrderDialogOpen(true)} 
                      className="w-full justify-start"
                      disabled={balance <= 0}
                      data-testid="button-new-order"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Place New Order
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsRequestDialogOpen(true)} 
                      className="w-full justify-start"
                      data-testid="button-request-credits"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request Buy Power
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("library")} 
                      className="w-full justify-start"
                      data-testid="button-view-library"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      View Work Library
                    </Button>
                  </CardContent>
                </Card>

                {/* Pending Requests */}
                {pendingRequests.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pending Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {pendingRequests.slice(0, 3).map((request) => (
                          <div key={request.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Buy Power</span>
                            <span className="font-medium">
                              {formatCurrency(request.amount, request.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactionsLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    ) : transactions && transactions.length > 0 ? (
                      <div className="space-y-2">
                        {transactions.slice(0, 4).map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {tx.amount > 0 ? (
                                <ArrowUpRight className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 text-red-500" />
                              )}
                              <span className="truncate max-w-[120px]">
                                {tx.description || tx.type}
                              </span>
                            </div>
                            <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                              {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>
                      View All
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <ContentOrdersSection 
              orders={contentOrders || []} 
              isLoading={ordersLoading}
              onNewOrder={() => setIsOrderDialogOpen(true)}
              balance={balance}
              selectedOrderId={selectedOrderId}
              onOrderSelect={setSelectedOrderId}
              currentUserId={user?.id || ""}
            />
          </TabsContent>

          {/* Work Library Tab */}
          <TabsContent value="library">
            <WorkLibrarySection 
              items={workLibrary || []}
              isLoading={libraryLoading}
            />
          </TabsContent>

          {/* Buy Power Requests Tab */}
          <TabsContent value="requests">
            <CreditRequestsSection 
              requests={creditRequests || []} 
              isLoading={requestsLoading}
              onNewRequest={() => setIsRequestDialogOpen(true)}
            />
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history">
            <TransactionHistorySection 
              transactions={transactions || []} 
              isLoading={transactionsLoading}
            />
          </TabsContent>

          {/* Ideas Tab - Content Ideas Awaiting Approval */}
          <TabsContent value="ideas">
            <ContentIdeasSection 
              ideas={contentIdeas || []} 
              isLoading={ideasLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      <NewCreditRequestDialog 
        open={isRequestDialogOpen} 
        onOpenChange={setIsRequestDialogOpen} 
      />
      
      <NewContentOrderDialog 
        open={isOrderDialogOpen} 
        onOpenChange={setIsOrderDialogOpen}
        balance={balance}
      />
    </div>
  );
}

// Work Library Section Component
function WorkLibrarySection({ 
  items, 
  isLoading 
}: { 
  items: WorkLibraryItem[]; 
  isLoading: boolean;
}) {
  const [filter, setFilter] = useState<string>("all");
  
  const orderTypes = Array.from(new Set(items.map(i => i.orderType)));
  
  const filteredItems = filter === "all" 
    ? items 
    : items.filter(i => i.orderType === filter);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Work Library</h3>
          <p className="text-sm text-muted-foreground">
            Access all your completed deliverables
          </p>
        </div>
        {orderTypes.length > 1 && (
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-library-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {orderTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No deliverables yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Your completed work will appear here. Place an order to get started!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover-elevate" data-testid={`library-item-${item.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{item.title}</CardTitle>
                    <CardDescription className="capitalize">
                      {item.orderType.replace("_", " ")}
                    </CardDescription>
                  </div>
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Delivered {formatDate(item.completedAt)}
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                {item.deliverableUrl && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <a href={item.deliverableUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Deliverable
                    </a>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentOrdersSection({ 
  orders, 
  isLoading, 
  onNewOrder,
  balance,
  selectedOrderId,
  onOrderSelect,
  currentUserId
}: { 
  orders: ContentOrder[]; 
  isLoading: boolean; 
  onNewOrder: () => void;
  balance: number;
  selectedOrderId: number | null;
  onOrderSelect: (id: number | null) => void;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [viewingOrder, setViewingOrder] = useState<ContentOrder | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/content-orders/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits/my-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard-summary"] });
      toast({ title: "Order cancelled" });
    },
    onError: () => {
      toast({ title: "Failed to cancel order", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/content-orders/${id}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits/my-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-onboarding"] });
      toast({ title: "Order submitted successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to submit order", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === selectedOrderId);
      if (order) {
        setViewingOrder(order);
        onOrderSelect(null);
      }
    }
  }, [selectedOrderId, orders]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Your Content Orders</h3>
          <p className="text-sm text-muted-foreground">
            Track and manage your orders
          </p>
        </div>
        <Button onClick={onNewOrder} disabled={balance <= 0} data-testid="button-create-order">
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No orders yet</h3>
            <p className="text-muted-foreground mb-4">Place your first order to get started</p>
            <Button onClick={onNewOrder} disabled={balance <= 0}>
              Place Your First Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card 
              key={order.id} 
              className="hover-elevate cursor-pointer"
              onClick={() => setViewingOrder(order)}
              data-testid={`card-order-${order.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{order.title}</CardTitle>
                    <CardDescription className="capitalize">{order.orderType.replace("_", " ")}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(order.status)}
                    {order.priority && getPriorityBadge(order.priority)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
                <div className="flex flex-wrap justify-between items-center mt-3 gap-2">
                  <span className="text-sm font-medium">
                    Cost: {formatCurrency(order.creditCost)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created: {formatDate(order.createdAt)}
                  </span>
                </div>
              </CardContent>
              {(order.status === "draft" || order.status === "submitted") && (
                <CardFooter className="pt-2 gap-2" onClick={(e) => e.stopPropagation()}>
                  {order.status === "draft" && (
                    <Button 
                      size="sm" 
                      onClick={() => submitMutation.mutate(order.id)}
                      disabled={submitMutation.isPending}
                      data-testid={`button-submit-order-${order.id}`}
                    >
                      {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Order"}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => cancelMutation.mutate(order.id)}
                    disabled={cancelMutation.isPending}
                    data-testid={`button-cancel-order-${order.id}`}
                  >
                    {order.status === "submitted" ? "Cancel & Refund" : "Cancel"}
                  </Button>
                </CardFooter>
              )}
              {order.status === "completed" && order.deliverableUrl && (
                <CardFooter className="pt-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" asChild>
                    <a href={order.deliverableUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Deliverable
                    </a>
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <OrderDetailsDialog 
        order={viewingOrder}
        open={!!viewingOrder}
        onOpenChange={(open) => !open && setViewingOrder(null)}
        currentUserId={currentUserId}
      />
    </div>
  );
}

interface OrderProgress {
  order: {
    id: number;
    title: string;
    status: string;
    createdAt: Date | null;
    submittedAt: Date | null;
    completedAt: Date | null;
    priority: string | null;
    deliverableUrl: string | null;
  };
  task: {
    id: number;
    status: string;
    assignedTo: string | null;
    dueDate: Date | null;
    estimatedHours: number | null;
    createdAt: Date | null;
  } | null;
  assignedWorker: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  workerPresence: {
    isActive: boolean;
    status: string;
  } | null;
  estimatedDelivery: Date | null;
  timeline: { date: Date | null; event: string; status: string }[];
}

function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  currentUserId
}: {
  order: ContentOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
}) {
  const { data: progress, isLoading: progressLoading } = useQuery<OrderProgress>({
    queryKey: ["/api/client/order-progress", order?.id],
    enabled: !!order?.id && open,
  });

  if (!order) return null;

  const getWorkerName = () => {
    if (!progress?.assignedWorker) return "Team Member";
    const { firstName, lastName } = progress.assignedWorker;
    const name = `${firstName || ""}${lastName ? ` ${lastName}.` : ""}`.trim();
    return name || "Team Member";
  };

  const getWorkerInitials = () => {
    if (!progress?.assignedWorker) return "T";
    const { firstName, lastName } = progress.assignedWorker;
    const first = firstName?.charAt(0) || "";
    const last = lastName || "";
    return (first + last) || "T";
  };

  const isOverdue = progress?.estimatedDelivery && 
    new Date(progress.estimatedDelivery) < new Date() && 
    order.status !== "completed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order.title}</DialogTitle>
          <DialogDescription className="capitalize">
            {order.orderType.replace("_", " ")} • {formatCurrency(order.creditCost)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status & Worker Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  {progressLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
              </div>

              {order.priority && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  {getPriorityBadge(order.priority)}
                </div>
              )}

              {/* Assigned Worker */}
              {progress?.assignedWorker && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Assigned To</span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getWorkerInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{getWorkerName()}</span>
                    {progress.workerPresence?.isActive && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 text-xs gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Active
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Estimated Delivery */}
              {progress?.estimatedDelivery && order.status !== "completed" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Delivery</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : ""}`}>
                      {formatDate(progress.estimatedDelivery)}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Task Hours */}
              {progress?.task?.estimatedHours && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated Work</span>
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{progress.task.estimatedHours} hours</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Progress Timeline
            </h4>
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {order.createdAt && (
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-sm">Order created</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
              )}
              {order.submittedAt && (
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-sm">Order submitted</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.submittedAt)}</p>
                </div>
              )}
              {progress?.assignedWorker && order.status !== "draft" && order.status !== "submitted" && (
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-sm">Assigned to {getWorkerName()}</p>
                  <p className="text-xs text-muted-foreground">Work assigned to team member</p>
                </div>
              )}
              {order.status === "in_progress" && (
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-sm">Work in progress</p>
                  <p className="text-xs text-muted-foreground">
                    {progress?.workerPresence?.isActive 
                      ? progress.workerPresence.status 
                      : "Currently being worked on"}
                  </p>
                </div>
              )}
              {order.status === "review" && (
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-sm">Under review</p>
                  <p className="text-xs text-muted-foreground">Final review before delivery</p>
                </div>
              )}
              {order.completedAt && (
                <div className="relative">
                  <div className="absolute -left-[1.35rem] w-2.5 h-2.5 rounded-full bg-green-500" />
                  <p className="text-sm">Completed</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(order.completedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Description</h4>
            <p className="text-sm text-muted-foreground">{order.description}</p>
          </div>

          {/* Specifications */}
          {order.specifications && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Specifications</h4>
              <p className="text-sm text-muted-foreground">{order.specifications}</p>
            </div>
          )}

          {/* Deliverable */}
          {order.deliverableUrl && (
            <div className="pt-2">
              <Button className="w-full" asChild>
                <a href={order.deliverableUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Deliverable
                </a>
              </Button>
            </div>
          )}

          {/* Messages */}
          {order.status !== "draft" && (
            <Separator className="my-4" />
          )}
          {order.status !== "draft" && (
            <OrderMessages 
              orderId={order.id} 
              isTeamMember={false}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreditRequestsSection({ 
  requests, 
  isLoading, 
  onNewRequest 
}: { 
  requests: CreditRequest[]; 
  isLoading: boolean; 
  onNewRequest: () => void;
}) {
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/credit-requests/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard-summary"] });
      toast({ title: "Request cancelled" });
    },
    onError: () => {
      toast({ title: "Failed to cancel request", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Buy Power Requests</h3>
          <p className="text-sm text-muted-foreground">
            Request additional buy power for your projects
          </p>
        </div>
        <Button onClick={onNewRequest} data-testid="button-new-credit-request">
          <Plus className="h-4 w-4 mr-2" />
          Request Buy Power
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No buy power requests</h3>
            <p className="text-muted-foreground mb-4">Request buy power when you need more</p>
            <Button onClick={onNewRequest}>
              Request More Buy Power
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id} data-testid={`card-request-${request.id}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      {formatCurrency(request.amount, request.currency)} Requested
                    </CardTitle>
                    <CardDescription>{formatDate(request.requestedAt)}</CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>
                {request.description && (
                  <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                )}
                {request.status === "approved" && request.approvedAmount && (
                  <p className="text-sm text-green-600 mt-2">
                    Approved amount: {formatCurrency(request.approvedAmount, request.currency)}
                  </p>
                )}
                {request.adminNote && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Admin note: {request.adminNote}
                  </p>
                )}
              </CardContent>
              {request.status === "pending" && (
                <CardFooter className="pt-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => cancelMutation.mutate(request.id)}
                    disabled={cancelMutation.isPending}
                    data-testid={`button-cancel-request-${request.id}`}
                  >
                    Cancel Request
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionHistorySection({ 
  transactions, 
  isLoading 
}: { 
  transactions: CreditTransaction[]; 
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Transaction History</h3>
        <p className="text-sm text-muted-foreground">
          Complete history of your buy power transactions
        </p>
      </div>
      
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No transactions yet</h3>
            <p className="text-muted-foreground">Your transaction history will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <div className="p-4 space-y-1">
              {transactions.map((tx, index) => (
                <div key={tx.id}>
                  <div className="flex items-center justify-between py-3" data-testid={`row-transaction-${tx.id}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        {tx.amount > 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{tx.description || tx.type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {formatCurrency(tx.balanceAfter)}
                      </p>
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

function NewCreditRequestDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/credit-requests", {
        amount: parseFloat(amount),
        reason,
        description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard-summary"] });
      toast({ title: "Buy power request submitted" });
      onOpenChange(false);
      setAmount("");
      setReason("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Failed to submit request", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request More Buy Power</DialogTitle>
          <DialogDescription>
            Submit a request for additional buy power. An admin will review your request.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="250.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-request-amount"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              placeholder="e.g., Need buy power for upcoming project"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="input-request-reason"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-request-description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!amount || !reason || createMutation.isPending}
            data-testid="button-submit-request"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OrderTemplate {
  id: number;
  name: string;
  description: string | null;
  orderType: string;
  defaultTitle: string | null;
  defaultDescription: string | null;
  defaultSpecifications: string | null;
  estimatedCost: number | null;
  estimatedDays: number | null;
  priority: string | null;
}

interface SavedOrderItem {
  id: number;
  name: string;
  orderType: string;
  title: string | null;
  description: string | null;
  specifications: string | null;
  creditCost: number | null;
  priority: string | null;
  clientNotes: string | null;
  usageCount: number | null;
  lastUsedAt: Date | null;
}

function NewContentOrderDialog({ 
  open, 
  onOpenChange,
  balance 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  balance: number;
}) {
  const [step, setStep] = useState<"select" | "customize">("select");
  const [selectedTemplate, setSelectedTemplate] = useState<OrderTemplate | null>(null);
  const [orderType, setOrderType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [creditCost, setCreditCost] = useState("");
  const [priority, setPriority] = useState("normal");
  const [clientNotes, setClientNotes] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const { toast } = useToast();

  const { data: templates } = useQuery<OrderTemplate[]>({
    queryKey: ["/api/order-templates"],
    enabled: open,
  });

  const { data: savedOrders } = useQuery<SavedOrderItem[]>({
    queryKey: ["/api/saved-orders"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const order = await apiRequest("POST", "/api/content-orders", {
        orderType,
        title,
        description,
        specifications,
        creditCost: parseFloat(creditCost),
        priority,
        clientNotes,
      });
      
      if (saveAsTemplate && templateName.trim()) {
        await apiRequest("POST", "/api/saved-orders", {
          name: templateName.trim(),
          orderType,
          title,
          description,
          specifications,
          creditCost: Math.round(parseFloat(creditCost) * 100),
          priority,
          clientNotes,
        });
      }
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/work-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-orders"] });
      toast({ title: "Order created as draft" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Failed to create order", variant: "destructive" });
    },
  });

  const handleClose = () => {
    onOpenChange(false);
    setStep("select");
    setSelectedTemplate(null);
    resetForm();
  };

  const resetForm = () => {
    setOrderType("");
    setTitle("");
    setDescription("");
    setSpecifications("");
    setCreditCost("");
    setPriority("normal");
    setClientNotes("");
    setSaveAsTemplate(false);
    setTemplateName("");
  };

  const applyTemplate = (template: OrderTemplate) => {
    setSelectedTemplate(template);
    setOrderType(template.orderType);
    setTitle(template.defaultTitle || "");
    setDescription(template.defaultDescription || "");
    setSpecifications(template.defaultSpecifications || "");
    setCreditCost(template.estimatedCost ? (template.estimatedCost / 100).toString() : "");
    setPriority(template.priority || "normal");
    setStep("customize");
  };

  const applySavedOrder = (saved: SavedOrderItem) => {
    setOrderType(saved.orderType);
    setTitle(saved.title || "");
    setDescription(saved.description || "");
    setSpecifications(saved.specifications || "");
    setCreditCost(saved.creditCost ? (saved.creditCost / 100).toString() : "");
    setPriority(saved.priority || "normal");
    setClientNotes(saved.clientNotes || "");
    setStep("customize");
  };

  const startBlank = () => {
    resetForm();
    setStep("customize");
  };

  const costInCents = parseFloat(creditCost || "0") * 100;
  const canAfford = costInCents <= balance;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Choose Order Type" : "Create Content Order"}
          </DialogTitle>
          <DialogDescription>
            {step === "select" 
              ? "Start from a template for faster ordering, or create a blank order"
              : `Available buy power: ${formatCurrency(balance)}`
            }
          </DialogDescription>
        </DialogHeader>
        
        {step === "select" && (
          <div className="space-y-6">
            {/* Templates Section */}
            {templates && templates.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Start Templates
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="p-4 border rounded-lg hover-elevate cursor-pointer"
                      data-testid={`template-${template.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium">{template.name}</h5>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        {template.estimatedCost && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            ~{formatCurrency(template.estimatedCost)}
                          </span>
                        )}
                        {template.estimatedDays && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{template.estimatedDays} days
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Orders Section */}
            {savedOrders && savedOrders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Your Saved Orders
                </h4>
                <div className="space-y-2">
                  {savedOrders.slice(0, 3).map((saved) => (
                    <div
                      key={saved.id}
                      onClick={() => applySavedOrder(saved)}
                      className="p-3 border rounded-lg hover-elevate cursor-pointer flex items-center justify-between"
                      data-testid={`saved-order-${saved.id}`}
                    >
                      <div>
                        <span className="font-medium">{saved.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          Used {saved.usageCount || 0} times
                        </span>
                      </div>
                      {saved.creditCost && (
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(saved.creditCost)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Blank Order Option */}
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={startBlank}
              data-testid="button-blank-order"
            >
              <Plus className="h-4 w-4" />
              Start from Blank
            </Button>
          </div>
        )}

        {step === "customize" && (
          <>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-4 pr-4">
                {selectedTemplate && (
                  <div className="p-3 bg-primary/5 rounded-lg flex items-center gap-3 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">Using template: {selectedTemplate.name}</span>
                      {selectedTemplate.estimatedDays && (
                        <p className="text-xs text-muted-foreground">
                          Estimated delivery: ~{selectedTemplate.estimatedDays} days
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => { setStep("select"); setSelectedTemplate(null); }}
                    >
                      Change
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="orderType">Content Type</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger data-testid="select-order-type">
                      <SelectValue placeholder="Select content type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="blog_post">Blog Post</SelectItem>
                      <SelectItem value="social_media">Social Media Content</SelectItem>
                      <SelectItem value="video_script">Video Script</SelectItem>
                      <SelectItem value="graphics">Graphics/Design</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief title for your order"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-order-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you need..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    data-testid="input-order-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specifications">Specifications (Optional)</Label>
                  <Textarea
                    id="specifications"
                    placeholder="Technical specs, dimensions, word count, etc."
                    value={specifications}
                    onChange={(e) => setSpecifications(e.target.value)}
                    rows={2}
                    data-testid="input-order-specs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditCost">Buy Power Cost (USD)</Label>
                    <Input
                      id="creditCost"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="50.00"
                      value={creditCost}
                      onChange={(e) => setCreditCost(e.target.value)}
                      data-testid="input-order-cost"
                    />
                    {creditCost && !canAfford && (
                      <p className="text-xs text-destructive">Insufficient buy power</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger data-testid="select-order-priority">
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientNotes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="clientNotes"
                    placeholder="Any other notes for the team..."
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={2}
                    data-testid="input-order-notes"
                  />
                </div>
                
                <Separator />
                
                {/* Save as template option */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="saveTemplate"
                      checked={saveAsTemplate}
                      onChange={(e) => setSaveAsTemplate(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                      data-testid="checkbox-save-template"
                    />
                    <Label htmlFor="saveTemplate" className="text-sm font-normal cursor-pointer">
                      Save this as a reusable order template
                    </Label>
                  </div>
                  {saveAsTemplate && (
                    <Input
                      placeholder="Template name (e.g., Weekly Blog Post)"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      data-testid="input-template-name"
                    />
                  )}
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>
                Back
              </Button>
              <Button 
                onClick={() => createMutation.mutate()}
                disabled={!orderType || !title || !description || !creditCost || !canAfford || createMutation.isPending || (saveAsTemplate && !templateName.trim())}
                data-testid="button-create-order"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Draft"}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "select" && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Content Ideas Section Component - For clients to approve/deny ideas
function ContentIdeasSection({ 
  ideas, 
  isLoading 
}: { 
  ideas: ContentIdea[]; 
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

  const approveMutation = useMutation({
    mutationFn: async ({ id, clientNotes }: { id: number; clientNotes?: string }) => {
      return await apiRequest("POST", `/api/content-ideas/${id}/approve`, { clientNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea approved!", description: "The content team will start working on it." });
      setSelectedIdea(null);
      setFeedback("");
    },
    onError: () => {
      toast({ title: "Failed to approve idea", variant: "destructive" });
    },
  });

  const denyMutation = useMutation({
    mutationFn: async ({ id, clientNotes }: { id: number; clientNotes?: string }) => {
      return await apiRequest("POST", `/api/content-ideas/${id}/deny`, { clientNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: "Idea declined", description: "Your feedback has been sent to the team." });
      setSelectedIdea(null);
      setFeedback("");
    },
    onError: () => {
      toast({ title: "Failed to decline idea", variant: "destructive" });
    },
  });

  const filteredIdeas = filter === "all" 
    ? ideas 
    : ideas.filter(i => i.status === filter);

  const pendingCount = ideas.filter(i => i.status === "pending").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Content Ideas
          </h3>
          <p className="text-sm text-muted-foreground">
            Review and approve content ideas from our team
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[150px]" data-testid="select-ideas-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ideas</SelectItem>
              <SelectItem value="pending">
                Pending {pendingCount > 0 && `(${pendingCount})`}
              </SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="denied">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredIdeas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-lg mb-1">No content ideas yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {filter === "pending" 
                ? "You're all caught up! No ideas awaiting your approval."
                : "Our team will share content ideas here for your review."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => (
            <Card 
              key={idea.id} 
              className={`hover-elevate ${idea.status === "pending" ? "border-primary/50" : ""}`} 
              data-testid={`idea-card-${idea.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{idea.title}</CardTitle>
                    <CardDescription className="capitalize mt-1">
                      {idea.contentType.replace("_", " ")}
                    </CardDescription>
                  </div>
                  {getIdeaStatusBadge(idea.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {idea.description}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {idea.estimatedCost && (
                    <span className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Est. {formatCurrency(idea.estimatedCost)}
                    </span>
                  )}
                  {idea.estimatedDays && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      ~{idea.estimatedDays} days
                    </span>
                  )}
                  {idea.priority && idea.priority !== "normal" && (
                    <span>{getPriorityBadge(idea.priority)}</span>
                  )}
                </div>
                {idea.clientNotes && idea.status !== "pending" && (
                  <div className="p-2 bg-muted rounded-md text-sm">
                    <span className="text-muted-foreground">Your feedback: </span>
                    {idea.clientNotes}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                {idea.status === "pending" ? (
                  <>
                    <Button 
                      size="sm" 
                      onClick={() => setSelectedIdea(idea)}
                      data-testid={`button-review-idea-${idea.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveMutation.mutate({ id: idea.id })}
                      disabled={approveMutation.isPending}
                      data-testid={`button-quick-approve-${idea.id}`}
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedIdea(idea)}
                    data-testid={`button-view-idea-${idea.id}`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Idea Detail Dialog */}
      <Dialog open={!!selectedIdea} onOpenChange={(open) => !open && setSelectedIdea(null)}>
        <DialogContent className="max-w-lg">
          {selectedIdea && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <DialogTitle>{selectedIdea.title}</DialogTitle>
                    <DialogDescription className="capitalize mt-1">
                      {selectedIdea.contentType.replace("_", " ")}
                    </DialogDescription>
                  </div>
                  {getIdeaStatusBadge(selectedIdea.status)}
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedIdea.description}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  {selectedIdea.estimatedCost && (
                    <div>
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <span className="font-medium ml-1">{formatCurrency(selectedIdea.estimatedCost)}</span>
                    </div>
                  )}
                  {selectedIdea.estimatedDays && (
                    <div>
                      <span className="text-muted-foreground">Timeline:</span>
                      <span className="font-medium ml-1">~{selectedIdea.estimatedDays} days</span>
                    </div>
                  )}
                </div>

                {selectedIdea.teamNotes && (
                  <div className="p-3 bg-muted rounded-md">
                    <h4 className="text-sm font-medium mb-1 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Team Notes
                    </h4>
                    <p className="text-sm text-muted-foreground">{selectedIdea.teamNotes}</p>
                  </div>
                )}

                {selectedIdea.status === "pending" && (
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Your Feedback (Optional)</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Share any thoughts, requests, or concerns..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={3}
                      data-testid="input-idea-feedback"
                    />
                  </div>
                )}

                {selectedIdea.clientNotes && selectedIdea.status !== "pending" && (
                  <div className="p-3 border rounded-md">
                    <h4 className="text-sm font-medium mb-1">Your Feedback</h4>
                    <p className="text-sm text-muted-foreground">{selectedIdea.clientNotes}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {selectedIdea.status === "pending" ? (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => denyMutation.mutate({ id: selectedIdea.id, clientNotes: feedback })}
                      disabled={denyMutation.isPending || approveMutation.isPending}
                      data-testid="button-deny-idea"
                    >
                      {denyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ThumbsDown className="h-4 w-4 mr-2" />
                      )}
                      Decline
                    </Button>
                    <Button
                      onClick={() => approveMutation.mutate({ id: selectedIdea.id, clientNotes: feedback })}
                      disabled={approveMutation.isPending || denyMutation.isPending}
                      data-testid="button-approve-idea"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setSelectedIdea(null)}>
                    Close
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getIdeaStatusBadge(status: string) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
    pending: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
    approved: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
    denied: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
    in_production: { variant: "default", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    completed: { variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  };
  const c = config[status] || config.pending;
  return (
    <Badge variant={c.variant} className="gap-1">
      {c.icon}
      {status === "denied" ? "Declined" : status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
    </Badge>
  );
}
