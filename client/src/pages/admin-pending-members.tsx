import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Clock, Check, X, Loader2, AlertCircle, Mail, User, Calendar, FileText, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PendingMember {
  id: number;
  userId: string;
  inviteCodeId: number | null;
  status: string;
  specialty: string | null;
  contactHandle: string | null;
  portfolioUrl: string | null;
  timezone: string | null;
  availability: string | null;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export default function AdminPendingMembers() {
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<PendingMember | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [addToDirectory, setAddToDirectory] = useState(true);

  const { data: pendingMembers, isLoading, error } = useQuery<PendingMember[]>({
    queryKey: ["/api/admin/pending-content-members"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, reviewNotes, addToDirectory }: { userId: string; reviewNotes?: string; addToDirectory: boolean }) => {
      const response = await apiRequest("POST", `/api/admin/pending-content-members/${userId}/approve`, {
        reviewNotes,
        addToDirectory,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-content-members"] });
      setSelectedMember(null);
      setActionType(null);
      setReviewNotes("");
      toast({
        title: "Member approved",
        description: "The user can now access content features after completing their profile.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve member.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reviewNotes }: { userId: string; reviewNotes?: string }) => {
      const response = await apiRequest("POST", `/api/admin/pending-content-members/${userId}/reject`, {
        reviewNotes,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-content-members"] });
      setSelectedMember(null);
      setActionType(null);
      setReviewNotes("");
      toast({
        title: "Member rejected",
        description: "The user's content access request has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject member.",
        variant: "destructive",
      });
    },
  });

  const handleAction = () => {
    if (!selectedMember) return;
    
    if (actionType === "approve") {
      approveMutation.mutate({
        userId: selectedMember.userId,
        reviewNotes: reviewNotes || undefined,
        addToDirectory,
      });
    } else if (actionType === "reject") {
      rejectMutation.mutate({
        userId: selectedMember.userId,
        reviewNotes: reviewNotes || undefined,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="gap-1 bg-green-500"><Check className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = pendingMembers?.filter(m => m.status === "pending").length || 0;

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Pending Content Members
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Review and approve new content team members who signed up with invite codes.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingMembers && pendingMembers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMembers.map((member) => (
                  <TableRow key={member.id} data-testid={`row-pending-${member.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {member.user?.firstName || member.user?.lastName 
                            ? `${member.user?.firstName || ""} ${member.user?.lastName || ""}`.trim()
                            : "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="text-sm">{member.user?.email || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(member.status)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(member.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {member.status === "pending" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="gap-1"
                            onClick={() => {
                              setSelectedMember(member);
                              setActionType("approve");
                              setAddToDirectory(true);
                            }}
                            data-testid={`button-approve-${member.id}`}
                          >
                            <Check className="h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setSelectedMember(member);
                              setActionType("reject");
                            }}
                            data-testid={`button-reject-${member.id}`}
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {member.status === "approved" && (
                        <span className="text-sm text-muted-foreground">
                          Approved {member.reviewedAt && format(new Date(member.reviewedAt), "MMM d")}
                        </span>
                      )}
                      {member.status === "rejected" && (
                        <span className="text-sm text-muted-foreground">
                          Rejected {member.reviewedAt && format(new Date(member.reviewedAt), "MMM d")}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending content member requests.</p>
              <p className="text-sm">Users who sign up with content invite codes will appear here for approval.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">How Content Approval Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>When someone uses a content invite code, they are placed in a pending state until you approve them.</p>
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <span><strong>Pending:</strong> User has signed up but cannot access content features yet</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span><strong>Approved:</strong> User can access content features (after completing their profile)</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <span><strong>Rejected:</strong> User's access request was denied</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMember && !!actionType} onOpenChange={(open) => {
        if (!open) {
          setSelectedMember(null);
          setActionType(null);
          setReviewNotes("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  Approve Content Access
                </>
              ) : (
                <>
                  <X className="h-5 w-5 text-destructive" />
                  Reject Content Access
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" 
                ? `Approve ${selectedMember?.user?.firstName || selectedMember?.user?.email || "this user"} for content access.`
                : `Reject the content access request from ${selectedMember?.user?.firstName || selectedMember?.user?.email || "this user"}.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {actionType === "approve" && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="add-to-directory" className="text-sm font-medium">Add to Team Directory</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create a directory entry for this member
                  </p>
                </div>
                <Switch
                  id="add-to-directory"
                  checked={addToDirectory}
                  onCheckedChange={setAddToDirectory}
                  data-testid="switch-add-directory"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="review-notes">Notes (optional)</Label>
              <Textarea
                id="review-notes"
                placeholder={actionType === "approve" 
                  ? "Welcome to the team!" 
                  : "Reason for rejection..."
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                data-testid="textarea-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedMember(null);
                setActionType(null);
                setReviewNotes("");
              }}
              data-testid="button-cancel-action"
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid="button-confirm-action"
            >
              {(approveMutation.isPending || rejectMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
