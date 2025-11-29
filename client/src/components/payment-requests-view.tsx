import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Ban, AlertCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { PaymentRequest, PaymentRequestEvent } from "@shared/schema";

const newRequestSchema = z.object({
  amount: z.string().min(1, "Amount is required").regex(/^\d+\.?\d*$/, "Must be a valid number"),
  currency: z.string().min(1, "Currency is required"),
  reason: z.string().min(10, "Please provide a reason (at least 10 characters)"),
  description: z.string().optional(),
});

type NewRequestFormValues = z.infer<typeof newRequestSchema>;

const currencyOptions = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "ETH", label: "ETH - Ethereum" },
  { value: "BTC", label: "BTC - Bitcoin" },
  { value: "USDT", label: "USDT - Tether" },
  { value: "USDC", label: "USDC - USD Coin" },
];

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

interface PaymentRequestWithEvents extends PaymentRequest {
  events?: PaymentRequestEvent[];
  requesterName?: string;
  reviewerName?: string;
}

function PaymentRequestCard({ 
  request, 
  onCancel 
}: { 
  request: PaymentRequestWithEvents;
  onCancel: (id: number) => void;
}) {
  const isPending = request.status === "pending";
  
  return (
    <Card data-testid={`payment-request-card-${request.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">
              {request.currency} {request.amount}
            </CardTitle>
          </div>
          <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
            {getStatusIcon(request.status)}
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs mt-1">
          <Clock className="h-3 w-3" />
          Requested {format(new Date(request.requestedAt), "PPp")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-medium">Reason</p>
          <p className="text-sm text-muted-foreground">{request.reason}</p>
        </div>
        {request.description && (
          <div>
            <p className="text-sm font-medium">Additional Details</p>
            <p className="text-sm text-muted-foreground">{request.description}</p>
          </div>
        )}
        {request.adminNote && (
          <div className="pt-2 border-t">
            <p className="text-sm font-medium">Admin Note</p>
            <p className="text-sm text-muted-foreground">{request.adminNote}</p>
          </div>
        )}
        {request.reviewedAt && (
          <p className="text-xs text-muted-foreground">
            {request.status === "approved" ? "Approved" : request.status === "rejected" ? "Rejected" : "Updated"} on{" "}
            {format(new Date(request.reviewedAt), "PPp")}
          </p>
        )}
      </CardContent>
      {isPending && (
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(request.id)}
            data-testid={`button-cancel-request-${request.id}`}
          >
            <Ban className="h-4 w-4 mr-2" />
            Cancel Request
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function NewRequestDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<NewRequestFormValues>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      amount: "",
      currency: "USD",
      reason: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: NewRequestFormValues) => {
      const response = await apiRequest("POST", "/api/payment-requests", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      onOpenChange(false);
      form.reset();
    },
  });

  const onSubmit = (data: NewRequestFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New Payment Request</DialogTitle>
          <DialogDescription>
            Submit a request for a missed or pending payment. An admin will review your request.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Briefly explain what this payment is for..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-reason"
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a clear reason for this payment request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional context or details..."
                      className="resize-none"
                      rows={2}
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-dialog"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-request"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentRequestsView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const { data: requests, isLoading, error } = useQuery<PaymentRequestWithEvents[]>({
    queryKey: ["/api/payment-requests"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/payment-requests/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
    },
  });

  const filteredRequests = requests?.filter((req) => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const pendingCount = requests?.filter((r) => r.status === "pending").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold" data-testid="heading-payment-requests">
            Payment Requests
          </h2>
          <p className="text-sm text-muted-foreground">
            Submit and track payment requests
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-new-request">
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          data-testid="filter-all"
        >
          All
          {requests && <Badge variant="secondary" className="ml-2">{requests.length}</Badge>}
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
          data-testid="filter-pending"
        >
          <Clock className="h-4 w-4 mr-1" />
          Pending
          {pendingCount > 0 && <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>}
        </Button>
        <Button
          variant={filter === "approved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("approved")}
          data-testid="filter-approved"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Approved
        </Button>
        <Button
          variant={filter === "rejected" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("rejected")}
          data-testid="filter-rejected"
        >
          <XCircle className="h-4 w-4 mr-1" />
          Rejected
        </Button>
      </div>

      {filteredRequests && filteredRequests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRequests.map((request) => (
            <PaymentRequestCard
              key={request.id}
              request={request}
              onCancel={(id) => cancelMutation.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No payment requests</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {filter === "all"
                ? "You haven't submitted any payment requests yet."
                : `No ${filter} requests found.`}
            </p>
            {filter === "all" && (
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first request
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <NewRequestDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
