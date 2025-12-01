import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Plus, 
  Send,
  Shield,
  MessageSquare,
  X,
  Workflow,
  ChevronRight,
  ArrowRight,
  Zap,
  SkipForward,
  AlertTriangle,
  Calendar,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Approval {
  id: number;
  taskId: number;
  reviewerId: string;
  status: "pending" | "approved" | "rejected" | "skipped";
  comments: string | null;
  createdAt: string;
  reviewedAt: string | null;
  stage: number;
  stageName: string | null;
  isRequired: boolean;
  dueDate: string | null;
  approver?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    profileImageUrl: string | null;
  };
}

interface ApprovalWorkflow {
  id: number;
  name: string;
  description: string | null;
  contentType: string | null;
  stages?: ApprovalWorkflowStage[];
}

interface ApprovalWorkflowStage {
  id: number;
  workflowId: number;
  stageName: string;
  stageOrder: number;
  reviewerRole: string | null;
  reviewerId: string | null;
  isRequired: boolean;
  daysToComplete: number | null;
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  profileImageUrl: string | null;
}

interface TaskApprovalsProps {
  taskId: number;
  currentUserId?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  skipped: {
    icon: SkipForward,
    label: "Skipped",
    className: "bg-muted text-muted-foreground border-muted",
  },
};

