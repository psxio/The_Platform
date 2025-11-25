import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { DirectoryMember } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Search, Copy, Check, AlertCircle, Users, Plus, Pencil, Trash2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface MemberFormData {
  person: string;
  skill: string;
  evmAddress: string;
  client: string;
  email: string;
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
        <Label htmlFor="skill">Skills</Label>
        <Input
          id="skill"
          value={formData.skill}
          onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
          placeholder="e.g., Design, Development, Writing"
          data-testid="input-member-skill"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="client">Client</Label>
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
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12" data-testid={`skeleton-directory-${i}`} />
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-directory">
            <Users className="w-16 h-16 text-muted-foreground mb-4" />
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
                <TableRow>
                  <TableHead className="font-semibold">Person</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Skills</TableHead>
                  <TableHead className="font-semibold">EVM Address</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                    <TableCell className="font-medium" data-testid={`text-person-${member.id}`}>
                      {member.person}
                    </TableCell>
                    <TableCell data-testid={`text-email-${member.id}`}>
                      {member.email ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{member.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No email</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {member.skill?.split(",").map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                            data-testid={`badge-skill-${member.id}-${idx}`}
                          >
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.evmAddress ? (
                        <div className="flex items-center gap-2">
                          <code
                            className="text-xs font-mono text-muted-foreground"
                            data-testid={`text-evm-${member.id}`}
                          >
                            {member.evmAddress.slice(0, 6)}...{member.evmAddress.slice(-4)}
                          </code>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(member.evmAddress!)}
                            data-testid={`button-copy-${member.id}`}
                          >
                            {copiedAddress === member.evmAddress ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm" data-testid={`text-member-client-${member.id}`}>
                      {member.client || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(member)}
                          data-testid={`button-edit-member-${member.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(member.id)}
                          data-testid={`button-delete-member-${member.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
