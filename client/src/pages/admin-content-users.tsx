import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserPlus, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, UserCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ContentUserStatus {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  accessStatus: "pending" | "approved" | "rejected" | "bypassed";
  pendingRecord: {
    id: number;
    status: string;
    specialty?: string | null;
  } | null;
  isInDirectory: boolean;
  directoryId: number | null;
  hasProfile: boolean;
  isProfileComplete: boolean;
}

export default function AdminContentUsers() {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<ContentUserStatus | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [skill, setSkill] = useState("");

  const { data: contentUsers, isLoading, error, refetch } = useQuery<ContentUserStatus[]>({
    queryKey: ["/api/admin/content-users"],
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/content-users/backfill-pending");
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-content-members"] });
      toast({
        title: "Backfill complete",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to backfill pending records.",
        variant: "destructive",
      });
    },
  });

  const addToDirectoryMutation = useMutation({
    mutationFn: async ({ userId, skill }: { userId: string; skill?: string }) => {
      const response = await apiRequest("POST", `/api/admin/content-users/${userId}/add-to-directory`, { skill });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/content-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/directory-members"] });
      setShowAddDialog(false);
      setSelectedUser(null);
      setSkill("");
      toast({
        title: "Success",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add user to directory.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (user: ContentUserStatus) => {
    if (user.accessStatus === "approved" && user.isInDirectory) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    if (user.accessStatus === "approved" && !user.isInDirectory) {
      return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Approved (Not in Team)</Badge>;
    }
    if (user.accessStatus === "pending") {
      return <Badge variant="outline" className="border-amber-500 text-amber-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
    if (user.accessStatus === "rejected") {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    if (user.accessStatus === "bypassed") {
      return <Badge variant="outline" className="border-orange-500 text-orange-600"><AlertTriangle className="h-3 w-3 mr-1" />Bypassed System</Badge>;
    }
    return <Badge variant="secondary">Unknown</Badge>;
  };

  const getFullName = (user: ContentUserStatus) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email;
  };

  const bypassedCount = contentUsers?.filter(u => u.accessStatus === "bypassed").length || 0;
  const pendingCount = contentUsers?.filter(u => u.accessStatus === "pending").length || 0;
  const approvedCount = contentUsers?.filter(u => u.accessStatus === "approved" && u.isInDirectory).length || 0;

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p>You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {bypassedCount > 0 && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-600 dark:text-orange-400">
            {bypassedCount} user{bypassedCount !== 1 ? 's' : ''} bypassed the approval system
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-muted-foreground">
              These users got content access before the approval workflow was implemented. Use the backfill button to add them to the pending queue, or add them directly to the team.
            </span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
            >
              {backfillMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Backfill to Pending Queue
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Manage Content Users
            </CardTitle>
            <CardDescription>
              View and manage all users with the content role. Add them to the team directory to grant full access.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-600" />
              <span>Active: {approvedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>Pending: {pendingCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              <span>Bypassed: {bypassedCount}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contentUsers && contentUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>In Team</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`row-content-user-${user.id}`}>
                    <TableCell className="font-medium">
                      {getFullName(user)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user)}
                    </TableCell>
                    <TableCell>
                      {user.isInDirectory ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isProfileComplete ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Complete
                        </Badge>
                      ) : user.hasProfile ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          Incomplete
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          None
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {!user.isInDirectory && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowAddDialog(true);
                          }}
                          data-testid={`button-add-to-team-${user.id}`}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add to Team
                        </Button>
                      )}
                      {user.isInDirectory && (
                        <span className="text-sm text-muted-foreground">Already in team</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content users yet</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Users who sign up with a content invite code will appear here. Generate invite codes and share them with your team.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Team Directory</DialogTitle>
            <DialogDescription>
              Add {selectedUser ? getFullName(selectedUser) : "this user"} to the team directory. They will have full access to content features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="skill">Skill/Role (optional)</Label>
              <Input
                id="skill"
                placeholder="e.g., Video Editor, Graphic Designer"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                data-testid="input-skill"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  addToDirectoryMutation.mutate({ userId: selectedUser.id, skill: skill || undefined });
                }
              }}
              disabled={addToDirectoryMutation.isPending}
              data-testid="button-confirm-add"
            >
              {addToDirectoryMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
