import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Key, Plus, Copy, Check, Trash2, Loader2, AlertCircle, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AdminInviteCode } from "@shared/schema";
import { format } from "date-fns";

export default function AdminCodes() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showNewCode, setShowNewCode] = useState(false);
  const [newCode, setNewCode] = useState<AdminInviteCode | null>(null);

  const { data: codes, isLoading, error } = useQuery<AdminInviteCode[]>({
    queryKey: ["/api/admin/invite-codes"],
  });

  const generateMutation = useMutation({
    mutationFn: async (): Promise<AdminInviteCode> => {
      const response = await apiRequest("POST", "/api/admin/invite-codes");
      return await response.json();
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/invite-codes"] });
      setNewCode(code);
      setShowNewCode(true);
      toast({
        title: "Code generated",
        description: "Your new admin invite code is ready to share.",
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
    if (code.usedBy) {
      return { label: "Used", variant: "secondary" as const };
    }
    if (!code.isActive) {
      return { label: "Deactivated", variant: "outline" as const };
    }
    return { label: "Active", variant: "default" as const };
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
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Invite Codes
            </CardTitle>
            <CardDescription>
              Generate invite codes to grant admin access to other users.
            </CardDescription>
          </div>
          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-code"
          >
            {generateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
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
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Used At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => {
                  const status = getCodeStatus(code);
                  return (
                    <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <code className="font-mono text-sm bg-muted px-2 py-1 rounded" data-testid={`text-code-${code.id}`}>
                            {code.code}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} data-testid={`badge-status-${code.id}`}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(code.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {code.usedAt ? format(new Date(code.usedAt), "MMM d, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {code.isActive && !code.usedBy && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => copyToClipboard(code.code)}
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
                                onClick={() => deactivateMutation.mutate(code.id)}
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
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No invite codes generated yet.</p>
              <p className="text-sm">Click "Generate Code" to create your first admin invite code.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="text-base">How Invite Codes Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Each invite code can only be used once to grant admin access.</p>
          <p>When a user enters a valid code during role selection, they receive admin privileges.</p>
          <p>You can deactivate unused codes at any time to prevent them from being used.</p>
        </CardContent>
      </Card>

      <Dialog open={showNewCode} onOpenChange={setShowNewCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              New Invite Code Generated
            </DialogTitle>
            <DialogDescription>
              Share this code with someone to grant them admin access. The code can only be used once.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
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
