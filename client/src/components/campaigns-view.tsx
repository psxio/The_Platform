import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Campaign, ContentTask } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertCircle, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  FolderKanban,
  Calendar,
  Users,
  CheckCircle2
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddCampaignDialog } from "@/components/add-campaign-dialog";
import { format } from "date-fns";

export function CampaignsView() {
  const { toast } = useToast();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: campaigns, isLoading, error } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  const { data: tasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Campaign deleted",
        description: "The campaign has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete campaign.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-campaigns-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load campaigns. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const getTasksForCampaign = (campaignId: number) => {
    return tasks?.filter(t => t.campaignId === campaignId) || [];
  };

  const getCampaignProgress = (campaignId: number) => {
    const campaignTasks = getTasksForCampaign(campaignId);
    if (campaignTasks.length === 0) return 0;
    const completed = campaignTasks.filter(t => t.status === "COMPLETED").length;
    return Math.round((completed / campaignTasks.length) * 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "paused":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    setEditingCampaign(null);
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-campaign-${i}`} />
          ))}
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center" data-testid="empty-campaigns">
          <FolderKanban className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Create your first campaign to organize related tasks together.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns?.map((campaign) => {
            const campaignTasks = getTasksForCampaign(campaign.id);
            const progress = getCampaignProgress(campaign.id);
            
            return (
              <Card 
                key={campaign.id} 
                className="hover-elevate"
                data-testid={`card-campaign-${campaign.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: campaign.color || "#3B82F6" }}
                      />
                      <CardTitle className="text-lg" data-testid={`text-campaign-name-${campaign.id}`}>
                        {campaign.name}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(campaign.status)}
                        data-testid={`badge-campaign-status-${campaign.id}`}
                      >
                        {campaign.status}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-campaign-menu-${campaign.id}`}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {campaign.description && (
                    <CardDescription className="mt-2">
                      {campaign.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {campaign.client && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{campaign.client}</span>
                      </div>
                    )}
                    {campaign.startDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(campaign.startDate), "MMM d")}</span>
                        {campaign.endDate && (
                          <span>- {format(new Date(campaign.endDate), "MMM d")}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {campaignTasks.filter(t => t.status === "COMPLETED").length} / {campaignTasks.length} tasks
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddCampaignDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogClose}
        campaign={editingCampaign || undefined}
      />
    </div>
  );
}
