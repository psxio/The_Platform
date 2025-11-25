import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, FileText, Shield, Loader2 } from "lucide-react";
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
    description: "Full access to both Web3 tools and Content management features.",
    icon: Shield,
    features: ["All Web3 features", "All Content features", "User management", "Full system access"],
  },
];

export default function RoleSelect() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const updateRoleMutation = useMutation({
    mutationFn: async (role: UserRole) => {
      return await apiRequest("PATCH", "/api/auth/role", { role });
    },
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Role set successfully",
        description: `You now have ${role} access.`,
      });
      if (role === "web3") {
        setLocation("/compare");
      } else if (role === "content") {
        setLocation("/content");
      } else {
        setLocation("/compare");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to set role. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    updateRoleMutation.mutate(role);
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
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up...
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
    </div>
  );
}
