import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, FileText, Shield, Loader2, Key, Lock, Star } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@shared/schema";

const roles = [
  {
    id: "web3" as UserRole,
    title: "Web3 User",
    description: "Access wallet address comparison tools, NFT collection management, and address extraction features.",
    icon: Wallet,
    features: ["Compare wallet addresses", "Manage NFT collections", "Extract EVM addresses", "View comparison history"],
  },
  {
    id: "content" as UserRole,
    title: "Content Team",
    description: "Access content production management, team directory, and deliverables tracking.",
    icon: FileText,
    features: ["Manage content tasks", "Team directory", "Upload deliverables", "Track production progress"],
  },
  {
    id: "admin" as UserRole,
    title: "Administrator",
    description: "Full access to both Web3 tools and Content management features plus admin controls.",
    icon: Shield,
    features: ["All Web3 features", "All Content features", "Generate invite codes", "Full system access"],
  },
];

const roleLabels: Record<UserRole, string> = {
  web3: "Web3",
  content: "Content Team",
  admin: "Administrator",
};

export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  // Check if the current user is a bootstrap admin
  const { data: bootstrapCheck } = useQuery<{ isBootstrapAdmin: boolean }>({
    queryKey: ["/api/auth/bootstrap-check"],
  });
  const isBootstrapAdmin = bootstrapCheck?.isBootstrapAdmin ?? false;

  const updateRoleMutation = useMutation({
    mutationFn: async ({ role, inviteCode }: { role: UserRole; inviteCode: string }) => {
      return await apiRequest("PATCH", "/api/auth/role", { role, inviteCode });
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role set successfully",
        description: `You now have ${roleLabels[role]} access.`,
      });
      setShowCodeDialog(false);
      setInviteCode("");
      if (role === "web3") {
        setLocation("/compare");
      } else if (role === "content") {
        setLocation("/content");
      } else {
        setLocation("/compare");
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to set role. Please try again.";
      toast({
        title: "Error",
        description: message.includes("Invalid") ? "Invalid or expired invite code." : message,
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = (role: UserRole) => {
    // Bootstrap admin can directly become admin without invite code
    if (role === "admin" && isBootstrapAdmin) {
      updateRoleMutation.mutate({ role: "admin", inviteCode: "BOOTSTRAP_ADMIN" });
      return;
    }
    setSelectedRole(role);
    setShowCodeDialog(true);
  };

  const handleInviteCodeSubmit = () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter your invite code.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRole) {
      updateRoleMutation.mutate({ role: selectedRole, inviteCode: inviteCode.trim() });
    }
  };

  const getDialogContent = () => {
    if (!selectedRole) return null;
    const role = roles.find(r => r.id === selectedRole);
    if (!role) return null;
    
    const Icon = role.icon;
    return {
      icon: Icon,
      title: `${role.title} Access`,
      description: `Enter your invite code to access ${role.title.toLowerCase()} features. This code can be obtained from an administrator.`,
    };
  };

  const dialogContent = getDialogContent();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-role-select">
            Select Your Role
          </h1>
          <p className="text-muted-foreground">
            Choose which features you need access to. All access requires a valid invite code.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const isPending = updateRoleMutation.isPending && selectedRole === role.id;
            const isBootstrapAdminRole = role.id === "admin" && isBootstrapAdmin;

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  isSelected ? "ring-2 ring-primary" : ""
                } ${isBootstrapAdminRole ? "ring-2 ring-yellow-500" : ""}`}
                onClick={() => !updateRoleMutation.isPending && handleRoleSelect(role.id)}
                data-testid={`card-role-${role.id}`}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
                    {isBootstrapAdminRole && (
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="h-3 w-3 mr-1" />
                        Auto-Access
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-sm">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {role.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      disabled={updateRoleMutation.isPending}
                      data-testid={`button-select-${role.id}`}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : isBootstrapAdminRole ? (
                        <>
                          <Star className="mr-2 h-4 w-4" />
                          Activate Admin
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Enter Code
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an invite code? Contact an administrator to request access.
          </p>
        </div>
      </div>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-md">
          {dialogContent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <dialogContent.icon className="h-5 w-5 text-primary" />
                  {dialogContent.title}
                </DialogTitle>
                <DialogDescription>
                  {dialogContent.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    placeholder="Enter your invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-wider"
                    data-testid="input-invite-code"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleInviteCodeSubmit();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCodeDialog(false);
                    setInviteCode("");
                    setSelectedRole(null);
                  }}
                  data-testid="button-cancel-invite"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteCodeSubmit}
                  disabled={updateRoleMutation.isPending}
                  data-testid="button-submit-invite-code"
                >
                  {updateRoleMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Verify & Continue
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
