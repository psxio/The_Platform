import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Scale, 
  TrendingUp, 
  Users, 
  Target, 
  Star, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Briefcase,
  Calendar,
  Hand,
  Lightbulb,
  Plus,
  RefreshCw,
  Award,
  BarChart3,
  Loader2,
  Eye
} from "lucide-react";

type DaoMemberSkill = {
  id: number;
  membershipId: number;
  serviceCategory: string;
  specificService: string | null;
  proficiencyLevel: number;
  yearsExperience: number | null;
  portfolioLinks: string | null;
  isVerified: boolean;
};

type DaoMemberAvailability = {
  id: number;
  membershipId: number;
  weeklyHoursAvailable: number | null;
  isAvailableForNewProjects: boolean;
  preferredProjectTypes: string | null;
  unavailableUntil: string | null;
  notes: string | null;
};

type DaoConsistencyMetrics = {
  id: number;
  membershipId: number;
  onTimeDeliveryRate: number | null;
  collaborationScore: number | null;
  qualityScore: number | null;
  responsibilityScore: number | null;
  overallReliabilityScore: number | null;
  totalProjectsCompleted: number | null;
  leadRoleCount: number | null;
  pmRoleCount: number | null;
  coreRoleCount: number | null;
  supportRoleCount: number | null;
  avgPeerRating: number | null;
  totalPeerRatings: number | null;
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
  createdAt: string;
};

type DaoRoleBid = {
  id: number;
  opportunityId: number;
  membershipId: number;
  preferredRole: string;
  alternateRole: string | null;
  motivation: string | null;
  status: string;
};

type DaoMembership = {
  id: number;
  userId: string;
  roleId: number;
  cumulativeRevenue: number;
  isCouncilMember: boolean;
  user?: { username: string; firstName?: string; lastName?: string };
  role?: { name: string; tier: number };
};

type FairnessDashboardData = {
  metrics: DaoConsistencyMetrics[];
  availability: DaoMemberAvailability[];
  skills: DaoMemberSkill[];
  openOpportunities: DaoProjectOpportunity[];
  recentAssignments: any[];
  workloadByMember: { [key: number]: { lead: number; pm: number; core: number; support: number } };
  skillCoverage: { [key: string]: number };
};

const SERVICE_CATEGORIES = [
  "strategy_consulting",
  "development",
  "design_ux",
  "marketing_growth",
  "retainers",
];

const ROLE_SLOTS = ["lead", "pm", "core", "support"];

function getProficiencyLabel(level: number): string {
  switch (level) {
    case 1: return "Beginner";
    case 2: return "Basic";
    case 3: return "Intermediate";
    case 4: return "Advanced";
    case 5: return "Expert";
    default: return "Unknown";
  }
}

