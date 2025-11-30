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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  Loader2
} from "lucide-react";
import { ClientWelcomeModal } from "@/components/client-welcome-modal";
import type { CreditRequest, ContentOrder, CreditTransaction, ClientOnboarding } from "@shared/schema";

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
    review: { variant: "secondary", icon: <AlertCircle className="h-3 w-3" /> },
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

export default function ClientPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: balance, isLoading: balanceLoading } = useQuery<{ balance: number; currency: string }>({
    queryKey: ["/api/client-credits/my-balance"],
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

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <ClientWelcomeModal />
      
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-client-portal">
              Client Portal
            </h1>
            <p className="text-muted-foreground">
              Manage your credits, orders, and content requests
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold" data-testid="text-credit-balance">
                  {formatCurrency(balance?.balance || 0, balance?.currency)}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Use credits to order content</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pending-requests">
                {pendingRequests.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Credit requests awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-active-orders">
                {activeOrders.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Content orders in progress</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="orders" data-testid="tab-orders">My Orders</TabsTrigger>
            <TabsTrigger value="requests" data-testid="tab-requests">Credit Requests</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Get started with your portal</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => setIsOrderDialogOpen(true)} 
                    className="w-full justify-start"
                    disabled={!balance || balance.balance <= 0}
                    data-testid="button-new-order"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Place New Content Order
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsRequestDialogOpen(true)} 
                    className="w-full justify-start"
                    data-testid="button-request-credits"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request More Credits
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : transactions && transactions.length > 0 ? (
                    <div className="space-y-2">
                      {transactions.slice(0, 3).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-2">
                            {tx.amount > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{tx.description || tx.type}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                          <span className={`font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent transactions</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>
                    View All Transactions
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <ContentOrdersSection 
              orders={contentOrders || []} 
              isLoading={ordersLoading}
              onNewOrder={() => setIsOrderDialogOpen(true)}
              balance={balance?.balance || 0}
            />
          </TabsContent>

          <TabsContent value="requests">
            <CreditRequestsSection 
              requests={creditRequests || []} 
              isLoading={requestsLoading}
              onNewRequest={() => setIsRequestDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistorySection 
              transactions={transactions || []} 
              isLoading={transactionsLoading}
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
        balance={balance?.balance || 0}
      />
    </div>
  );
}

function ContentOrdersSection({ 
  orders, 
  isLoading, 
  onNewOrder,
  balance 
}: { 
  orders: ContentOrder[]; 
  isLoading: boolean; 
  onNewOrder: () => void;
  balance: number;
}) {
  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("POST", `/api/content-orders/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits/my-balance"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/client-onboarding"] });
      toast({ title: "Order submitted successfully" });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to submit order", variant: "destructive" });
    },
  });

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
        <h3 className="text-lg font-semibold">Your Content Orders</h3>
        <Button onClick={onNewOrder} disabled={balance <= 0} data-testid="button-create-order">
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders yet</p>
            <Button className="mt-4" onClick={onNewOrder} disabled={balance <= 0}>
              Place Your First Order
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} data-testid={`card-order-${order.id}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{order.title}</CardTitle>
                    <CardDescription className="capitalize">{order.orderType.replace("_", " ")}</CardDescription>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{order.description}</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm font-medium">
                    Cost: {formatCurrency(order.creditCost)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Created: {formatDate(order.createdAt)}
                  </span>
                </div>
              </CardContent>
              {order.status === "draft" && (
                <CardFooter className="pt-0 gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => submitMutation.mutate(order.id)}
                    disabled={submitMutation.isPending}
                    data-testid={`button-submit-order-${order.id}`}
                  >
                    {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Order"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => cancelMutation.mutate(order.id)}
                    disabled={cancelMutation.isPending}
                    data-testid={`button-cancel-order-${order.id}`}
                  >
                    Cancel
                  </Button>
                </CardFooter>
              )}
              {order.status === "submitted" && (
                <CardFooter className="pt-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => cancelMutation.mutate(order.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Cancel & Refund
                  </Button>
                </CardFooter>
              )}
              {order.status === "completed" && order.deliverableUrl && (
                <CardFooter className="pt-0">
                  <Button size="sm" variant="outline" asChild>
                    <a href={order.deliverableUrl} target="_blank" rel="noopener noreferrer">
                      View Deliverable
                    </a>
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
        <h3 className="text-lg font-semibold">Credit Requests</h3>
        <Button onClick={onNewRequest} data-testid="button-new-credit-request">
          <Plus className="h-4 w-4 mr-2" />
          Request Credits
        </Button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No credit requests</p>
            <Button className="mt-4" onClick={onNewRequest}>
              Request More Credits
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
      <h3 className="text-lg font-semibold">Transaction History</h3>
      
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
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
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
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
      toast({ title: "Credit request submitted" });
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
          <DialogTitle>Request More Credits</DialogTitle>
          <DialogDescription>
            Submit a request for additional credits. An admin will review your request.
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
              placeholder="e.g., Need credits for upcoming project"
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

function NewContentOrderDialog({ 
  open, 
  onOpenChange,
  balance 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  balance: number;
}) {
  const [orderType, setOrderType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [creditCost, setCreditCost] = useState("");
  const [priority, setPriority] = useState("normal");
  const [clientNotes, setClientNotes] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/content-orders", {
        orderType,
        title,
        description,
        specifications,
        creditCost: parseFloat(creditCost),
        priority,
        clientNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-orders"] });
      toast({ title: "Order created as draft" });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Failed to create order", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setOrderType("");
    setTitle("");
    setDescription("");
    setSpecifications("");
    setCreditCost("");
    setPriority("normal");
    setClientNotes("");
  };

  const costInCents = parseFloat(creditCost || "0") * 100;
  const canAfford = costInCents <= balance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Content Order</DialogTitle>
          <DialogDescription>
            Create a new order to use your credits. Available: {formatCurrency(balance)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
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
                <Label htmlFor="creditCost">Credit Cost (USD)</Label>
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
                  <p className="text-xs text-destructive">Insufficient credits</p>
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
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={!orderType || !title || !description || !creditCost || !canAfford || createMutation.isPending}
            data-testid="button-create-order"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
