import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { ArrowLeft, Shield, Loader2, Plus, Minus, DollarSign, CreditCard, TrendingUp, TrendingDown, History, Users, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type UserWithCredit = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleContent: boolean;
  roleAdmin: boolean;
  roleWeb3: boolean;
  balance: number;
  currency: string;
};

type CreditTransaction = {
  id: number;
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  taskId: number | null;
  performedBy: string | null;
  createdAt: string;
};

type CreditWithUser = {
  id: number;
  userId: string;
  balance: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

function formatCurrency(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(cents / 100);
}

function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case "credit_added": return "Buy Power Added";
    case "credit_used": return "Buy Power Used";
    case "credit_adjusted": return "Adjustment";
    case "credit_refunded": return "Refund";
    default: return type;
  }
}

function getTransactionTypeColor(type: string): string {
  switch (type) {
    case "credit_added": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "credit_used": return "bg-red-500/10 text-red-700 dark:text-red-400";
    case "credit_adjusted": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    case "credit_refunded": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

export default function AdminCredits() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithCredit | null>(null);
  const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
  const [isDeductCreditDialogOpen, setIsDeductCreditDialogOpen] = useState(false);
  const [addCreditData, setAddCreditData] = useState({ amount: "", description: "" });
  const [deductCreditData, setDeductCreditData] = useState({ amount: "", description: "" });

  const { data: allCredits, isLoading: loadingCredits } = useQuery<CreditWithUser[]>({
    queryKey: ["/api/client-credits"],
  });

  const { data: eligibleUsers, isLoading: loadingUsers } = useQuery<UserWithCredit[]>({
    queryKey: ["/api/client-credits/eligible-users"],
  });

  const { data: userTransactions, isLoading: loadingTransactions } = useQuery<CreditTransaction[]>({
    queryKey: ["/api/client-credits", selectedUser?.id, "transactions"],
    enabled: !!selectedUser,
  });

  const addCreditMutation = useMutation({
    mutationFn: ({ userId, amount, description }: { userId: string; amount: number; description: string }) =>
      apiRequest("POST", `/api/client-credits/${userId}/add`, { amount, description }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits/eligible-users"] });
      if (selectedUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/client-credits", selectedUser.id, "transactions"] });
      }
      setIsAddCreditDialogOpen(false);
      setAddCreditData({ amount: "", description: "" });
      toast({ title: "Buy Power Added", description: data.message || "Successfully added buy power to account" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add buy power", variant: "destructive" });
    },
  });

  const deductCreditMutation = useMutation({
    mutationFn: ({ userId, amount, description }: { userId: string; amount: number; description: string }) =>
      apiRequest("POST", `/api/client-credits/${userId}/deduct`, { amount, description }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits/eligible-users"] });
      if (selectedUser) {
        queryClient.invalidateQueries({ queryKey: ["/api/client-credits", selectedUser.id, "transactions"] });
      }
      setIsDeductCreditDialogOpen(false);
      setDeductCreditData({ amount: "", description: "" });
      toast({ title: "Buy Power Deducted", description: data.message || "Successfully deducted buy power from account" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to deduct buy power", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You need admin access to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const eligibleUsersArray = Array.isArray(eligibleUsers) ? eligibleUsers : [];
  const filteredUsers = eligibleUsersArray.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      u.firstName?.toLowerCase().includes(query) ||
      u.lastName?.toLowerCase().includes(query)
    );
  });

  const totalCreditsIssued = allCredits?.reduce((sum, c) => sum + c.balance, 0) || 0;
  const usersWithCredits = allCredits?.filter(c => c.balance > 0).length || 0;

  const handleAddCredit = () => {
    if (!selectedUser || !addCreditData.amount) return;
    const amount = parseFloat(addCreditData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount", variant: "destructive" });
      return;
    }
    addCreditMutation.mutate({
      userId: selectedUser.id,
      amount,
      description: addCreditData.description || "Buy power added by admin",
    });
  };

  const handleDeductCredit = () => {
    if (!selectedUser || !deductCreditData.amount) return;
    const amount = parseFloat(deductCreditData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", description: "Please enter a valid positive amount", variant: "destructive" });
      return;
    }
    if (amount * 100 > selectedUser.balance) {
      toast({ title: "Insufficient Balance", description: "Cannot deduct more than the current balance", variant: "destructive" });
      return;
    }
    deductCreditMutation.mutate({
      userId: selectedUser.id,
      amount,
      description: deductCreditData.description || "Buy power deducted by admin",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/content">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <CreditCard className="h-6 w-6" />
            Client Buy Power
          </h1>
          <p className="text-sm text-muted-foreground">Manage client buy power balances</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Buy Power Issued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-credits">
              {formatCurrency(totalCreditsIssued)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Users with Buy Power</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-users-with-credits">
              {usersWithCredits}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Eligible Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-eligible-users">
              {eligibleUsersArray.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>Select a user to manage their buy power</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
            
            <ScrollArea className="h-[400px]">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors hover-elevate ${
                        selectedUser?.id === u.id ? "border-primary bg-primary/5" : "border-border"
                      }`}
                      onClick={() => setSelectedUser(u)}
                      data-testid={`user-card-${u.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate" data-testid={`text-user-name-${u.id}`}>
                            {[u.firstName, u.lastName].filter(Boolean).join(" ") || "No Name"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate" data-testid={`text-user-email-${u.id}`}>
                            {u.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${u.balance > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} data-testid={`text-user-balance-${u.id}`}>
                            {formatCurrency(u.balance, u.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {selectedUser ? (
                    <span data-testid="text-selected-user">
                      {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email}
                    </span>
                  ) : (
                    "Select a User"
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedUser ? selectedUser.email : "Choose a user from the list to view and manage their buy power"}
                </CardDescription>
              </div>
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <Dialog open={isAddCreditDialogOpen} onOpenChange={setIsAddCreditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-credit">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Buy Power
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Buy Power</DialogTitle>
                        <DialogDescription>
                          Add buy power to {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email}'s account
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="add-amount">Amount ($)</Label>
                          <Input
                            id="add-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="250.00"
                            value={addCreditData.amount}
                            onChange={(e) => setAddCreditData({ ...addCreditData, amount: e.target.value })}
                            data-testid="input-add-amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="add-description">Description (optional)</Label>
                          <Textarea
                            id="add-description"
                            placeholder="Reason for adding buy power..."
                            value={addCreditData.description}
                            onChange={(e) => setAddCreditData({ ...addCreditData, description: e.target.value })}
                            data-testid="input-add-description"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCreditDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleAddCredit} 
                          disabled={addCreditMutation.isPending || !addCreditData.amount}
                          data-testid="button-confirm-add-credit"
                        >
                          {addCreditMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Add Buy Power
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isDeductCreditDialogOpen} onOpenChange={setIsDeductCreditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-deduct-credit">
                        <Minus className="h-4 w-4 mr-2" />
                        Deduct Buy Power
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Deduct Buy Power</DialogTitle>
                        <DialogDescription>
                          Deduct buy power from {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(" ") || selectedUser.email}'s account.
                          Current balance: {formatCurrency(selectedUser.balance, selectedUser.currency)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="deduct-amount">Amount ($)</Label>
                          <Input
                            id="deduct-amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={(selectedUser.balance / 100).toFixed(2)}
                            placeholder="50.00"
                            value={deductCreditData.amount}
                            onChange={(e) => setDeductCreditData({ ...deductCreditData, amount: e.target.value })}
                            data-testid="input-deduct-amount"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deduct-description">Description (optional)</Label>
                          <Textarea
                            id="deduct-description"
                            placeholder="Reason for deducting buy power..."
                            value={deductCreditData.description}
                            onChange={(e) => setDeductCreditData({ ...deductCreditData, description: e.target.value })}
                            data-testid="input-deduct-description"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeductCreditDialogOpen(false)}>Cancel</Button>
                        <Button 
                          variant="destructive"
                          onClick={handleDeductCredit} 
                          disabled={deductCreditMutation.isPending || !deductCreditData.amount}
                          data-testid="button-confirm-deduct-credit"
                        >
                          {deductCreditMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Minus className="h-4 w-4 mr-2" />
                          )}
                          Deduct Buy Power
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Buy Power Balance</p>
                    <p className="text-3xl font-bold" data-testid="text-current-balance">
                      {formatCurrency(selectedUser.balance, selectedUser.currency)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {selectedUser.roleContent && (
                      <Badge variant="secondary">Content</Badge>
                    )}
                    {selectedUser.roleAdmin && (
                      <Badge variant="secondary">Admin</Badge>
                    )}
                    {selectedUser.roleWeb3 && (
                      <Badge variant="secondary">Web3</Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Transaction History
                  </h3>
                  {loadingTransactions ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : userTransactions && userTransactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Balance After</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userTransactions.map((tx) => (
                          <TableRow key={tx.id} data-testid={`transaction-row-${tx.id}`}>
                            <TableCell>
                              <Badge className={getTransactionTypeColor(tx.type)}>
                                {tx.amount >= 0 ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {getTransactionTypeLabel(tx.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className={tx.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {tx.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(tx.amount))}
                            </TableCell>
                            <TableCell>{formatCurrency(tx.balanceAfter)}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{tx.description || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(tx.createdAt), "MMM d, yyyy h:mm a")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No User Selected</p>
                <p className="text-muted-foreground">Select a user from the list to view and manage their credits</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
