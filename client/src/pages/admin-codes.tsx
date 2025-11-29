import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Key, Plus, Copy, Check, Trash2, Loader2, AlertCircle, Shield, Wallet, FileText, Users, Clock, Infinity, ChevronDown, ChevronRight, Mail, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AdminInviteCode, AdminInviteCodeUse, UserRole } from "@shared/schema";
import { format, addDays, addWeeks, addMonths } from "date-fns";

type InviteCodeWithUses = AdminInviteCode & { uses: AdminInviteCodeUse[] };

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; color: string }> = {
  web3: { label: "Web3", icon: Wallet, color: "text-blue-500" },
  content: { label: "Content", icon: FileText, color: "text-green-500" },
  admin: { label: "Admin", icon: Shield, color: "text-primary" },
};

export default function AdminCodes() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showNewCode, setShowNewCode] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("content");
  const [newCode, setNewCode] = useState<AdminInviteCode | null>(null);
  const [expandedCodes, setExpandedCodes] = useState<Set<number>>(new Set());
  
  // New settings state
  const [usageType, setUsageType] = useState<"single" | "multi" | "unlimited">("single");
  const [maxUses, setMaxUses] = useState<number>(10);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationPreset, setExpirationPreset] = useState<string>("7days");
  const [customExpirationDate, setCustomExpirationDate] = useState<string>("");

  const { data: codes, isLoading, error } = useQuery<InviteCodeWithUses[]>({
    queryKey: ["/api/admin/invite-codes"],
  });

  const toggleExpanded = (codeId: number) => {
    setExpandedCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codeId)) {
        newSet.delete(codeId);
      } else {
        newSet.add(codeId);
      }
      return newSet;
    });
  };

  const generateMutation = useMutation({
    mutationFn: async (params: { forRole: UserRole; maxUses: number | null; expiresAt: string | null }): Promise<AdminInviteCode> => {
      const response = await apiRequest("POST", "/api/admin/invite-codes", params);
      return await response.json();
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      setNewCode(code);
      setShowGenerateDialog(false);
      setShowNewCode(true);
      resetSettings();
      toast({
        title: "Code generated",
        description: `Your new ${roleConfig[code.forRole as UserRole]?.label || code.forRole} invite code is ready to share.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate invite code.",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/invite-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      toast({
        title: "Code deactivated",
        description: "The invite code has been deactivated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate invite code.",
        variant: "destructive",
      });
    },
  });

  const resetSettings = () => {
    setSelectedRole("content");
    setUsageType("single");
    setMaxUses(10);
    setHasExpiration(false);
    setExpirationPreset("7days");
    setCustomExpirationDate("");
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy code.",
        variant: "destructive",
      });
    }
  };

  const getCodeStatus = (code: AdminInviteCode) => {
    // Check if expired
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      return { label: "Expired", variant: "destructive" as const };
    }
    // Check if fully used (maxUses reached)
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      return { label: "Fully Used", variant: "secondary" as const };
    }
    if (!code.isActive) {
      return { label: "Deactivated", variant: "outline" as const };
    }
    return { label: "Active", variant: "default" as const };
  };

  const getUsageDisplay = (code: AdminInviteCode) => {
    if (code.maxUses === null) {
      return (
        <div className="flex items-center gap-1 text-sm">
          <Infinity className="h-3 w-3" />
          <span>{code.usedCount} used</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-sm">
        <Users className="h-3 w-3" />
        <span>{code.usedCount} / {code.maxUses}</span>
      </div>
    );
  };

  const getRoleBadge = (role: string) => {
    const config = roleConfig[role as UserRole];
    if (!config) return <Badge variant="outline">{role}</Badge>;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const getExpirationDate = (): string | null => {
    if (!hasExpiration) return null;
    
    const now = new Date();
    switch (expirationPreset) {
      case "1day":
        return addDays(now, 1).toISOString();
      case "7days":
        return addDays(now, 7).toISOString();
      case "30days":
        return addMonths(now, 1).toISOString();
      case "90days":
        return addMonths(now, 3).toISOString();
      case "custom":
        return customExpirationDate ? new Date(customExpirationDate).toISOString() : null;
      default:
        return null;
    }
  };

  const handleGenerate = () => {
    let finalMaxUses: number | null = 1;
    if (usageType === "unlimited") {
      finalMaxUses = null;
    } else if (usageType === "multi") {
      finalMaxUses = maxUses;
    }
    
    generateMutation.mutate({
      forRole: selectedRole,
      maxUses: finalMaxUses,
      expiresAt: getExpirationDate(),
    });
  };

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
              <Key className="h-5 w-5 text-primary" />
              Invite Codes
            </CardTitle>
            <CardDescription>
              Generate invite codes to grant platform access to users.
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowGenerateDialog(true)}
            disabled={generateMutation.isPending}
            data-testid="button-generate-code"
          >
            <Plus className="mr-2 h-4 w-4" />
            Generate Code
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes && codes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const status = getCodeStatus(code);
                  const isUsable = status.label === "Active";
                  const isExpanded = expandedCodes.has(code.id);
                  const hasUses = code.uses && code.uses.length > 0;
                  return (
                    <Collapsible key={code.id} open={isExpanded} onOpenChange={() => hasUses && toggleExpanded(code.id)} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow 
                            className={hasUses ? "cursor-pointer hover-elevate" : ""} 
                            data-testid={`row-code-${code.id}`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {hasUses ? (
                                  isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )
                                ) : (
                                  <Key className="h-4 w-4 text-muted-foreground" />
                                )}
                                <code className="font-mono text-sm bg-muted px-2 py-1 rounded" data-testid={`text-code-${code.id}`}>
                                  {code.code}
                                </code>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getRoleBadge(code.forRole || "admin")}
                            </TableCell>
                            <TableCell>
                              {getUsageDisplay(code)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant} data-testid={`badge-status-${code.id}`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {code.expiresAt ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(code.expiresAt), "MMM d, yyyy")}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/60">Never</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(code.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isUsable && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(code.code);
                                      }}
                                      data-testid={`button-copy-${code.id}`}
                                    >
                                      {copiedCode === code.code ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deactivateMutation.mutate(code.id);
                                      }}
                                      disabled={deactivateMutation.isPending}
                                      data-testid={`button-deactivate-${code.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30" data-testid={`row-uses-${code.id}`}>
                            <TableCell colSpan={7} className="p-0">
                              <div className="px-6 py-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Users className="h-4 w-4" />
                                  Usage History ({code.uses?.length || 0} uses)
                                </div>
                                <div className="bg-background rounded-lg border overflow-hidden">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[200px]">User</TableHead>
                                        <TableHead className="w-[250px]">Email</TableHead>
                                        <TableHead>Role Granted</TableHead>
                                        <TableHead>Used At</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {code.uses?.map((use) => (
                                        <TableRow key={use.id}>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4 text-muted-foreground" />
                                              <span>
                                                {use.userFirstName || use.userLastName 
                                                  ? `${use.userFirstName || ""} ${use.userLastName || ""}`.trim()
                                                  : "Unknown"}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                              <Mail className="h-3 w-3" />
                                              <span className="text-sm">{use.userEmail}</span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {getRoleBadge(use.roleGranted)}
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {format(new Date(use.usedAt), "MMM d, yyyy 'at' h:mm a")}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invite codes generated yet.</p>
              <p className="text-sm">Click "Generate Code" to create invite codes for team members.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">How Invite Codes Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Each invite code grants access to a specific role and can be configured for single or multiple uses.</p>
          <div className="flex flex-wrap gap-4 mt-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-500" />
              <span><strong>Web3:</strong> Wallet tools and address management</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span><strong>Content:</strong> Task management and team collaboration</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span><strong>Admin:</strong> Full access plus invite code management</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showGenerateDialog} onOpenChange={(open) => {
        setShowGenerateDialog(open);
        if (!open) resetSettings();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Generate Invite Code
            </DialogTitle>
            <DialogDescription>
              Configure the invite code settings below.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="role-select">Access Level</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger id="role-select" data-testid="select-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web3" data-testid="option-web3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      Web3 User
                    </div>
                  </SelectItem>
                  <SelectItem value="content" data-testid="option-content">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      Content Team
                    </div>
                  </SelectItem>
                  <SelectItem value="admin" data-testid="option-admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Administrator
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Usage Limit</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={usageType === "single" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setUsageType("single")}
                  data-testid="button-single-use"
                >
                  <Users className="mr-2 h-4 w-4" />
                  1 Person
                </Button>
                <Button
                  type="button"
                  variant={usageType === "multi" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setUsageType("multi")}
                  data-testid="button-multi-use"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Multiple
                </Button>
                <Button
                  type="button"
                  variant={usageType === "unlimited" ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setUsageType("unlimited")}
                  data-testid="button-unlimited-use"
                >
                  <Infinity className="mr-2 h-4 w-4" />
                  Unlimited
                </Button>
              </div>
              {usageType === "multi" && (
                <div className="flex items-center gap-3 mt-2">
                  <Label htmlFor="max-uses" className="text-sm whitespace-nowrap">Max uses:</Label>
                  <Input
                    id="max-uses"
                    type="number"
                    min={2}
                    max={1000}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-24"
                    data-testid="input-max-uses"
                  />
                  <span className="text-sm text-muted-foreground">people can use this code</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="has-expiration">Expiration Date</Label>
                <Switch
                  id="has-expiration"
                  checked={hasExpiration}
                  onCheckedChange={setHasExpiration}
                  data-testid="switch-expiration"
                />
              </div>
              {hasExpiration && (
                <div className="space-y-2">
                  <Select value={expirationPreset} onValueChange={setExpirationPreset}>
                    <SelectTrigger data-testid="select-expiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1day">Expires in 1 day</SelectItem>
                      <SelectItem value="7days">Expires in 7 days</SelectItem>
                      <SelectItem value="30days">Expires in 30 days</SelectItem>
                      <SelectItem value="90days">Expires in 90 days</SelectItem>
                      <SelectItem value="custom">Custom date</SelectItem>
                    </SelectContent>
                  </Select>
                  {expirationPreset === "custom" && (
                    <Input
                      type="date"
                      value={customExpirationDate}
                      onChange={(e) => setCustomExpirationDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                      data-testid="input-custom-date"
                    />
                  )}
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="font-medium mb-1">Summary</div>
              <ul className="space-y-1 text-muted-foreground">
                <li>Role: {roleConfig[selectedRole]?.label}</li>
                <li>
                  Usage: {usageType === "single" ? "1 person" : usageType === "unlimited" ? "Unlimited" : `Up to ${maxUses} people`}
                </li>
                <li>
                  Expires: {hasExpiration ? (
                    expirationPreset === "custom" && customExpirationDate 
                      ? format(new Date(customExpirationDate), "MMM d, yyyy")
                      : expirationPreset === "1day" ? "1 day from now"
                      : expirationPreset === "7days" ? "7 days from now"
                      : expirationPreset === "30days" ? "30 days from now"
                      : "90 days from now"
                  ) : "Never"}
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowGenerateDialog(false);
              resetSettings();
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              {generateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Key className="mr-2 h-4 w-4" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCode} onOpenChange={setShowNewCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Invite Code Generated
            </DialogTitle>
            <DialogDescription>
              Share this code to grant {roleConfig[newCode?.forRole as UserRole]?.label || newCode?.forRole} access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={newCode?.code || ""}
                readOnly
                className="font-mono text-center tracking-widest text-lg"
                data-testid="input-new-code"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => newCode && copyToClipboard(newCode.code)}
                data-testid="button-copy-new-code"
              >
                {copiedCode === newCode?.code ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
              {newCode?.forRole && getRoleBadge(newCode.forRole)}
              <Badge variant="outline" className="gap-1">
                {newCode?.maxUses === null ? (
                  <><Infinity className="h-3 w-3" /> Unlimited uses</>
                ) : (
                  <><Users className="h-3 w-3" /> {newCode?.maxUses} {newCode?.maxUses === 1 ? "use" : "uses"}</>
                )}
              </Badge>
              {newCode?.expiresAt && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Expires {format(new Date(newCode.expiresAt), "MMM d, yyyy")}
                </Badge>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewCode(false)} data-testid="button-close-dialog">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
