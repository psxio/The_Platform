import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Users, User, Crown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type DaoRole = {
  id: number;
  name: string;
  tier: number;
  multiplier: string;
  isCouncilEligible: boolean;
};

type UserOption = {
  id: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
};

type InternalTeamMember = {
  id: number;
  name: string;
  department?: string;
  role?: string;
};

interface AddDaoMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDaoMemberDialog({ open, onOpenChange }: AddDaoMemberDialogProps) {
  const { toast } = useToast();
  const [memberType, setMemberType] = useState<"user" | "team">("user");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isCouncil, setIsCouncil] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: roles = [], isLoading: rolesLoading } = useQuery<DaoRole[]>({
    queryKey: ["/api/dao/roles"],
    enabled: open,
  });

  const { data: users = [], isLoading: usersLoading, isError: usersError } = useQuery<UserOption[]>({
    queryKey: ["/api/users"],
    enabled: open && memberType === "user",
  });

  const { data: teamMembers = [], isLoading: teamLoading, isError: teamError } = useQuery<InternalTeamMember[]>({
    queryKey: ["/api/internal-team"],
    enabled: open && memberType === "team",
  });

  const { data: existingMemberships = [] } = useQuery<any[]>({
    queryKey: ["/api/dao/memberships"],
    enabled: open,
  });

  const isLoadingData = rolesLoading || (memberType === "user" ? usersLoading : teamLoading);

  const existingUserIds = new Set(existingMemberships.map(m => m.userId).filter(Boolean));
  const existingTeamMemberIds = new Set(existingMemberships.map(m => m.internalTeamMemberId).filter(Boolean));

  const availableUsers = users.filter(u => !existingUserIds.has(u.id));
  const availableTeamMembers = teamMembers.filter(t => !existingTeamMemberIds.has(t.id));

  const selectedRole = roles.find(r => r.id.toString() === selectedRoleId);
  const canBeCouncil = selectedRole?.isCouncilEligible ?? false;

  const createMembershipMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/dao/memberships", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dao/memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/fairness-dashboard"] });
      toast({
        title: "Member added",
        description: "The member has been added to the DAO successfully.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add member to the DAO.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setMemberType("user");
    setSelectedUserId("");
    setSelectedTeamMemberId("");
    setSelectedRoleId("");
    setIsCouncil(false);
    setNotes("");
  };

  const handleSubmit = () => {
    if (!selectedRoleId) {
      toast({
        title: "Missing role",
        description: "Please select a role for this member.",
        variant: "destructive",
      });
      return;
    }

    if (memberType === "user" && !selectedUserId) {
      toast({
        title: "Missing user",
        description: "Please select a user to add.",
        variant: "destructive",
      });
      return;
    }

    if (memberType === "team" && !selectedTeamMemberId) {
      toast({
        title: "Missing team member",
        description: "Please select a team member to add.",
        variant: "destructive",
      });
      return;
    }

    const data: any = {
      daoRoleId: parseInt(selectedRoleId),
      isCouncil: canBeCouncil ? isCouncil : false,
      notes: notes || undefined,
    };

    if (memberType === "user") {
      data.userId = selectedUserId;
    } else {
      data.internalTeamMemberId = parseInt(selectedTeamMemberId);
    }

    createMembershipMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add DAO Member
          </DialogTitle>
          <DialogDescription>
            Add a new member to the DAO. You can add either a registered user or an internal team member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>Member Type</Label>
            <RadioGroup 
              value={memberType} 
              onValueChange={(v) => {
                setMemberType(v as "user" | "team");
                setSelectedUserId("");
                setSelectedTeamMemberId("");
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" data-testid="radio-user" />
                <Label htmlFor="user" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Registered User
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" data-testid="radio-team" />
                <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Internal Team Member
                </Label>
              </div>
            </RadioGroup>
          </div>

          {memberType === "user" && (
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={usersLoading}>
                <SelectTrigger id="user-select" data-testid="select-user">
                  <SelectValue placeholder={usersLoading ? "Loading users..." : "Choose a user..."} />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <div className="p-2 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading users...
                    </div>
                  ) : usersError ? (
                    <div className="p-2 text-sm text-destructive text-center">
                      Failed to load users
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available users
                    </div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.displayName || user.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!usersLoading && !usersError && availableUsers.length === 0 && users.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  All users are already DAO members.
                </p>
              )}
            </div>
          )}

          {memberType === "team" && (
            <div className="space-y-2">
              <Label htmlFor="team-select">Select Team Member</Label>
              <Select value={selectedTeamMemberId} onValueChange={setSelectedTeamMemberId} disabled={teamLoading}>
                <SelectTrigger id="team-select" data-testid="select-team-member">
                  <SelectValue placeholder={teamLoading ? "Loading team members..." : "Choose a team member..."} />
                </SelectTrigger>
                <SelectContent>
                  {teamLoading ? (
                    <div className="p-2 text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading team members...
                    </div>
                  ) : teamError ? (
                    <div className="p-2 text-sm text-destructive text-center">
                      Failed to load team members
                    </div>
                  ) : availableTeamMembers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No available team members
                    </div>
                  ) : (
                    availableTeamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.name} {member.department && `(${member.department})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!teamLoading && !teamError && availableTeamMembers.length === 0 && teamMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  All team members are already DAO members.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role-select">DAO Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger id="role-select" data-testid="select-dao-role">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{role.name}</span>
                      <span className="text-muted-foreground">({role.multiplier}x)</span>
                      {role.isCouncilEligible && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canBeCouncil && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="council-switch" className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Council Member
                </Label>
                <p className="text-sm text-muted-foreground">
                  Grant council privileges for treasury operations and overrides
                </p>
              </div>
              <Switch
                id="council-switch"
                checked={isCouncil}
                onCheckedChange={setIsCouncil}
                data-testid="switch-council"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this membership..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMembershipMutation.isPending}
            data-testid="button-add-member"
          >
            {createMembershipMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Add Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
