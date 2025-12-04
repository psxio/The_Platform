import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Briefcase, Users, Loader2 } from "lucide-react";
import type { DirectoryMember, Campaign, User } from "@shared/schema";

export function QuickAddWork() {
  const [description, setDescription] = useState("");
  const [client, setClient] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: directoryMembers } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const { data: campaigns } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const currentUserDisplayName = (() => {
    if (!currentUser) return null;
    const directoryMember = directoryMembers?.find(
      (m) => m.email?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    if (directoryMember) return directoryMember.person;
    const fullName = [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || currentUser.email || "Me";
  })();

  const uniqueClients = Array.from(
    new Set(
      directoryMembers
        ?.filter((m) => m.skill === "Client" || m.skill === "Partner")
        .map((m) => m.person)
        .filter(Boolean) || []
    )
  ).sort();

  const createWorkMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        description,
        status: "IN PROGRESS",
        assignedTo: currentUserDisplayName,
        clientType: "external",
        priority: "medium",
      };
      
      if (client && client !== "none") {
        payload.client = client;
      }
      
      if (campaignId && campaignId !== "none" && !isNaN(parseInt(campaignId))) {
        payload.campaignId = parseInt(campaignId);
      }
      
      const response = await apiRequest("POST", "/api/content-tasks", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({
        title: "Work added",
        description: "Your work item has been added successfully.",
      });
      setDescription("");
      setClient("");
      setCampaignId("");
      setIsExpanded(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add work",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    createWorkMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && description.trim()) {
      e.preventDefault();
      createWorkMutation.mutate();
    }
  };

  return (
    <Card className="mb-4 border-dashed border-2 border-primary/20 bg-primary/5" data-testid="quick-add-work">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">What are you working on?</span>
          </div>
          
          <div className="flex flex-col gap-3">
            <Input
              placeholder="Describe your current work..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsExpanded(true)}
              className="bg-background"
              data-testid="input-work-description"
            />
            
            {isExpanded && (
              <div className="flex flex-wrap items-center gap-2">
                <Select value={client} onValueChange={setClient}>
                  <SelectTrigger className="w-[180px] bg-background" data-testid="select-work-client">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {uniqueClients.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {campaigns && campaigns.length > 0 && (
                  <Select value={campaignId} onValueChange={setCampaignId}>
                    <SelectTrigger className="w-[180px] bg-background" data-testid="select-work-campaign">
                      <SelectValue placeholder="Campaign (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No campaign</SelectItem>
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="flex-1" />
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsExpanded(false);
                    setDescription("");
                    setClient("");
                    setCampaignId("");
                  }}
                  data-testid="button-cancel-work"
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  size="sm"
                  disabled={!description.trim() || createWorkMutation.isPending}
                  data-testid="button-add-work"
                >
                  {createWorkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Work
                </Button>
              </div>
            )}
            
            {!isExpanded && (
              <p className="text-xs text-muted-foreground">
                Press Enter or click to add. Your work will appear in the team's overview.
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
