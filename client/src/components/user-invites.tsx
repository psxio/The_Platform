import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Mail, Trash2, Copy, Clock, CheckCircle2, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserInvite {
  id: number;
  email: string;
  role: string;
  token: string;
  invitedBy: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export function UserInvites() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("content");

  const { data: invites, isLoading } = useQuery<UserInvite[]>({
    queryKey: ["/api/user-invites"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      apiRequest("POST", "/api/user-invites", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-invites"] });
      setEmail("");
      toast({ title: "Invite sent successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create invite", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/user-invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-invites"] });
      toast({ title: "Invite deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete invite", variant: "destructive" });
    },
  });

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Please enter an email address", variant: "destructive" });
      return;
    }
    createMutation.mutate({ email, role });
  };

  const copyInviteLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Invite link copied to clipboard" });
  };

  const pendingInvites = invites?.filter(i => !i.usedAt && new Date(i.expiresAt) > new Date()) || [];
  const usedInvites = invites?.filter(i => i.usedAt) || [];
  const expiredInvites = invites?.filter(i => !i.usedAt && new Date(i.expiresAt) <= new Date()) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </CardTitle>
          <CardDescription>
            Send an email invitation to add someone to your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div className="w-full sm:w-40">
              <Label htmlFor="invite-role" className="sr-only">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="invite-role" data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">Content Team</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              data-testid="button-send-invite"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {pendingInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Invites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`invite-pending-${invite.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{invite.role}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyInviteLink(invite.token)}
                        data-testid={`button-copy-invite-${invite.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(invite.id)}
                        data-testid={`button-delete-invite-${invite.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {usedInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accepted Invites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usedInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    data-testid={`invite-used-${invite.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(new Date(invite.usedAt!), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{invite.role}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {expiredInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-muted-foreground">Expired Invites</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {expiredInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 rounded-lg border opacity-60"
                    data-testid={`invite-expired-${invite.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">Expired</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(invite.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {invites?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invites sent yet</p>
                <p className="text-sm">Use the form above to invite team members</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
