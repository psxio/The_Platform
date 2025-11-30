import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { ArrowLeft, Shield, Loader2, Check, X, DollarSign, Clock, User } from "lucide-react";
import { useState, useEffect } from "react";
import type { CreditRequest, User as UserType } from "@shared/schema";

type CreditRequestWithUser = CreditRequest & { user?: UserType };

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" data-testid={`badge-status-${status}`}><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-status-${status}`}><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-status-${status}`}><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
    case "cancelled":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Cancelled</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function ApprovalDialog({ 
  request, 
  open, 
  onOpenChange,
  action,
}: { 
  request: CreditRequestWithUser | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  action: "approve" | "reject";
}) {
  const { toast } = useToast();
  const [note, setNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");

  const requestedAmountDollars = request ? request.amount / 100 : 0;
  
  useEffect(() => {
    if (open && request) {
      if (action === "approve") {
        setApprovedAmount((request.amount / 100).toFixed(2));
      } else {
        setApprovedAmount("");
      }
      setNote("");
    }
  }, [open, request, action]);
  
  const mutation = useMutation({
    mutationFn: async () => {
      if (!request) return;
      if (action === "approve") {
        const amount = parseFloat(approvedAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error("Invalid amount");
        }
        return await apiRequest("POST", `/api/credit-requests/${request.id}/approve`, { 
          approvedAmount: amount,
          note 
        });
      } else {
        return await apiRequest("POST", `/api/credit-requests/${request.id}/reject`, { note });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests"] });
      toast({ 
        title: action === "approve" ? "Request approved" : "Request rejected",
        description: action === "approve" 
          ? "Credits have been added to the client's account." 
          : "The client has been notified.",
      });
      setNote("");
      setApprovedAmount("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: `Failed to ${action} request`, variant: "destructive" });
    },
  });

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === "approve" ? "Approve Credit Request" : "Reject Credit Request"}
          </DialogTitle>
          <DialogDescription>
            {action === "approve" 
              ? "Specify the amount to approve and add to the client's balance."
              : "Please provide a reason for rejecting this request."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Client:</span>
              <span className="font-medium">{request.user?.firstName} {request.user?.lastName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Requested Amount:</span>
              <span className="font-semibold text-lg">{formatCurrency(requestedAmountDollars)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reason:</span>
              <span className="font-medium">{request.reason}</span>
            </div>
            {request.description && (
              <div>
                <span className="text-sm text-muted-foreground">Details:</span>
                <p className="text-sm mt-1">{request.description}</p>
              </div>
            )}
          </div>

          {action === "approve" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Approved Amount ($) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={requestedAmountDollars.toFixed(2)}
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                data-testid="input-approved-amount"
              />
              <p className="text-xs text-muted-foreground">
                You can approve a different amount than requested.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Admin Notes {action === "reject" && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              placeholder={action === "approve" ? "Optional notes..." : "Reason for rejection..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="input-admin-notes"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-dialog">
            Cancel
          </Button>
          <Button
            variant={action === "approve" ? "default" : "destructive"}
            onClick={() => mutation.mutate()}
            disabled={
              mutation.isPending || 
              (action === "reject" && !note.trim()) ||
              (action === "approve" && (!approvedAmount || parseFloat(approvedAmount) <= 0 || isNaN(parseFloat(approvedAmount))))
            }
            data-testid={`button-confirm-${action}`}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {action === "approve" ? "Approve & Add Credits" : "Reject Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingRequestsTable() {
  const [selectedRequest, setSelectedRequest] = useState<CreditRequestWithUser | null>(null);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject">("approve");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: requests, isLoading } = useQuery<CreditRequestWithUser[]>({
    queryKey: ["/api/credit-requests/pending"],
  });

  const handleAction = (request: CreditRequestWithUser, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setDialogAction(action);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending credit requests</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
          <CardTitle className="text-lg">Pending Requests</CardTitle>
          <Badge variant="secondary">{requests.length} pending</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{request.user?.firstName} {request.user?.lastName}</p>
                        <p className="text-sm text-muted-foreground">{request.user?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{formatCurrency(request.amount / 100)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px]">
                      <p className="font-medium">{request.reason}</p>
                      {request.description && (
                        <p className="text-sm text-muted-foreground truncate">{request.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(request.requestedAt)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(request, "approve")}
                        data-testid={`button-approve-${request.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(request, "reject")}
                        data-testid={`button-reject-${request.id}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ApprovalDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
      />
    </>
  );
}

export default function AdminCreditRequests() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You must be an admin to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/credits">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-admin-credit-requests">
              Credit Request Management
            </h1>
            <p className="text-muted-foreground">
              Review and process credit requests from clients
            </p>
          </div>
        </div>

        <PendingRequestsTable />
      </div>
    </div>
  );
}
