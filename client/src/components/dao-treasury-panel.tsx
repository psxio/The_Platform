import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  Crown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Gift,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

type DaoTreasury = {
  id: number;
  balance: number;
  lastBonusTriggerBalance: number;
  bonusTriggerThreshold: number;
  lastBonusDistribution: string | null;
};

type DaoRole = {
  id: number;
  name: string;
  tier: number;
  multiplier: string;
  cumulativeRevenueRequired: number;
  isCouncilEligible: boolean;
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

type BonusRun = {
  id: number;
  triggerBalance: number;
  totalDistributed: number;
  participantCount: number;
  status: string;
  createdAt: string;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function calculateBonusShare(
  member: DaoMembership,
  totalPool: number,
  allMembers: DaoMembership[]
): number {
  const multiplier = parseFloat(member.role?.multiplier || "1");
  const totalWeightedShare = allMembers.reduce((sum, m) => {
    const mult = parseFloat(m.role?.multiplier || "1");
    return sum + mult;
  }, 0);
  return Math.round((multiplier / totalWeightedShare) * totalPool);
}

export function DaoTreasuryPanel({ isCouncilMember = false }: { isCouncilMember?: boolean }) {
  const { toast } = useToast();
  const [isBonusDialogOpen, setIsBonusDialogOpen] = useState(false);

  const { data: treasury, isLoading: treasuryLoading } = useQuery<DaoTreasury>({
    queryKey: ["/api/dao/treasury"],
  });

  const { data: roles } = useQuery<DaoRole[]>({
    queryKey: ["/api/dao/roles"],
  });

  const { data: memberships } = useQuery<DaoMembership[]>({
    queryKey: ["/api/dao/memberships"],
  });

  const { data: bonusRuns } = useQuery<BonusRun[]>({
    queryKey: ["/api/dao/bonus-runs"],
  });

  const triggerBonusMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/dao/bonus-runs", {});
    },
    onSuccess: () => {
      toast({ title: "Bonus distribution triggered successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/treasury"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/bonus-runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/memberships"] });
      setIsBonusDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to trigger bonus",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const treasuryBalance = treasury?.balance || 0;
  const bonusThreshold = treasury?.bonusTriggerThreshold || 10000000;
  const bonusProgress = Math.min((treasuryBalance / bonusThreshold) * 100, 100);
  const canTriggerBonus = treasuryBalance >= bonusThreshold && isCouncilMember;
  const bonusPool = treasuryBalance >= bonusThreshold ? treasuryBalance : 0;

  const eligibleMembers = memberships?.filter(m => m.role) || [];
  const councilMembers = memberships?.filter(m => m.isCouncilMember) || [];

  return (
    <div className="space-y-6">
      <Card data-testid="card-treasury-overview">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Treasury Balance
              </CardTitle>
              <CardDescription>
                15% of all project revenue is allocated to treasury
              </CardDescription>
            </div>
            {canTriggerBonus && (
              <Dialog open={isBonusDialogOpen} onOpenChange={setIsBonusDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" data-testid="button-trigger-bonus">
                    <Gift className="h-4 w-4" />
                    Distribute Bonus
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Trigger Bonus Distribution</DialogTitle>
                    <DialogDescription>
                      Distribute treasury funds to eligible members based on their rank multipliers
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Distribution Pool</span>
                        <span className="text-2xl font-bold">{formatCurrency(bonusPool)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Will be distributed to {eligibleMembers.length} eligible members
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Distribution Preview</h4>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {eligibleMembers.map((member) => {
                            const share = calculateBonusShare(member, bonusPool, eligibleMembers);
                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-2 rounded-lg border"
                              >
                                <div className="flex items-center gap-2">
                                  {member.isCouncilMember && (
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                  )}
                                  <span className="font-medium">
                                    {member.user?.username || member.userId}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {member.role?.multiplier}x
                                  </Badge>
                                </div>
                                <span className="font-semibold">{formatCurrency(share)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBonusDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => triggerBonusMutation.mutate()}
                      disabled={triggerBonusMutation.isPending}
                      data-testid="button-confirm-bonus"
                    >
                      {triggerBonusMutation.isPending ? "Processing..." : "Confirm Distribution"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{formatCurrency(treasuryBalance)}</p>
              <p className="text-sm text-muted-foreground mt-1">Current Treasury Balance</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Bonus Trigger Progress</span>
                <span className="font-medium">
                  {formatCurrency(treasuryBalance)} / {formatCurrency(bonusThreshold)}
                </span>
              </div>
              <Progress value={bonusProgress} className="h-3" />
              <div className="flex items-center justify-center gap-2 text-sm">
                {bonusProgress >= 100 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">Bonus threshold reached!</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatCurrency(bonusThreshold - treasuryBalance)} until bonus trigger
                    </span>
                  </>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Threshold</span>
                </div>
                <p className="text-lg font-semibold">{formatCurrency(bonusThreshold)}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Eligible Members</span>
                </div>
                <p className="text-lg font-semibold">{eligibleMembers.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Crown className="h-4 w-4" />
                  <span className="text-sm">Council Members</span>
                </div>
                <p className="text-lg font-semibold">{councilMembers.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Bonus Distribution History
          </CardTitle>
          <CardDescription>
            Past bonus runs and distributions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bonusRuns && bonusRuns.length > 0 ? (
            <div className="space-y-3">
              {bonusRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`bonus-run-${run.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <Gift className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {formatCurrency(run.totalDistributed)} Distributed
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleDateString()} • {run.participantCount} participants
                      </p>
                    </div>
                  </div>
                  <Badge variant={run.status === "completed" ? "default" : "secondary"}>
                    {run.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-8 w-8 mx-auto mb-2" />
              <p>No bonus distributions yet</p>
              <p className="text-sm">Distributions occur when treasury reaches threshold</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Multiplier Reference
          </CardTitle>
          <CardDescription>
            Bonus shares are weighted by rank multiplier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {roles?.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                data-testid={`multiplier-ref-${role.id}`}
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">Tier {role.tier}</Badge>
                  <span className="font-medium">{role.name}</span>
                </div>
                <Badge variant="secondary" className="text-lg px-3">
                  {role.multiplier}x
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
