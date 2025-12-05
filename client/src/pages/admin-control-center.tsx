import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AlertCircle,
  Check,
  X,
  Clock,
  DollarSign,
  Users,
  CreditCard,
  Lightbulb,
  Shield,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  Mail,
  Wallet,
  LayoutGrid,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

type PendingContentMember = {
  id: number;
  userId: string;
  status: string;
  specialty: string;
  contactHandle: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
};

type CreditRequest = {
  id: number;
  userId: string;
  amount: string;
  reason: string;
  status: string;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
};

type PaymentRequest = {
  id: number;
  requesterId: string;
  amount: string;
  currency: string;
  reason: string;
  status: string;
  createdAt: string;
  requester?: {
    email: string;
    firstName: string;
    lastName: string;
  };
};

type ContentIdea = {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  submittedBy: string;
  createdAt: string;
  submitter?: {
    email: string;
    firstName: string;
    lastName: string;
  };
};

type UserInvite = {
  id: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type IntegrationSettings = {
  telegramEnabled: boolean;
  discordEnabled: boolean;
  notifyOnTaskCreate: boolean;
  notifyOnTaskComplete: boolean;
};

function StatCard({ title, value, description, icon: Icon, variant = "default" }: {
  title: string;
  value: number | string;
  description?: string;
  icon: any;
  variant?: "default" | "warning" | "success" | "danger";
}) {
  const bgVariant = {
    default: "bg-muted/50",
    warning: "bg-amber-500/10",
    success: "bg-emerald-500/10",
    danger: "bg-destructive/10",
  };

  const iconVariant = {
    default: "text-muted-foreground",
    warning: "text-amber-500",
    success: "text-emerald-500",
    danger: "text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md ${bgVariant[variant]}`}>
            <Icon className={`h-4 w-4 ${iconVariant[variant]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingMembersSection() {
  const { toast } = useToast();
  
  const { data: pendingMembers = [], isLoading } = useQuery<PendingContentMember[]>({
    queryKey: ["/api/admin/pending-content-members"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, addToDirectory }: { userId: string; addToDirectory: boolean }) => {
      return apiRequest("POST", `/api/admin/pending-content-members/${userId}/approve`, { addToDirectory });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-content-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      toast({ title: "Member approved", description: "The member has been approved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve member.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("POST", `/api/admin/pending-content-members/${userId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-content-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-users"] });
      toast({ title: "Member rejected", description: "The member has been rejected." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject member.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  return (
    <div className="space-y-3">
      {pendingMembers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No pending member requests</p>
        </div>
      ) : (
        <>
          {pendingMembers.slice(0, 5).map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-md border bg-card"
              data-testid={`pending-member-${member.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {member.user?.firstName} {member.user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground truncate">{member.user?.email}</p>
                {member.specialty && (
                  <Badge variant="secondary" className="mt-1">{member.specialty}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => rejectMutation.mutate(member.userId)}
                  disabled={rejectMutation.isPending}
                  data-testid={`button-reject-member-${member.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate({ userId: member.userId, addToDirectory: true })}
                  disabled={approveMutation.isPending}
                  data-testid={`button-approve-member-${member.id}`}
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
          {pendingMembers.length > 5 && (
            <Button variant="outline" className="w-full" asChild data-testid="button-view-all-members">
              <Link href="/admin/pending-members">
                View All {pendingMembers.length} Pending Members
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </>
      )}
      <Button variant="ghost" size="sm" className="w-full" asChild data-testid="button-manage-users">
        <Link href="/admin/content-users">
          Manage All Users
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

function CreditRequestsSection() {
  const { toast } = useToast();

  const { data: creditRequests = [], isLoading } = useQuery<CreditRequest[]>({
    queryKey: ["/api/credit-requests/pending"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/credit-requests/${id}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      toast({ title: "Credit request approved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/credit-requests/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/credit-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-credits"] });
      toast({ title: "Credit request rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  return (
    <div className="space-y-3">
      {creditRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No pending credit requests</p>
        </div>
      ) : (
        <>
          {creditRequests.slice(0, 5).map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 rounded-md border bg-card"
              data-testid={`credit-request-${request.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">${parseFloat(request.amount).toLocaleString()}</p>
                  <Badge variant="outline">Credit</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{request.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {request.user?.email || "Unknown user"}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => rejectMutation.mutate(request.id)}
                  disabled={rejectMutation.isPending}
                  data-testid={`button-reject-credit-${request.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate(request.id)}
                  disabled={approveMutation.isPending}
                  data-testid={`button-approve-credit-${request.id}`}
                >
                  {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
          {creditRequests.length > 5 && (
            <Button variant="outline" className="w-full" asChild data-testid="button-view-all-credits">
              <Link href="/admin/credit-requests">
                View All {creditRequests.length} Credit Requests
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </>
      )}
      <Button variant="ghost" size="sm" className="w-full" asChild data-testid="button-manage-client-credits">
        <Link href="/admin/credits">
          Manage Client Buy Power
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

function PaymentRequestsSection() {
  const { toast } = useToast();

  const { data: paymentRequests = [], isLoading } = useQuery<PaymentRequest[]>({
    queryKey: ["/api/payment-requests"],
    select: (data) => data.filter((r) => r.status === "pending"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/payment-requests/${id}/status`, { status, notes });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-requests/pending/count"] });
      toast({ title: `Payment request ${status}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update request.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  return (
    <div className="space-y-3">
      {paymentRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No pending payment requests</p>
        </div>
      ) : (
        <>
          {paymentRequests.slice(0, 5).map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 rounded-md border bg-card"
              data-testid={`payment-request-${request.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {request.currency} {parseFloat(request.amount).toLocaleString()}
                  </p>
                  <Badge variant="outline">Payment</Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{request.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {request.requester?.email || "Unknown user"}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateStatusMutation.mutate({ id: request.id, status: "rejected" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-reject-payment-${request.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateStatusMutation.mutate({ id: request.id, status: "approved" })}
                  disabled={updateStatusMutation.isPending}
                  data-testid={`button-approve-payment-${request.id}`}
                >
                  {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
          {paymentRequests.length > 5 && (
            <Button variant="outline" className="w-full" asChild data-testid="button-view-all-payments">
              <Link href="/admin/payments">
                View All {paymentRequests.length} Payment Requests
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </>
      )}
      <Button variant="ghost" size="sm" className="w-full" asChild data-testid="button-manage-payments">
        <Link href="/admin/payments">
          Manage All Payments
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}

function ContentIdeasSection() {
  const { toast } = useToast();

  const { data: contentIdeas = [], isLoading } = useQuery<ContentIdea[]>({
    queryKey: ["/api/content-ideas/pending"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/content-ideas/${id}`, { status });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({ title: `Content idea ${status}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update idea status.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (contentIdeas.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No pending content ideas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contentIdeas.map((idea) => (
        <div
          key={idea.id}
          className="flex items-center justify-between p-3 rounded-md border bg-card"
          data-testid={`content-idea-${idea.id}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{idea.title}</p>
            <p className="text-sm text-muted-foreground truncate">{idea.description}</p>
            {idea.priority && (
              <Badge 
                variant={idea.priority === "high" ? "destructive" : idea.priority === "medium" ? "default" : "secondary"}
                className="mt-1"
              >
                {idea.priority}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatusMutation.mutate({ id: idea.id, status: "rejected" })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-reject-idea-${idea.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => updateStatusMutation.mutate({ id: idea.id, status: "approved" })}
              disabled={updateStatusMutation.isPending}
              data-testid={`button-approve-idea-${idea.id}`}
            >
              {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvitesSection() {
  const { data: invites = [], isLoading } = useQuery<UserInvite[]>({
    queryKey: ["/api/user-invites"],
  });

  const pendingInvites = invites.filter((inv) => inv.status === "pending");

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (pendingInvites.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No pending invites</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingInvites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-3 rounded-md border bg-card"
          data-testid={`invite-${invite.id}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{invite.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{invite.role}</Badge>
              <span className="text-xs text-muted-foreground">
                Expires {format(new Date(invite.expiresAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <Button size="sm" variant="ghost" asChild>
            <Link href="/invite-users">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

function SystemHealthSection() {
  const { data: integrationSettings, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ["/api/integration-settings"],
  });

  const { data: sheetsStatus } = useQuery<{ configured: boolean; hasCredentials: boolean }>({
    queryKey: ["/api/sheets/status"],
  });

  if (isLoading) {
    return <Skeleton className="h-32" />;
  }

  const healthItems = [
    {
      name: "Discord Integration",
      status: integrationSettings?.discordEnabled ? "active" : "inactive",
      icon: Settings,
    },
    {
      name: "Telegram Integration",
      status: integrationSettings?.telegramEnabled ? "active" : "inactive",
      icon: Settings,
    },
    {
      name: "Google Sheets",
      status: sheetsStatus?.configured ? "active" : sheetsStatus?.hasCredentials ? "warning" : "inactive",
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-3">
      {healthItems.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between p-3 rounded-md border bg-card"
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{item.name}</span>
          </div>
          <Badge
            variant={item.status === "active" ? "default" : item.status === "warning" ? "secondary" : "outline"}
          >
            {item.status === "active" ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
            ) : item.status === "warning" ? (
              <><AlertTriangle className="h-3 w-3 mr-1" /> Needs Setup</>
            ) : (
              <><XCircle className="h-3 w-3 mr-1" /> Disabled</>
            )}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function QuickActionsSection() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/client-directory">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">Client Directory</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/invite-users">
          <Mail className="h-4 w-4" />
          <span className="text-sm">Invite Users</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/invite-codes">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Manage Codes</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/client-credits">
          <CreditCard className="h-4 w-4" />
          <span className="text-sm">Client Credits</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/dao-dashboard">
          <Wallet className="h-4 w-4" />
          <span className="text-sm">DAO Treasury</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/internal-team">
          <Users className="h-4 w-4" />
          <span className="text-sm">Team Members</span>
        </Link>
      </Button>
      <Button variant="outline" className="h-auto py-3 flex-col items-start gap-1" asChild>
        <Link href="/integration-settings">
          <Settings className="h-4 w-4" />
          <span className="text-sm">Integrations</span>
        </Link>
      </Button>
    </div>
  );
}

export default function AdminControlCenter() {
  const { data: pendingMembers = [] } = useQuery<PendingContentMember[]>({
    queryKey: ["/api/admin/pending-content-members"],
  });

  const { data: creditRequests = [] } = useQuery<CreditRequest[]>({
    queryKey: ["/api/credit-requests/pending"],
  });

  const { data: paymentRequests = [] } = useQuery<PaymentRequest[]>({
    queryKey: ["/api/payment-requests"],
    select: (data) => data.filter((r) => r.status === "pending"),
  });

  const { data: contentIdeas = [] } = useQuery<ContentIdea[]>({
    queryKey: ["/api/content-ideas/pending"],
  });

  const { data: invites = [] } = useQuery<UserInvite[]>({
    queryKey: ["/api/user-invites"],
  });

  const pendingInvites = invites.filter((inv) => inv.status === "pending");

  const totalPending = 
    pendingMembers.length + 
    creditRequests.length + 
    paymentRequests.length + 
    contentIdeas.length;

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-content-members"] });
    queryClient.invalidateQueries({ queryKey: ["/api/credit-requests/pending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/payment-requests"] });
    queryClient.invalidateQueries({ queryKey: ["/api/content-ideas/pending"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user-invites"] });
    queryClient.invalidateQueries({ queryKey: ["/api/integration-settings"] });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <LayoutGrid className="h-6 w-6" />
            Admin Control Center
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage all pending approvals and system health
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll} data-testid="button-refresh-all">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Pending Approvals"
          value={totalPending}
          description="Items needing review"
          icon={Clock}
          variant={totalPending > 0 ? "warning" : "success"}
        />
        <StatCard
          title="Member Requests"
          value={pendingMembers.length}
          icon={Users}
          variant={pendingMembers.length > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Credit Requests"
          value={creditRequests.length}
          icon={CreditCard}
          variant={creditRequests.length > 0 ? "warning" : "default"}
        />
        <StatCard
          title="Payment Requests"
          value={paymentRequests.length}
          icon={DollarSign}
          variant={paymentRequests.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Approvals
              </CardTitle>
              <CardDescription>
                {totalPending > 0 
                  ? `${totalPending} items need your attention`
                  : "All caught up! No pending items."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="members" className="w-full">
                <TabsList className="grid w-full grid-cols-5 mb-4">
                  <TabsTrigger value="members" className="relative" data-testid="tab-members">
                    Members
                    {pendingMembers.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {pendingMembers.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="credits" className="relative" data-testid="tab-credits">
                    Credits
                    {creditRequests.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {creditRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="relative" data-testid="tab-payments">
                    Payments
                    {paymentRequests.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {paymentRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ideas" className="relative" data-testid="tab-ideas">
                    Ideas
                    {contentIdeas.length > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {contentIdeas.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="invites" className="relative" data-testid="tab-invites">
                    Invites
                    {pendingInvites.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                        {pendingInvites.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[400px]">
                  <TabsContent value="members" className="mt-0">
                    <PendingMembersSection />
                  </TabsContent>
                  <TabsContent value="credits" className="mt-0">
                    <CreditRequestsSection />
                  </TabsContent>
                  <TabsContent value="payments" className="mt-0">
                    <PaymentRequestsSection />
                  </TabsContent>
                  <TabsContent value="ideas" className="mt-0">
                    <ContentIdeasSection />
                  </TabsContent>
                  <TabsContent value="invites" className="mt-0">
                    <InvitesSection />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuickActionsSection />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemHealthSection />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