function getProficiencyColor(level: number): string {
  switch (level) {
    case 1: return "bg-slate-500";
    case 2: return "bg-blue-500";
    case 3: return "bg-green-500";
    case 4: return "bg-purple-500";
    case 5: return "bg-yellow-500";
    default: return "bg-gray-500";
  }
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DaoFairnessDashboard() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("workload");
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({
    serviceCategory: "",
    specificService: "",
    proficiencyLevel: "3",
    yearsExperience: "",
  });

  const { data: dashboardData, isLoading } = useQuery<FairnessDashboardData>({
    queryKey: ["/api/dao/fairness-dashboard"],
  });

  const { data: memberships } = useQuery<DaoMembership[]>({
    queryKey: ["/api/dao/memberships"],
  });

  const { data: opportunities } = useQuery<DaoProjectOpportunity[]>({
    queryKey: ["/api/dao/project-opportunities"],
  });

  const { data: roleBids } = useQuery<DaoRoleBid[]>({
    queryKey: ["/api/dao/role-bids"],
  });

  const addSkillMutation = useMutation({
    mutationFn: (skill: any) => apiRequest("POST", "/api/dao/member-skills", skill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dao/fairness-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/member-skills"] });
      setIsAddSkillOpen(false);
      setNewSkill({ serviceCategory: "", specificService: "", proficiencyLevel: "3", yearsExperience: "" });
      toast({ title: "Skill Added", description: "Your skill has been added to your profile" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add skill", variant: "destructive" });
    },
  });

  const createBidMutation = useMutation({
    mutationFn: (bid: any) => apiRequest("POST", "/api/dao/role-bids", bid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dao/role-bids"] });
      toast({ title: "Interest Submitted", description: "Your interest has been recorded" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit interest", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getMemberName = (membershipId: number): string => {
    const membership = memberships?.find(m => m.id === membershipId);
    if (!membership?.user) return `Member #${membershipId}`;
    return membership.user.firstName || membership.user.username || `Member #${membershipId}`;
  };

  const getWorkloadScore = (workload: { lead: number; pm: number; core: number; support: number }): number => {
    return (workload.lead * 3) + (workload.pm * 2) + (workload.core * 1) + (workload.support * 0.5);
  };

  const workloadEntries = Object.entries(dashboardData?.workloadByMember || {}).map(([id, workload]) => ({
    membershipId: parseInt(id),
    ...workload,
    totalScore: getWorkloadScore(workload),
  })).sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Fairness & Role Assignment
          </h2>
          <p className="text-muted-foreground">
            Track workload distribution, skills, and opportunity allocation
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="btn-add-skill">
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a New Skill</DialogTitle>
                <DialogDescription>
                  Add a skill to your profile to be considered for matching projects
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Service Category</Label>
                  <Select
                    value={newSkill.serviceCategory}
                    onValueChange={(v) => setNewSkill({ ...newSkill, serviceCategory: v })}
                  >
                    <SelectTrigger data-testid="select-service-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Specific Service (optional)</Label>
                  <Input
                    value={newSkill.specificService}
                    onChange={(e) => setNewSkill({ ...newSkill, specificService: e.target.value })}
                    placeholder="e.g., Smart Contract Development"
                    data-testid="input-specific-service"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proficiency Level (1-5)</Label>
                  <Select
                    value={newSkill.proficiencyLevel}
                    onValueChange={(v) => setNewSkill({ ...newSkill, proficiencyLevel: v })}
                  >
                    <SelectTrigger data-testid="select-proficiency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Beginner</SelectItem>
                      <SelectItem value="2">2 - Basic</SelectItem>
                      <SelectItem value="3">3 - Intermediate</SelectItem>
                      <SelectItem value="4">4 - Advanced</SelectItem>
                      <SelectItem value="5">5 - Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Years of Experience (optional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newSkill.yearsExperience}
                    onChange={(e) => setNewSkill({ ...newSkill, yearsExperience: e.target.value })}
                    placeholder="Years"
                    data-testid="input-years-experience"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!selectedMembershipId || !newSkill.serviceCategory) {
                      toast({ title: "Error", description: "Please select your membership and category", variant: "destructive" });
                      return;
                    }
                    addSkillMutation.mutate({
                      membershipId: selectedMembershipId,
                      serviceCategory: newSkill.serviceCategory,
                      specificService: newSkill.specificService || null,
                      proficiencyLevel: parseInt(newSkill.proficiencyLevel),
                      yearsExperience: newSkill.yearsExperience ? parseInt(newSkill.yearsExperience) : null,
                    });
                  }}
                  disabled={addSkillMutation.isPending}
                  data-testid="btn-submit-skill"
                >
                  {addSkillMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Skill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-active-members">
              {memberships?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.availability?.filter(a => a.isAvailableForNewProjects).length || 0} available for new projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Open Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-open-opportunities">
              {dashboardData?.openOpportunities?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Projects seeking team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skills Registered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-skills-registered">
              {dashboardData?.skills?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {Object.keys(dashboardData?.skillCoverage || {}).length} categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-recent-assignments">
              {dashboardData?.recentAssignments?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Role assignments tracked
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="workload" className="gap-2" data-testid="subtab-workload">
            <Scale className="h-4 w-4" />
            Workload Balance
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-2" data-testid="subtab-opportunities">
            <Lightbulb className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2" data-testid="subtab-skills">
            <Star className="h-4 w-4" />
            Skills Matrix
          </TabsTrigger>
          <TabsTrigger value="consistency" className="gap-2" data-testid="subtab-consistency">
            <TrendingUp className="h-4 w-4" />
            Consistency Scores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Workload Distribution</CardTitle>
              <CardDescription>
                See how lead/PM roles are distributed across members to ensure fairness
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {workloadEntries.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No workload data yet</p>
                      <p className="text-sm">Complete projects to see workload distribution</p>
                    </div>
                  ) : (
                    workloadEntries.map((entry) => (
                      <div
                        key={entry.membershipId}
                        className="p-4 border rounded-lg space-y-3"
                        data-testid={`workload-member-${entry.membershipId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{getMemberName(entry.membershipId)}</div>
                          <Badge variant="secondary">
                            Score: {entry.totalScore.toFixed(1)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="p-2 bg-purple-500/10 rounded">
                            <div className="text-xs text-muted-foreground">Lead</div>
                            <div className="font-bold text-purple-600 dark:text-purple-400">{entry.lead}</div>
                          </div>
                          <div className="p-2 bg-blue-500/10 rounded">
                            <div className="text-xs text-muted-foreground">PM</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400">{entry.pm}</div>
                          </div>
                          <div className="p-2 bg-green-500/10 rounded">
                            <div className="text-xs text-muted-foreground">Core</div>
                            <div className="font-bold text-green-600 dark:text-green-400">{entry.core}</div>
                          </div>
                          <div className="p-2 bg-slate-500/10 rounded">
                            <div className="text-xs text-muted-foreground">Support</div>
                            <div className="font-bold text-slate-600 dark:text-slate-400">{entry.support}</div>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min((entry.totalScore / 20) * 100, 100)} 
                          className="h-2"
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Project Opportunities</CardTitle>
              <CardDescription>
                Express interest in upcoming projects for fair role assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {opportunities?.filter(o => o.status === "open").length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No open opportunities right now</p>
                      <p className="text-sm">Check back later for new projects</p>
                    </div>
                  ) : (
                    opportunities?.filter(o => o.status === "open").map((opp) => {
                      const oppBids = roleBids?.filter(b => b.opportunityId === opp.id) || [];
                      return (
                        <div
                          key={opp.id}
                          className="p-4 border rounded-lg space-y-3 hover-elevate"
                          data-testid={`opportunity-${opp.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{opp.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {opp.description || "No description"}
                              </p>
                            </div>
                            <Badge variant={opp.priority === "high" ? "destructive" : opp.priority === "medium" ? "default" : "secondary"}>
                              {opp.priority}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {opp.rolesNeeded?.map(role => (
                              <Badge key={role} variant="outline">{role}</Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-4 text-muted-foreground">
                              {opp.estimatedValue && (
                                <span>{formatCurrency(opp.estimatedValue)}</span>
                              )}
                              {opp.bidDeadline && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Deadline: {new Date(opp.bidDeadline).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {oppBids.length} interested
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (!selectedMembershipId) {
                                    toast({ title: "Select Membership", description: "Please select your membership first", variant: "destructive" });
                                    return;
                                  }
                                  createBidMutation.mutate({
                                    opportunityId: opp.id,
                                    membershipId: selectedMembershipId,
                                    preferredRole: opp.rolesNeeded?.[0] || "core",
                                  });
                                }}
                                data-testid={`btn-express-interest-${opp.id}`}
                              >
                                <Hand className="h-3 w-3 mr-1" />
                                Express Interest
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills Matrix</CardTitle>
              <CardDescription>
                Member skills across service categories for matching
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData?.skills?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No skills registered yet</p>
                      <p className="text-sm">Add your skills to be matched with suitable projects</p>
                    </div>
                  ) : (
                    SERVICE_CATEGORIES.map(category => {
                      const categorySkills = dashboardData?.skills?.filter(s => s.serviceCategory === category) || [];
                      if (categorySkills.length === 0) return null;
                      return (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium capitalize">
                            {category.replace(/_/g, " ")}
                          </h4>
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                            {categorySkills.map(skill => (
                              <div
                                key={skill.id}
                                className="p-3 border rounded-lg flex items-center justify-between"
                                data-testid={`skill-${skill.id}`}
                              >
                                <div>
                                  <div className="font-medium text-sm">
                                    {getMemberName(skill.membershipId)}
                                  </div>
                                  {skill.specificService && (
                                    <div className="text-xs text-muted-foreground">
                                      {skill.specificService}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge className={getProficiencyColor(skill.proficiencyLevel)}>
                                    {getProficiencyLabel(skill.proficiencyLevel)}
                                  </Badge>
                                  {skill.isVerified && (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consistency" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Consistency & Reliability Scores</CardTitle>
              <CardDescription>
                Track reliability separate from revenue performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {dashboardData?.metrics?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No consistency data yet</p>
                      <p className="text-sm">Complete projects and receive peer feedback to build scores</p>
                    </div>
                  ) : (
                    dashboardData?.metrics?.map((metric) => (
                      <div
                        key={metric.id}
                        className="p-4 border rounded-lg space-y-3"
                        data-testid={`consistency-member-${metric.membershipId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{getMemberName(metric.membershipId)}</div>
                          <div className={`text-2xl font-bold ${getScoreColor(metric.overallReliabilityScore)}`}>
                            {metric.overallReliabilityScore?.toFixed(0) || "—"}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">On-Time Delivery</div>
                            <div className={`font-medium ${getScoreColor(metric.onTimeDeliveryRate)}`}>
                              {metric.onTimeDeliveryRate?.toFixed(0) || "—"}%
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Collaboration</div>
                            <div className={`font-medium ${getScoreColor(metric.collaborationScore)}`}>
                              {metric.collaborationScore?.toFixed(0) || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Quality</div>
                            <div className={`font-medium ${getScoreColor(metric.qualityScore)}`}>
                              {metric.qualityScore?.toFixed(0) || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Peer Rating</div>
                            <div className="font-medium">
                              {metric.avgPeerRating?.toFixed(1) || "—"} ({metric.totalPeerRatings || 0} reviews)
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {metric.totalProjectsCompleted || 0} projects completed
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Your Membership
          </CardTitle>
          <CardDescription>
            Select your membership to manage skills and express interest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedMembershipId?.toString() || ""}
            onValueChange={(v) => setSelectedMembershipId(parseInt(v))}
          >
            <SelectTrigger className="w-full max-w-sm" data-testid="select-membership">
              <SelectValue placeholder="Select your membership" />
            </SelectTrigger>
            <SelectContent>
              {memberships?.map(m => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.user?.firstName || m.user?.username || `Member #${m.id}`} - {m.role?.name || "Unknown Role"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