export function TaskApprovals({ taskId, currentUserId }: TaskApprovalsProps) {
  const { toast } = useToast();
  const [isAddingRequest, setIsAddingRequest] = useState(false);
  const [isApplyingWorkflow, setIsApplyingWorkflow] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] = useState("");
  const [responseComments, setResponseComments] = useState<{ [key: number]: string }>({});

  const { data: approvals, isLoading } = useQuery<Approval[]>({
    queryKey: ["/api/content-tasks", taskId, "approvals"],
    queryFn: async () => {
      const response = await fetch(`/api/content-tasks/${taskId}/approvals`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch approvals");
      return response.json();
    },
    enabled: !!taskId,
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch(`/api/users`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAddingRequest,
  });

  const { data: workflows } = useQuery<ApprovalWorkflow[]>({
    queryKey: ["/api/approval-workflows"],
    enabled: isApplyingWorkflow,
  });

  const applyWorkflowMutation = useMutation({
    mutationFn: async (workflowId: number) => {
      return apiRequest("POST", `/api/content-tasks/${taskId}/apply-workflow`, { workflowId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "activity"] });
      setSelectedWorkflow("");
      setIsApplyingWorkflow(false);
      toast({ title: "Workflow applied", description: "The approval workflow has been applied to this task." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply workflow.", variant: "destructive" });
    },
  });

  const requestApprovalMutation = useMutation({
    mutationFn: async (reviewerId: string) => {
      return apiRequest("POST", `/api/content-tasks/${taskId}/approvals`, { reviewerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "approvals"] });
      setSelectedApprover("");
      setIsAddingRequest(false);
      toast({ title: "Approval requested", description: "The approval request has been sent." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to request approval.", variant: "destructive" });
    },
  });

  const respondToApprovalMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: number; status: "approved" | "rejected"; comments?: string }) => {
      return apiRequest("PATCH", `/api/approvals/${id}`, { status, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "approvals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks", taskId, "activity"] });
      setResponseComments({});
      toast({ title: "Response submitted", description: "Your approval response has been recorded." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to respond to approval.", variant: "destructive" });
    },
  });

  const getInitials = (firstName: string | null, lastName: string | null, email: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    if (firstName) return firstName[0].toUpperCase();
    return email[0].toUpperCase();
  };

  const getUserName = (user?: { firstName: string | null; lastName: string | null; email: string }) => {
    if (!user) return "Unknown";
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.email;
  };

  const pendingApprovals = approvals?.filter(a => a.status === "pending") || [];
  const completedApprovals = approvals?.filter(a => a.status !== "pending") || [];
  const myPendingApprovals = pendingApprovals.filter(a => a.reviewerId === currentUserId);
  
  // Group approvals by stage for multi-stage workflow visualization
  const stageGroups = approvals ? approvals.reduce((acc, approval) => {
    const stage = approval.stage || 1;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(approval);
    return acc;
  }, {} as { [key: number]: Approval[] }) : {};
  
  const stages = Object.keys(stageGroups).map(Number).sort((a, b) => a - b);
  const hasMultipleStages = stages.length > 1;
  
  // Calculate approval progress
  const totalApprovals = approvals?.length || 0;
  const completedCount = completedApprovals.filter(a => a.status === "approved").length;
  const progressPercent = totalApprovals > 0 ? (completedCount / totalApprovals) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Approvals</h3>
          {pendingApprovals.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingApprovals.length} pending
            </Badge>
          )}
        </div>
        {!isAddingRequest && !isApplyingWorkflow && (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsApplyingWorkflow(true)}
              data-testid="button-apply-workflow"
            >
              <Workflow className="w-4 h-4 mr-1" />
              Apply Workflow
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddingRequest(true)}
              data-testid="button-request-approval"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Reviewer
            </Button>
          </div>
        )}
      </div>
      
      {/* Approval Progress (for multi-stage workflows) */}
      {approvals && approvals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Approval Progress</span>
            <span>{completedCount} of {totalApprovals} approved</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {hasMultipleStages && (
            <div className="flex items-center gap-1 flex-wrap">
              {stages.map((stage, index) => {
                const stageApprovals = stageGroups[stage];
                const allApproved = stageApprovals.every(a => a.status === "approved");
                const hasPending = stageApprovals.some(a => a.status === "pending");
                const stageName = stageApprovals[0]?.stageName || `Stage ${stage}`;
                
                return (
                  <div key={stage} className="flex items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs cursor-default",
                            allApproved && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
                            hasPending && !allApproved && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
                            !hasPending && !allApproved && "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                        >
                          {allApproved ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : hasPending ? (
                            <Clock className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {stageName}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{stageApprovals.length} reviewer(s) in this stage</p>
                      </TooltipContent>
                    </Tooltip>
                    {index < stages.length - 1 && (
                      <ArrowRight className="w-3 h-3 mx-1 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Apply Workflow Form */}
      {isApplyingWorkflow && (
        <div className="p-4 border rounded-md space-y-3 bg-primary/5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Workflow className="w-4 h-4 text-primary" />
            Apply Approval Workflow
          </div>
          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger data-testid="select-workflow">
              <SelectValue placeholder="Select a workflow..." />
            </SelectTrigger>
            <SelectContent>
              {workflows?.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id.toString()}>
                  <div>
                    <span className="font-medium">{workflow.name}</span>
                    {workflow.contentType && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({workflow.contentType})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            This will create approval stages with predefined reviewers based on the workflow template.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsApplyingWorkflow(false);
                setSelectedWorkflow("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => applyWorkflowMutation.mutate(parseInt(selectedWorkflow))}
              disabled={!selectedWorkflow || applyWorkflowMutation.isPending}
              data-testid="button-confirm-workflow"
            >
              <Zap className="w-4 h-4 mr-1" />
              {applyWorkflowMutation.isPending ? "Applying..." : "Apply Workflow"}
            </Button>
          </div>
        </div>
      )}

      {isAddingRequest && (
        <div className="p-4 border rounded-md space-y-3 bg-muted/30">
          <Select value={selectedApprover} onValueChange={setSelectedApprover}>
            <SelectTrigger data-testid="select-approver">
              <SelectValue placeholder="Select an approver..." />
            </SelectTrigger>
            <SelectContent>
              {allUsers?.filter(u => u.id !== currentUserId).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.firstName, user.lastName, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    {getUserName(user)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingRequest(false);
                setSelectedApprover("");
              }}
              data-testid="button-cancel-approval-request"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => requestApprovalMutation.mutate(selectedApprover)}
              disabled={!selectedApprover || requestApprovalMutation.isPending}
              data-testid="button-send-approval-request"
            >
              <Send className="w-4 h-4 mr-1" />
              {requestApprovalMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : approvals && approvals.length > 0 ? (
        <div className="space-y-3">
          {myPendingApprovals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Action Required
              </p>
              {myPendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="p-4 border-2 border-amber-500/30 rounded-md bg-amber-500/5 space-y-3"
                  data-testid={`approval-action-${approval.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-amber-600" />
                      <div>
                        <span className="text-sm font-medium">
                          {approval.stageName || "Approval"} requested
                        </span>
                        {approval.dueDate && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(approval.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {approval.stageName && (
                        <Badge variant="outline" className="text-xs">
                          Stage {approval.stage}
                        </Badge>
                      )}
                      <Badge variant="outline" className={statusConfig.pending.className}>
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Add a comment (optional)"
                      value={responseComments[approval.id] || ""}
                      onChange={(e) => setResponseComments(prev => ({
                        ...prev,
                        [approval.id]: e.target.value
                      }))}
                      className="flex-1 h-9"
                      data-testid={`input-approval-comment-${approval.id}`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => respondToApprovalMutation.mutate({
                        id: approval.id,
                        status: "rejected",
                        comments: responseComments[approval.id]
                      })}
                      disabled={respondToApprovalMutation.isPending}
                      data-testid={`button-reject-${approval.id}`}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => respondToApprovalMutation.mutate({
                        id: approval.id,
                        status: "approved",
                        comments: responseComments[approval.id]
                      })}
                      disabled={respondToApprovalMutation.isPending}
                      data-testid={`button-approve-${approval.id}`}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingApprovals.filter(a => a.reviewerId !== currentUserId).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Awaiting Response
              </p>
              {pendingApprovals.filter(a => a.reviewerId !== currentUserId).map((approval) => (
                <ApprovalItem key={approval.id} approval={approval} getInitials={getInitials} getUserName={getUserName} />
              ))}
            </div>
          )}

          {completedApprovals.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Completed
              </p>
              {completedApprovals.map((approval) => (
                <ApprovalItem key={approval.id} approval={approval} getInitials={getInitials} getUserName={getUserName} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center text-muted-foreground" data-testid="empty-approvals">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No approvals requested</p>
          <p className="text-xs">Request approval from team members when ready</p>
        </div>
      )}
    </div>
  );
}

function ApprovalItem({ 
  approval, 
  getInitials, 
  getUserName 
}: { 
  approval: Approval; 
  getInitials: (firstName: string | null, lastName: string | null, email: string) => string;
  getUserName: (user?: { firstName: string | null; lastName: string | null; email: string }) => string;
}) {
  const config = statusConfig[approval.status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-md bg-card"
      data-testid={`approval-item-${approval.id}`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={approval.approver?.profileImageUrl || undefined} />
          <AvatarFallback className="text-xs">
            {getInitials(
              approval.approver?.firstName || null,
              approval.approver?.lastName || null,
              approval.approver?.email || "?"
            )}
          </AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <p className="font-medium">{getUserName(approval.approver)}</p>
            {approval.stageName && (
              <Badge variant="outline" className="text-xs">
                {approval.stageName}
              </Badge>
            )}
          </div>
          {approval.comments && (
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {approval.comments}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Created {new Date(approval.createdAt).toLocaleDateString()}
            {approval.reviewedAt && (
              <> &bull; Responded {new Date(approval.reviewedAt).toLocaleDateString()}</>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!approval.isRequired && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Optional
          </Badge>
        )}
        <Badge variant="outline" className={config.className}>
          <Icon className="w-3 h-3 mr-1" />
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
