import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  FileText, 
  Plus, 
  ArrowUpRight, 
  ArrowRight,
  Clock, 
  DollarSign,
  Building2,
  Briefcase,
  ChevronRight,
  Star,
  Crown,
  Shield,
  Target,
  Settings,
  BarChart3,
  Vault,
  Scale,
  AlertTriangle,
  Zap,
  Hand,
  CheckCircle2,
  LightbulbIcon,
  History,
  Send,
  LayoutGrid,
} from "lucide-react";
import { Link } from "wouter";
import { DaoSafeWallets } from "@/components/dao-safe-wallets";
import { DaoFairnessDashboard } from "@/components/dao-fairness-dashboard";
import { AddDaoMemberDialog } from "@/components/add-dao-member-dialog";

type DaoRole = {
  id: number;
  name: string;
  tier: number;
  multiplier: string;
  cumulativeRevenueRequired: number;
  description: string;
  isCouncilEligible: boolean;
};

type DaoProject = {
  id: number;
  clientId: string;
  projectName: string;
  status: string;
  totalValue: number;
  createdAt: string;
};

type DaoInvoice = {
  id: number;
  projectId: number;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  dueDate: string;
};

type DaoMembership = {
  id: number;
  userId: string;
  roleId: number;
  cumulativeRevenue: number;
  isCouncilMember: boolean;
  user?: { username: string };
  role?: DaoRole;
};

type DaoTreasury = {
  id: number;
  balance: number;
  lastBonusTriggerBalance: number;
  bonusTriggerThreshold: number;
};

type ServiceCategory = {
  category: string;
  count: number;
};

type DaoProjectOpportunity = {
  id: number;
  title: string;
  description: string | null;
  estimatedValue: number | null;
  requiredServices: string[] | null;
  rolesNeeded: string[] | null;
  priority: string;
  status: string;
  bidDeadline: string | null;
  expectedStartDate: string | null;
};

type DaoConsistencyMetrics = {
  membershipId: number;
  leadRoleCount: number | null;
  pmRoleCount: number | null;
  coreRoleCount: number | null;
  supportRoleCount: number | null;
  overallReliabilityScore: number | null;
};

type SafeTransaction = {
  id: number;
  safeTxHash: string;
  txHash: string | null;
  to: string;
  value: string;
  txType: string;
  status: string;
  confirmationsRequired: number;
  confirmationsCount: number;
  formattedValue: string | null;
  submittedAt: string;
  executedAt: string | null;
  wallet?: {
    id: number;
    label: string;
    chainId: number;
  };
};

