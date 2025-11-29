import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Clock, CheckCircle, XCircle, Ban, AlertCircle, Loader2, User } from "lucide-react";
import { format } from "date-fns";
import type { PaymentRequest } from "@shared/schema";

function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "approved":
      return <CheckCircle className="h-4 w-4" />;
    case "rejected":
      return <XCircle className="h-4 w-4" />;
    case "cancelled":
      return <Ban className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "pending":
      return "secondary";
    case "approved":
      return "default";
    case "rejected":
      return "destructive";
    case "cancelled":
      return "outline";
    default:
      return "secondary";
  }
}

interface PaymentRequestWithDetails extends PaymentRequest {
  requesterName?: string;
  requesterEmail?: string;
  reviewerName?: string;
}

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PaymentRequestWithDetails | null;
  action: "approve" | "reject";
}

function ReviewDialog({ open, onOpenChange, request, action }: ReviewDialogProps) {
  const [note, setNote] = useState("");

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: number; status: string; note?: string }) => {
      const response = await apiRequest("PATCH", `/api/payment-requests/${id}/status`, { 
        status,
        note: note || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      onOpenChange(false);
      setNote("");
    },
  });

  const handleConfirm = () => {
    if (!request) return;
    reviewMutation.mutate({
      id: request.id,
      status: action === "approve" ? "approved" : "rejected",
      note: note,
    });
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Approve Payment Request
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Reject Payment Request
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "approve"
              ? "Confirm that this payment request has been processed or will be processed."
              : "Provide a reason for rejecting this payment request."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">{request.requesterName || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{request.requesterEmail}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{request.currency} {request.amount}</p>
              <p className="text-xs text-muted-foreground">{request.reason}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">
              {action === "approve" ? "Note (optional)" : "Reason for rejection"}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                action === "approve"
                  ? "Add a note about this approval..."
                  : "Explain why this request is being rejected..."
              }
              className="mt-1.5"
              rows={3}
              data-testid="textarea-admin-note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-review-cancel"
          >
            Cancel
          </Button>
          <Button
            variant={action === "approve" ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={reviewMutation.isPending || (action === "reject" && !note.trim())}
            data-testid={`button-review-confirm-${action}`}
          >
            {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminPaymentRequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: PaymentRequestWithDetails;
  onApprove: (request: PaymentRequestWithDetails) => void;
  onReject: (request: PaymentRequestWithDetails) => void;
}) {
  const isPending = request.status === "pending";
  const initials = request.requesterName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <Card data-testid={`admin-payment-request-${request.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{request.requesterName || "Unknown User"}</CardTitle>
              <CardDescription className="text-xs">{request.requesterEmail}</CardDescription>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
            {getStatusIcon(request.status)}
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Amount</span>
          <span className="text-lg font-bold">{request.currency} {request.amount}</span>
        </div>

        <div>
          <p className="text-sm font-medium">Reason</p>
          <p className="text-sm text-muted-foreground">{request.reason}</p>
        </div>

        {request.description && (
          <div>
            <p className="text-sm font-medium">Details</p>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </div>
        )}

        {request.adminNote && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium">Admin Note</p>
            <p className="text-sm text-muted-foreground">{request.adminNote}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Submitted {format(new Date(request.requestedAt), "PPp")}
        </div>
        
        {request.reviewedAt && request.reviewerName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {request.status === "approved" ? "Approved" : "Rejected"} by {request.reviewerName} on{" "}
            {format(new Date(request.reviewedAt), "PPp")}
          </div>
        )}
      </CardContent>
      
      {isPending && (
        <CardFooter className="pt-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReject(request)}
            data-testid={`button-reject-${request.id}`}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => onApprove(request)}
            data-testid={`button-approve-${request.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function AdminPaymentRequests() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequestWithDetails | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");

  const { data: requests, isLoading, error } = useQuery<PaymentRequestWithDetails[]>({
    queryKey: ["/api/payment-requests"],
  });

  const handleApprove = (request: PaymentRequestWithDetails) => {
    setSelectedRequest(request);
    setReviewAction("approve");
    setReviewDialogOpen(true);
  };

  const handleReject = (request: PaymentRequestWithDetails) => {
    setSelectedRequest(request);
    setReviewAction("reject");
    setReviewDialogOpen(true);
  };

  const filteredRequests = requests?.filter((req) => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const pendingCount = requests?.filter((r) => r.status === "pending").length || 0;
  const approvedCount = requests?.filter((r) => r.status === "approved").length || 0;
  const rejectedCount = requests?.filter((r) => r.status === "rejected").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load payment requests. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="heading-admin-payments">
          <DollarSign className="h-5 w-5" />
          Payment Requests
          {pendingCount > 0 && (
            <Badge variant="secondary">{pendingCount} pending</Badge>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          Review and process payment requests from team members
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          data-testid="admin-filter-all"
        >
          All
          <Badge variant="secondary" className="ml-2">{requests?.length || 0}</Badge>
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
          data-testid="admin-filter-pending"
        >
          <Clock className="h-4 w-4 mr-1" />
          Pending
          {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>}
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
          data-testid="admin-filter-approved"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approved
          {approvedCount > 0 && <Badge variant="secondary" className="ml-2">{approvedCount}</Badge>}
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("rejected")}
          data-testid="admin-filter-rejected"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Rejected
          {rejectedCount > 0 && <Badge variant="secondary" className="ml-2">{rejectedCount}</Badge>}
        </Button>
      </div>

      {filteredRequests && filteredRequests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <AdminPaymentRequestCard
              key={request.id}
              request={request}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {filter === "pending" ? "No pending requests" : "No payment requests"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {filter === "pending"
                ? "All payment requests have been reviewed."
                : filter === "all"
                ? "No payment requests have been submitted yet."
                : `No ${filter} requests found.`}
            </p>
          </CardContent>
        </Card>
      )}

      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        request={selectedRequest}
        action={reviewAction}
      />
    </div>
  );
}
