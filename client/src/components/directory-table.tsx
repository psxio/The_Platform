import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { DirectoryMember } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Copy, Check, AlertCircle, Users, Plus, Pencil, Trash2, Mail, Briefcase } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { DiscordPresenceIndicator } from "@/components/discord-presence";

interface MemberFormData {
  person: string;
  skill: string;
  evmAddress: string;
  client: string;
  email: string;
}

const skillColors: Record<string, string> = {
  design: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  development: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  writing: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  marketing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  management: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  video: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  audio: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  animation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function getSkillColor(skill: string): string {
  const lowerSkill = skill.toLowerCase().trim();
  for (const [key, color] of Object.entries(skillColors)) {
    if (lowerSkill.includes(key)) {
      return color;
    }
  }
  return "bg-muted text-muted-foreground";
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function DirectoryTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<DirectoryMember | null>(null);
  const [formData, setFormData] = useState<MemberFormData>({
    person: "",
    skill: "",
    evmAddress: "",
    client: "",
    email: "",
  });
  const { toast } = useToast();

  const { data: members, isLoading, error } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      return apiRequest("POST", "/api/directory", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Team member added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add team member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MemberFormData }) => {
      return apiRequest("PUT", `/api/directory/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      setEditingMember(null);
      resetForm();
      toast({ title: "Success", description: "Team member updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/directory/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/directory"] });
      toast({ title: "Success", description: "Team member removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove team member", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ person: "", skill: "", evmAddress: "", client: "", email: "" });
  };

  const openEditDialog = (member: DirectoryMember) => {
    setEditingMember(member);
    setFormData({
      person: member.person || "",
      skill: member.skill || "",
      evmAddress: member.evmAddress || "",
      client: member.client || "",
      email: member.email || "",
    });
  };

  const handleSave = () => {
    if (!formData.person.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast({
      title: "Copied",
      description: "EVM address copied to clipboard",
    });
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-directory-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load directory. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const filteredMembers = members?.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.person.toLowerCase().includes(query) ||
      member.skill?.toLowerCase().includes(query) ||
      member.client?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    );
  }) || [];

  const MemberFormContent = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="person">Name *</Label>
        <Input
          id="person"
          value={formData.person}
          onChange={(e) => setFormData({ ...formData, person: e.target.value })}
          placeholder="Enter team member's name"
          data-testid="input-member-name"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="email@example.com (for notifications)"
          data-testid="input-member-email"
        />
        <p className="text-xs text-muted-foreground">
          Email is used for task assignment and due date notifications
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="skill">Skills/Role</Label>
        <Input
          id="skill"
          value={formData.skill}
          onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
          placeholder="e.g., Design, Development, Writing"
          data-testid="input-member-skill"
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple skills with commas
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="client">Client/Team</Label>
        <Input
          id="client"
          value={formData.client}
          onChange={(e) => setFormData({ ...formData, client: e.target.value })}
          placeholder="Associated client or team"
          data-testid="input-member-client"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="evmAddress">EVM Address</Label>
        <Input
          id="evmAddress"
          value={formData.evmAddress}
          onChange={(e) => setFormData({ ...formData, evmAddress: e.target.value })}
          placeholder="0x..."
          data-testid="input-member-evm"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skill, email, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-directory"
          />
        </div>
        <div className="text-sm text-muted-foreground" data-testid="text-member-count">
          {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Add a new team member to the directory. Include their email to enable task notifications.
              </DialogDescription>
            </DialogHeader>
            <MemberFormContent />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSave} 
                disabled={createMutation.isPending}
                data-testid="button-save-member"
              >
                {createMutation.isPending ? "Adding..." : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) { setEditingMember(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member details. Include their email to enable task notifications.
            </DialogDescription>
          </DialogHeader>
          <MemberFormContent />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMember(null); resetForm(); }}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={updateMutation.isPending}
              data-testid="button-update-member"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16" data-testid={`skeleton-directory-${i}`} />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-directory">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No members found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              {members?.length === 0
                ? "Add team members to enable task assignments and notifications."
                : "Try adjusting your search query."}
            </p>
            {members?.length === 0 && (
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-member">
                <Plus className="h-4 w-4 mr-2" />
                Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold w-[250px]">Team Member</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Wallet</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow 
                    key={member.id} 
                    className="group"
                    data-testid={`row-member-${member.id}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={cn("text-white text-sm font-medium", getAvatarColor(member.person))}>
                              {getInitials(member.person)}
                            </AvatarFallback>
                          </Avatar>
                          {member.email && <DiscordPresenceIndicator email={member.email} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" data-testid={`text-person-${member.id}`}>
                            {member.person}
                          </p>
                          {member.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate" data-testid={`text-email-${member.id}`}>
                                {member.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {member.skill?.split(",").map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={cn(
                              "text-xs font-medium border-0",
                              getSkillColor(skill)
                            )}
                            data-testid={`badge-skill-${member.id}-${idx}`}
                          >
                            {skill.trim()}
                          </Badge>
                        ))}
                        {!member.skill && (
                          <span className="text-xs text-muted-foreground italic">No role</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.client ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span data-testid={`text-member-client-${member.id}`}>{member.client}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.evmAddress ? (
                        <div className="flex items-center gap-2">
                          <code
                            className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded"
                            data-testid={`text-evm-${member.id}`}
                          >
                            {member.evmAddress.slice(0, 6)}...{member.evmAddress.slice(-4)}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(member.evmAddress!)}
                            data-testid={`button-copy-${member.id}`}
                          >
                            {copiedAddress === member.evmAddress ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(member)}
                          data-testid={`button-edit-member-${member.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(member.id)}
                          data-testid={`button-delete-member-${member.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
