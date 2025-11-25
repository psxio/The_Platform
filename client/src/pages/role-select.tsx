import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, FileText, Shield, Loader2, Key } from "lucide-react";
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
    requiresCode: false,
  },
  {
    id: "content" as UserRole,
    title: "Content Team",
    description: "Access content production management, team directory, and deliverables tracking.",
    icon: FileText,
    features: ["Manage content tasks", "Team directory", "Upload deliverables", "Track production progress"],
    requiresCode: false,
  },
  {
    id: "admin" as UserRole,
    title: "Administrator",
    description: "Full access to both Web3 tools and Content management features. Requires invite code.",
    icon: Shield,
    features: ["All Web3 features", "All Content features", "Generate invite codes", "Full system access"],
    requiresCode: true,
  },
];

export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  const updateRoleMutation = useMutation({
    mutationFn: async ({ role, adminCode }: { role: UserRole; adminCode?: string }) => {
      return await apiRequest("PATCH", "/api/auth/role", { role, adminCode });
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role set successfully",
        description: `You now have ${role} access.`,
      });
      setShowCodeDialog(false);
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
        description: message.includes("Invalid") ? "Invalid or expired admin invite code." : message,
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = (role: UserRole) => {
    const roleConfig = roles.find(r => r.id === role);
    if (roleConfig?.requiresCode) {
      setSelectedRole(role);
      setShowCodeDialog(true);
    } else {
      setSelectedRole(role);
      updateRoleMutation.mutate({ role });
    }
  };

  const handleAdminCodeSubmit = () => {
    if (!adminCode.trim()) {
      toast({
        title: "Code required",
        description: "Please enter your admin invite code.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRole) {
      updateRoleMutation.mutate({ role: selectedRole, adminCode: adminCode.trim() });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-role-select">
            Select Your Role
          </h1>
          <p className="text-muted-foreground">
            Choose which features you need access to. You can change this later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const isPending = updateRoleMutation.isPending && selectedRole === role.id;

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all hover-elevate ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => !updateRoleMutation.isPending && handleRoleSelect(role.id)}
                data-testid={`card-role-${role.id}`}
              >
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{role.title}</CardTitle>
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
                      {isPending && !role.requiresCode ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : role.requiresCode ? (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Enter Code
                        </>
                      ) : (
                        `Select ${role.title}`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Access Required
            </DialogTitle>
            <DialogDescription>
              Enter your admin invite code to gain administrator access. This code can be obtained from an existing administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-code">Invite Code</Label>
              <Input
                id="admin-code"
                placeholder="Enter your invite code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                className="font-mono tracking-wider"
                data-testid="input-admin-code"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCodeDialog(false);
                setAdminCode("");
              }}
              data-testid="button-cancel-admin"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAdminCodeSubmit}
              disabled={updateRoleMutation.isPending}
              data-testid="button-submit-admin-code"
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
