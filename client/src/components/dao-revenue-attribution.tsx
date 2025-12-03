import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  DollarSign, 
  Users, 
  PieChart, 
  Plus, 
  Edit2, 
  Save,
  FileText,
  User,
  Briefcase,
  Target,
  Handshake
} from "lucide-react";

type Attribution = {
  id: number;
  projectId: number;
  membershipId: number;
  roleSlot: string;
  percentAllocation: number;
  attributedAmount?: number;
  performanceMultiplier?: number;
  isApproved?: boolean;
  notes?: string;
};

type Debrief = {
  id: number;
  projectId: number;
  submittedBy: string;
  whatWentWell?: string;
  whatCouldImprove?: string;
  lessonsLearned?: string;
  attributionConfirmed?: boolean;
  completedAt?: string;
};

type DirectoryMember = {
  id: number;
  person: string;
  skill: string;
  userId?: string;
};

const DEFAULT_SPLITS = [
  { roleType: "biz_dev", label: "Business Development", percent: 30, icon: Handshake, description: "Client acquisition and relationship" },
  { roleType: "treasury", label: "Treasury", percent: 15, icon: DollarSign, description: "DAO treasury allocation" },
  { roleType: "project_lead", label: "Project Lead", percent: 40, icon: Target, description: "Project execution and delivery" },
  { roleType: "support", label: "Support Team", percent: 10, icon: Users, description: "Additional team contributions" },
  { roleType: "referral", label: "Referral", percent: 5, icon: User, description: "Referral bonus" },
];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function DaoRevenueAttribution({ 
  projectId, 
  projectValue,
  isCouncilMember = false
}: { 
  projectId: number; 
  projectValue: number;
  isCouncilMember?: boolean;
}) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [splits, setSplits] = useState(DEFAULT_SPLITS.map(s => ({ ...s })));
  const [isDebriefOpen, setIsDebriefOpen] = useState(false);
  const [debriefForm, setDebriefForm] = useState({
    summary: "",
    lessonsLearned: "",
    improvements: "",
    clientFeedback: "",
  });

  const { data: attributions, isLoading: attributionsLoading } = useQuery<Attribution[]>({
    queryKey: [`/api/dao/projects/${projectId}/attributions`],
    enabled: !!projectId,
  });

  const { data: debriefs, isLoading: debriefsLoading } = useQuery<Debrief[]>({
    queryKey: [`/api/dao/projects/${projectId}/debriefs`],
    enabled: !!projectId,
  });

  const { data: members } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  useEffect(() => {
    if (attributions && attributions.length > 0) {
      const hydratedSplits = DEFAULT_SPLITS.map(defaultSplit => {
        const savedAttribution = attributions.find(a => a.roleSlot === defaultSplit.roleType);
        return {
          ...defaultSplit,
          percent: savedAttribution?.percentAllocation ?? defaultSplit.percent,
        };
      });
      setSplits(hydratedSplits);
    }
  }, [attributions]);

  useEffect(() => {
    if (debriefs && debriefs.length > 0) {
      const latest = debriefs[0];
      setDebriefForm({
        summary: latest.whatWentWell || "",
        lessonsLearned: latest.lessonsLearned || "",
        improvements: latest.whatCouldImprove || "",
        clientFeedback: "",
      });
    }
  }, [debriefs]);

  const saveAttributionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/dao/attributions", { ...data, projectId });
    },
    onSuccess: () => {
      toast({ title: "Attribution saved successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/dao/projects/${projectId}/attributions`] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save attribution",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitDebriefMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/dao/debriefs", { ...data, projectId });
    },
    onSuccess: () => {
      toast({ title: "Debrief submitted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/dao/projects/${projectId}/debriefs`] });
      setIsDebriefOpen(false);
      setDebriefForm({
        summary: "",
        lessonsLearned: "",
        improvements: "",
        clientFeedback: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit debrief",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = attributionsLoading || debriefsLoading;

  const totalPercent = splits.reduce((sum, s) => sum + s.percent, 0);
  const isValidSplit = totalPercent === 100;

  const handleSplitChange = (roleType: string, newPercent: number) => {
    setSplits(
      splits.map((s) =>
        s.roleType === roleType ? { ...s, percent: newPercent } : s
      )
    );
  };

  const handleSave = () => {
    if (!isValidSplit) {
      toast({
        title: "Invalid split",
        description: "Total must equal 100%",
        variant: "destructive",
      });
      return;
    }

    saveAttributionMutation.mutate({
      splits: splits.map((s) => ({
        roleSlot: s.roleType,
        percentAllocation: s.percent,
        attributedAmount: Math.round((projectValue * s.percent) / 100),
      })),
    });
  };

  const handleDebriefSubmit = () => {
    if (!debriefForm.summary) {
      toast({
        title: "Summary required",
        description: "Please provide a project summary",
        variant: "destructive",
      });
      return;
    }

    submitDebriefMutation.mutate({
      whatWentWell: debriefForm.summary,
      whatCouldImprove: debriefForm.improvements,
      lessonsLearned: debriefForm.lessonsLearned,
    });
  };

  const latestDebrief = debriefs?.[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Revenue Attribution
            </CardTitle>
            <CardDescription>
              Project value: {formatCurrency(projectValue)}
            </CardDescription>
          </div>
          {isCouncilMember && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={isEditing && !isValidSplit}
              data-testid="button-edit-attribution"
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Override
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {splits.map((split) => {
              const Icon = split.icon;
              const amount = Math.round((projectValue * split.percent) / 100);
              
              return (
                <div
                  key={split.roleType}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                  data-testid={`attribution-${split.roleType}`}
                >
                  <div className="p-2 rounded-md bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{split.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {split.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={split.percent}
                          onChange={(e) =>
                            handleSplitChange(split.roleType, Number(e.target.value))
                          }
                          className="w-20 text-right"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-lg px-3">
                        {split.percent}%
                      </Badge>
                    )}
                    <div className="w-24 text-right">
                      <p className="font-semibold">{formatCurrency(amount)}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Total</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={isValidSplit ? "default" : "destructive"}
                  className="text-lg px-3"
                >
                  {totalPercent}%
                </Badge>
                <p className="text-lg font-bold">{formatCurrency(projectValue)}</p>
              </div>
            </div>

            {!isValidSplit && isEditing && (
              <p className="text-sm text-destructive text-center">
                Total must equal 100% (currently {totalPercent}%)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Debrief
            </CardTitle>
            <CardDescription>
              Document lessons learned and improvements
            </CardDescription>
          </div>
          <Dialog open={isDebriefOpen} onOpenChange={setIsDebriefOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-debrief">
                <Plus className="h-4 w-4 mr-2" />
                Add Debrief
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Submit Project Debrief</DialogTitle>
                <DialogDescription>
                  Document your project experience and learnings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="summary">Project Summary</Label>
                  <Textarea
                    id="summary"
                    value={debriefForm.summary}
                    onChange={(e) =>
                      setDebriefForm({ ...debriefForm, summary: e.target.value })
                    }
                    placeholder="Brief summary of the project and outcomes"
                    className="mt-1"
                    data-testid="input-debrief-summary"
                  />
                </div>
                <div>
                  <Label htmlFor="lessonsLearned">Lessons Learned</Label>
                  <Textarea
                    id="lessonsLearned"
                    value={debriefForm.lessonsLearned}
                    onChange={(e) =>
                      setDebriefForm({
                        ...debriefForm,
                        lessonsLearned: e.target.value,
                      })
                    }
                    placeholder="Key takeaways and lessons from this project"
                    className="mt-1"
                    data-testid="input-lessons-learned"
                  />
                </div>
                <div>
                  <Label htmlFor="improvements">Suggested Improvements</Label>
                  <Textarea
                    id="improvements"
                    value={debriefForm.improvements}
                    onChange={(e) =>
                      setDebriefForm({
                        ...debriefForm,
                        improvements: e.target.value,
                      })
                    }
                    placeholder="What could be done better next time?"
                    className="mt-1"
                    data-testid="input-improvements"
                  />
                </div>
                <div>
                  <Label htmlFor="clientFeedback">Client Feedback</Label>
                  <Textarea
                    id="clientFeedback"
                    value={debriefForm.clientFeedback}
                    onChange={(e) =>
                      setDebriefForm({
                        ...debriefForm,
                        clientFeedback: e.target.value,
                      })
                    }
                    placeholder="Summary of client feedback received"
                    className="mt-1"
                    data-testid="input-client-feedback"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDebriefOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDebriefSubmit}
                  disabled={submitDebriefMutation.isPending}
                  data-testid="button-submit-debrief"
                >
                  {submitDebriefMutation.isPending ? "Submitting..." : "Submit Debrief"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {latestDebrief ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">
                    {latestDebrief.status === "submitted" ? "Submitted" : latestDebrief.status}
                  </Badge>
                </div>
                {latestDebrief.summary && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Summary</p>
                    <p className="text-sm">{latestDebrief.summary}</p>
                  </div>
                )}
                {latestDebrief.lessonsLearned && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Lessons Learned</p>
                    <p className="text-sm">{latestDebrief.lessonsLearned}</p>
                  </div>
                )}
                {latestDebrief.improvements && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Improvements</p>
                    <p className="text-sm">{latestDebrief.improvements}</p>
                  </div>
                )}
                {latestDebrief.clientFeedback && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Client Feedback</p>
                    <p className="text-sm">{latestDebrief.clientFeedback}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2" />
              <p>No debrief submitted yet</p>
              <p className="text-sm">Add a debrief to document project learnings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