type FairnessSummary = {
  openOpportunities: DaoProjectOpportunity[];
  workloadImbalances: { memberId: number; memberName: string; totalRoles: number; isOverloaded: boolean }[];
  memberStanding: {
    membership: DaoMembership;
    currentRole: DaoRole;
    nextRole: DaoRole | null;
    progressToNext: number;
    revenueToNext: number;
  } | null;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getRoleIcon(tier: number) {
  if (tier >= 7) return <Crown className="h-4 w-4 text-amber-400" />; // Founder
  if (tier >= 6) return <Crown className="h-4 w-4 text-yellow-500" />;
  if (tier >= 5) return <Star className="h-4 w-4 text-purple-500" />;
  if (tier >= 4) return <Shield className="h-4 w-4 text-blue-500" />;
  return <Target className="h-4 w-4 text-muted-foreground" />;
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    active: "default",
    completed: "secondary",
    pending: "outline",
    draft: "outline",
    paid: "default",
    overdue: "destructive",
    cancelled: "destructive",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
}

export default function DaoDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const { data: treasury } = useQuery<DaoTreasury>({
    queryKey: ["/api/dao/treasury"],
  });

  const { data: roles } = useQuery<DaoRole[]>({
    queryKey: ["/api/dao/roles"],
  });

  const { data: projects } = useQuery<DaoProject[]>({
    queryKey: ["/api/dao/projects"],
  });

  const { data: invoices } = useQuery<DaoInvoice[]>({
    queryKey: ["/api/dao/invoices"],
  });

  const { data: memberships } = useQuery<DaoMembership[]>({
    queryKey: ["/api/dao/memberships"],
  });

  const { data: services } = useQuery<any[]>({
    queryKey: ["/api/dao/catalog"],
  });

  const { data: opportunities } = useQuery<DaoProjectOpportunity[]>({
    queryKey: ["/api/dao/project-opportunities"],
  });

  const { data: myMembership } = useQuery<DaoMembership>({
    queryKey: ["/api/dao/memberships/me"],
  });

  const { data: consistencyMetrics } = useQuery<DaoConsistencyMetrics[]>({
    queryKey: ["/api/dao/consistency-metrics"],
  });

  const { data: recentTxs } = useQuery<SafeTransaction[]>({
    queryKey: ["/api/dao/safe-transactions/recent"],
  });

  const { data: pendingTxs } = useQuery<SafeTransaction[]>({
    queryKey: ["/api/dao/safe-transactions/pending"],
  });

  const activeProjects = projects?.filter(p => p.status === "active") || [];
  const pendingInvoices = invoices?.filter(i => i.status === "pending" || i.status === "sent") || [];
  const councilMembers = memberships?.filter(m => m.isCouncilMember) || [];
  
  const treasuryBalance = treasury?.balance || 0;
  const bonusThreshold = treasury?.bonusTriggerThreshold || 10000000;
  const bonusProgress = Math.min((treasuryBalance / bonusThreshold) * 100, 100);

  const serviceCategories: ServiceCategory[] = services 
    ? Object.entries(
        services.reduce((acc, s) => {
          acc[s.category] = (acc[s.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([category, count]) => ({ category, count: count as number }))
    : [];

  const openOpportunities = opportunities?.filter(o => o.status === "open" || o.status === "accepting_bids") || [];
  
  const workloadByMember = consistencyMetrics?.reduce((acc, m) => {
    const total = (m.leadRoleCount || 0) + (m.pmRoleCount || 0) + (m.coreRoleCount || 0) + (m.supportRoleCount || 0);
    acc[m.membershipId] = total;
    return acc;
  }, {} as Record<number, number>) || {};

  const workloadImbalances = memberships?.map(m => {
    const total = workloadByMember[m.id] || 0;
    const memberName = m.user?.username || `Member ${m.id}`;
    return {
      memberId: m.id,
      memberName,
      totalRoles: total,
      isOverloaded: total > 5,
      isUnderutilized: total === 0
    };
  }).filter(w => w.isOverloaded || w.isUnderutilized) || [];

  const myCurrentRole = myMembership?.role || null;
  const myCurrentRevenue = myMembership?.cumulativeRevenue || 0;
  const sortedRoles = roles?.slice().sort((a, b) => a.tier - b.tier) || [];
  const nextRoleIndex = sortedRoles.findIndex(r => r.cumulativeRevenueRequired > myCurrentRevenue);
  const nextRole = nextRoleIndex >= 0 ? sortedRoles[nextRoleIndex] : null;
  const progressToNext = nextRole 
    ? Math.min(100, (myCurrentRevenue / nextRole.cumulativeRevenueRequired) * 100)
    : 100;
  const revenueToNext = nextRole ? nextRole.cumulativeRevenueRequired - myCurrentRevenue : 0;

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-dao-dashboard">
              DAO Management
            </h1>
            <p className="text-muted-foreground">
              Manage projects, revenue attribution, and treasury operations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/tasks">
              <Button variant="default" data-testid="button-team-tasks">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Team Tasks
              </Button>
            </Link>
            <Link href="/dao/projects/new">
              <Button variant="outline" data-testid="button-new-project">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
            <Link href="/dao/catalog">
              <Button variant="outline" data-testid="button-catalog">
                <Briefcase className="h-4 w-4 mr-2" />
                Services
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/dao/settings">
                <Button variant="outline" size="icon" data-testid="button-dao-settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-treasury">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Treasury Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(treasuryBalance)}</div>
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Bonus Threshold</span>
                  <span>{formatCurrency(bonusThreshold)}</span>
                </div>
                <Progress value={bonusProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-projects">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects.length}</div>
              <p className="text-xs text-muted-foreground">
                {projects?.length || 0} total projects
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-pending-invoices">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingInvoices.length}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(pendingInvoices.reduce((sum, i) => sum + i.totalAmount, 0))} outstanding
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-council-members">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Council Members</CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{councilMembers.length}</div>
              <p className="text-xs text-muted-foreground">
                {memberships?.length || 0} total members
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="inline-flex gap-1">
            <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2" data-testid="tab-projects">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2" data-testid="tab-invoices">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2" data-testid="tab-members">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2" data-testid="tab-roles">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">Ranks</span>
            </TabsTrigger>
            <TabsTrigger value="safe-wallets" className="gap-2" data-testid="tab-safe-wallets">
              <Vault className="h-4 w-4" />
              <span className="hidden sm:inline">Safe Wallets</span>
            </TabsTrigger>
            <TabsTrigger value="fairness" className="gap-2" data-testid="tab-fairness">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Fairness</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="space-y-6">
              {(openOpportunities.length > 0 || workloadImbalances.length > 0 || myMembership) && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-l-4 border-l-blue-500" data-testid="card-opportunities">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Hand className="h-4 w-4 text-blue-500" />
                          Open Opportunities
                        </CardTitle>
                        <Badge variant="secondary">{openOpportunities.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {openOpportunities.length > 0 ? (
                        <div className="space-y-2">
                          {openOpportunities.slice(0, 3).map((opp) => (
                            <div
                              key={opp.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                              data-testid={`opportunity-${opp.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{opp.title}</p>
                                {opp.estimatedValue && (
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(opp.estimatedValue)}
                                  </p>
                                )}
                              </div>
                              <Badge 
                                variant={opp.priority === "high" ? "destructive" : "outline"} 
                                className="shrink-0"
                              >
                                {opp.priority}
                              </Badge>
                            </div>
                          ))}
                          {openOpportunities.length > 3 && (
                            <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setActiveTab("fairness")}>
                              View all {openOpportunities.length} opportunities
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No open opportunities
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className={`border-l-4 ${workloadImbalances.length > 0 ? 'border-l-yellow-500' : 'border-l-green-500'}`} data-testid="card-workload-alerts">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          {workloadImbalances.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          Workload Balance
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {workloadImbalances.length > 0 ? (
                        <div className="space-y-2">
                          {workloadImbalances.slice(0, 3).map((w) => (
                            <div
                              key={w.memberId}
                              className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                              data-testid={`workload-${w.memberId}`}
                            >
                              <span className="text-sm truncate">{w.memberName}</span>
                              <Badge variant={w.isOverloaded ? "destructive" : "secondary"}>
                                {w.isOverloaded ? "Overloaded" : "Available"}
                              </Badge>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="w-full mt-1" onClick={() => setActiveTab("fairness")}>
                            View fairness dashboard
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Workloads are balanced
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-purple-500" data-testid="card-member-standing">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-purple-500" />
                          Your Standing
                        </CardTitle>
                        {myCurrentRole && (
                          <div className="flex items-center gap-1">
                            {getRoleIcon(myCurrentRole.tier)}
                            <span className="text-xs font-medium">{myCurrentRole.name}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {myMembership ? (
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Revenue earned</span>
                              <span>{formatCurrency(myCurrentRevenue)}</span>
                            </div>
                            {nextRole ? (
                              <>
                                <Progress value={progressToNext} className="h-2" />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatCurrency(revenueToNext)} to {nextRole.name} ({nextRole.multiplier}x)
                                </p>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-sm">
                                <Crown className="h-4 w-4 text-yellow-500" />
                                <span>Maximum rank achieved!</span>
                              </div>
                            )}
                          </div>
                          {myMembership.isCouncilMember && (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                              <Crown className="h-3 w-3 mr-1" />
                              Council Member
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Not a DAO member yet
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Projects</CardTitle>
                    <CardDescription>Latest project activity</CardDescription>
                  </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {projects && projects.length > 0 ? (
                      <div className="space-y-4">
                        {projects.slice(0, 5).map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                            data-testid={`project-item-${project.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{project.projectName}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(project.totalValue)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(project.status)}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Building2 className="h-8 w-8 mb-2" />
                        <p>No projects yet</p>
                        <Link href="/dao/projects/new">
                          <Button variant="ghost" size="sm">Create your first project</Button>
                        </Link>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Service Catalog</CardTitle>
                  <CardDescription>Available services by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceCategories.map(({ category, count }) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                        data-testid={`category-${category}`}
                      >
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{category.replace(/_/g, " ")}</span>
                        </div>
                        <Badge variant="secondary">{count} services</Badge>
                      </div>
                    ))}
                    {serviceCategories.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <p>No services configured</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Invoices</CardTitle>
                  <CardDescription>Awaiting payment</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {pendingInvoices.length > 0 ? (
                      <div className="space-y-3">
                        {pendingInvoices.slice(0, 5).map((invoice) => (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                            data-testid={`invoice-item-${invoice.id}`}
                          >
                            <div>
                              <p className="font-medium">{invoice.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(invoice.dueDate).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                              {getStatusBadge(invoice.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2" />
                        <p>No pending invoices</p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rank Progression</CardTitle>
                  <CardDescription>7-tier advancement system</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sortedRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-2 rounded-lg hover-elevate"
                        data-testid={`role-${role.id}`}
                      >
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.tier)}
                          <span className="font-medium">{role.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{role.multiplier}x</Badge>
                          {role.cumulativeRevenueRequired > 0 && (
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(role.cumulativeRevenueRequired)}+
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Safe Transactions
                      </CardTitle>
                      <CardDescription>Recent multi-sig activity</CardDescription>
                    </div>
                    {pendingTxs && pendingTxs.length > 0 && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <Clock className="h-3 w-3 mr-1" />
                        {pendingTxs.length} pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {recentTxs && recentTxs.length > 0 ? (
                      <div className="space-y-3">
                        {recentTxs.slice(0, 5).map((tx) => (
                          <div
                            key={tx.safeTxHash}
                            className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                            data-testid={`safe-tx-${tx.safeTxHash.slice(0, 8)}`}
                          >
                            <div className="flex items-center gap-3">
                              {tx.txType === "transfer" ? (
                                <div className="p-2 rounded-lg bg-green-500/10">
                                  <Send className="h-4 w-4 text-green-500" />
                                </div>
                              ) : tx.txType === "settings_change" ? (
                                <div className="p-2 rounded-lg bg-yellow-500/10">
                                  <Settings className="h-4 w-4 text-yellow-500" />
                                </div>
                              ) : (
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                  <FileText className="h-4 w-4 text-blue-500" />
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {tx.txType.replace("_", " ")}
                                </p>
                                {tx.formattedValue && tx.value !== "0" && (
                                  <p className="text-xs text-muted-foreground">{tx.formattedValue}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  tx.status === "executed" ? "default" :
                                  tx.status === "awaiting_execution" ? "secondary" :
                                  tx.status === "awaiting_confirmations" ? "outline" :
                                  tx.status === "failed" ? "destructive" : "outline"
                                }
                              >
                                {tx.status === "awaiting_confirmations" ? "Pending" :
                                 tx.status === "awaiting_execution" ? "Ready" :
                                 tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Vault className="h-8 w-8 mb-2" />
                        <p>No transactions synced</p>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("safe-wallets")}>
                          Sync wallets
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>All Projects</CardTitle>
                  <CardDescription>Complete project list with status and values</CardDescription>
                </div>
                <Link href="/dao/projects/new">
                  <Button size="sm" data-testid="button-new-project-tab">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {projects && projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                        data-testid={`project-row-${project.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{project.projectName}</p>
                            {getStatusBadge(project.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(project.totalValue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">No projects yet</p>
                    <p className="text-sm mb-4">Create your first project to get started</p>
                    <Link href="/dao/projects/new">
                      <Button>Create Project</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>Invoice status and payment tracking</CardDescription>
              </CardHeader>
              <CardContent>
                {invoices && invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                        data-testid={`invoice-row-${invoice.id}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{invoice.invoiceNumber}</p>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due: {new Date(invoice.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(invoice.totalAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">No invoices yet</p>
                    <p className="text-sm">Invoices will appear here when projects are created</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle>DAO Members</CardTitle>
                  <CardDescription>Member roster with ranks and revenue attribution</CardDescription>
                </div>
                {isAdmin && (
                  <Button size="sm" onClick={() => setIsAddMemberOpen(true)} data-testid="button-add-dao-member">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {memberships && memberships.length > 0 ? (
                  <div className="space-y-4">
                    {memberships.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                        data-testid={`member-row-${member.id}`}
                      >
                        <div className="flex items-center gap-3">
                          {member.isCouncilMember && (
                            <Crown className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {member.user?.username || member.userId}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.role?.name || `Tier ${member.roleId}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(member.cumulativeRevenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cumulative Revenue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-lg font-medium">No members yet</p>
                    <p className="text-sm mb-4">Add members to start tracking DAO participation</p>
                    {isAdmin && (
                      <Button onClick={() => setIsAddMemberOpen(true)} data-testid="button-add-first-member">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Member
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Rank Progression System</CardTitle>
                <CardDescription>7-tier advancement with performance multipliers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles?.map((role) => (
                    <div
                      key={role.id}
                      className="p-4 rounded-lg border hover-elevate"
                      data-testid={`role-card-${role.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getRoleIcon(role.tier)}
                          <div>
                            <p className="font-medium text-lg">{role.name}</p>
                            <p className="text-sm text-muted-foreground">Tier {role.tier}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-lg px-3">
                            {role.multiplier}x
                          </Badge>
                          {role.isCouncilEligible && (
                            <Badge variant="default">Council Eligible</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Revenue threshold: {formatCurrency(role.cumulativeRevenueRequired)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safe-wallets" className="mt-6">
            <DaoSafeWallets />
          </TabsContent>

          <TabsContent value="fairness" className="mt-6">
            <DaoFairnessDashboard />
          </TabsContent>
        </Tabs>
      </div>

      <AddDaoMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
      />
    </div>
  );
}
