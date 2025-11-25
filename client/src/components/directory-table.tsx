import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DirectoryMember } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Copy, Check, AlertCircle, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export function DirectoryTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: members, isLoading, error } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

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
      member.client?.toLowerCase().includes(query)
    );
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, skill, or client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-directory"
          />
        </div>
        <div className="text-sm text-muted-foreground" data-testid="text-member-count">
          {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
        </div>
      </div>

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
            <p className="text-sm text-muted-foreground max-w-sm">
              {members?.length === 0
                ? "The directory is empty."
                : "Try adjusting your search query."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Person</TableHead>
                  <TableHead className="font-semibold">Skills</TableHead>
                  <TableHead className="font-semibold">EVM Address</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                    <TableCell className="font-medium" data-testid={`text-person-${member.id}`}>
                      {member.person}
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
