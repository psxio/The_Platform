import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BulkTaskActionsProps {
  selectedTaskIds: number[];
  onClearSelection: () => void;
  assignees: string[];
}

export function BulkTaskActions({
  selectedTaskIds,
  onClearSelection,
  assignees,
}: BulkTaskActionsProps) {
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const { toast } = useToast();

  const updateTasksMutation = useMutation({
    mutationFn: async (updates: { status?: string; assignedTo?: string }) => {
      await Promise.all(
        selectedTaskIds.map((id) =>
          apiRequest("PUT", `/api/content-tasks/${id}`, updates)
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content-tasks"] });
      toast({
        title: "Tasks updated",
        description: `Successfully updated ${selectedTaskIds.length} task(s)`,
      });
      onClearSelection();
      setBulkStatus("");
      setBulkAssignee("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Failed to update tasks. Please try again.",
      });
    },
  });

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus) return;
    updateTasksMutation.mutate({ status: bulkStatus });
  };

  const handleBulkAssigneeUpdate = () => {
    if (!bulkAssignee) return;
    updateTasksMutation.mutate({ assignedTo: bulkAssignee });
  };

  if (selectedTaskIds.length === 0) return null;

  return (
    <div className="border rounded-lg p-4 bg-accent/50 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          <span className="font-medium">Bulk Actions</span>
          <Badge variant="secondary">{selectedTaskIds.length} selected</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          data-testid="button-clear-selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[200px]" data-testid="select-bulk-status">
              <SelectValue placeholder="Update status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TO BE STARTED">To Be Started</SelectItem>
              <SelectItem value="IN PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkStatus || updateTasksMutation.isPending}
            onClick={handleBulkStatusUpdate}
            data-testid="button-apply-bulk-status"
          >
            Apply
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
            <SelectTrigger className="w-[200px]" data-testid="select-bulk-assignee">
              <SelectValue placeholder="Update assignee..." />
            </SelectTrigger>
            <SelectContent>
              {assignees.map((assignee) => (
                <SelectItem key={assignee} value={assignee}>
                  {assignee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!bulkAssignee || updateTasksMutation.isPending}
            onClick={handleBulkAssigneeUpdate}
            data-testid="button-apply-bulk-assignee"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
