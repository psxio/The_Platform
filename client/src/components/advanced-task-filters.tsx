import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { SavedFilter } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { 
  Search, 
  X, 
  Filter, 
  Calendar as CalendarIcon, 
  Bookmark, 
  BookmarkPlus, 
  Trash2,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface AdvancedTaskFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
  selectedAssignees: string[];
  onAssigneeToggle: (assignee: string) => void;
  selectedClients: string[];
  onClientToggle: (client: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  assignees: string[];
  clients: string[];
  onClearFilters: () => void;
  onApplyFilter?: (filter: SavedFilter) => void;
}

const STATUSES = [
  "TO BE STARTED",
  "IN PROGRESS",
  "COMPLETED"
];

export function AdvancedTaskFilters({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusToggle,
  selectedAssignees,
  onAssigneeToggle,
  selectedClients,
  onClientToggle,
  dateRange,
  onDateRangeChange,
  assignees,
  clients,
  onClearFilters,
  onApplyFilter,
}: AdvancedTaskFiltersProps) {
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");
  const { toast } = useToast();

  const { data: savedFilters, isLoading: filtersLoading } = useQuery<SavedFilter[]>({
    queryKey: ["/api/saved-filters"],
  });

  const saveFilterMutation = useMutation({
    mutationFn: async (name: string) => {
      const filterData = {
        name,
        filterType: "content_tasks",
        filterConfig: JSON.stringify({
          searchQuery,
          selectedStatuses,
          selectedAssignees,
          selectedClients,
          dateRange: dateRange ? {
            from: dateRange.from?.toISOString(),
            to: dateRange.to?.toISOString(),
          } : null,
        }),
      };
      return await apiRequest("POST", "/api/saved-filters", filterData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters"] });
      setIsSaveDialogOpen(false);
      setFilterName("");
      toast({
        title: "Filter saved",
        description: "Your filter has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save filter.",
        variant: "destructive",
      });
    },
  });

  const deleteFilterMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/saved-filters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-filters"] });
      toast({
        title: "Filter deleted",
        description: "Your saved filter has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete filter.",
        variant: "destructive",
      });
    },
  });

  const handleApplyFilter = (filter: SavedFilter) => {
    try {
      const config = JSON.parse(filter.filterConfig);
      
      onClearFilters();
      
      if (config.searchQuery) {
        onSearchChange(config.searchQuery);
      }
      
      if (config.selectedStatuses?.length) {
        config.selectedStatuses.forEach((status: string) => {
          if (!selectedStatuses.includes(status)) {
            onStatusToggle(status);
          }
        });
      }
      
      if (config.selectedAssignees?.length) {
        config.selectedAssignees.forEach((assignee: string) => {
          if (!selectedAssignees.includes(assignee)) {
            onAssigneeToggle(assignee);
          }
        });
      }
      
      if (config.selectedClients?.length) {
        config.selectedClients.forEach((client: string) => {
          if (!selectedClients.includes(client)) {
            onClientToggle(client);
          }
        });
      }
      
      if (config.dateRange) {
        onDateRangeChange({
          from: config.dateRange.from ? new Date(config.dateRange.from) : undefined,
          to: config.dateRange.to ? new Date(config.dateRange.to) : undefined,
        });
      }
      
      if (onApplyFilter) {
        onApplyFilter(filter);
      }
      
      toast({
        title: "Filter applied",
        description: `"${filter.name}" filter has been applied.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply filter.",
        variant: "destructive",
      });
    }
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a filter name.",
        variant: "destructive",
      });
      return;
    }
    saveFilterMutation.mutate(filterName.trim());
  };

  const activeFilterCount =
    selectedStatuses.length +
    selectedAssignees.length +
    selectedClients.length +
    (dateRange?.from || dateRange?.to ? 1 : 0);

  const contentFilters = savedFilters?.filter(f => f.filterType === "content_tasks") || [];

  return (
    <div className="space-y-4 pb-4 border-b">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by description, client, or assignee..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-search-tasks"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onSearchChange("")}
              data-testid="button-clear-search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Saved Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-saved-filters">
              <Bookmark className="h-3 w-3 mr-2" />
              Saved
              {contentFilters.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {contentFilters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Saved Filters</Label>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={activeFilterCount === 0}
                  data-testid="button-save-current-filter"
                >
                  <BookmarkPlus className="h-4 w-4 mr-1" />
                  Save Current
                </Button>
              </div>
              
              {filtersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : contentFilters.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No saved filters yet. Apply filters and save them for quick access.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {contentFilters.map((filter) => (
                    <div
                      key={filter.id}
                      className="flex items-center justify-between p-2 rounded-md hover-elevate border"
                    >
                      <button
                        className="flex-1 text-left text-sm font-medium truncate"
                        onClick={() => handleApplyFilter(filter)}
                        data-testid={`button-apply-filter-${filter.id}`}
                      >
                        {filter.name}
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteFilterMutation.mutate(filter.id)}
                        disabled={deleteFilterMutation.isPending}
                        data-testid={`button-delete-filter-${filter.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            data-testid="button-clear-filters"
          >
            Clear all ({activeFilterCount})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-filter-status">
              <Filter className="h-3 w-3 mr-2" />
              Status
              {selectedStatuses.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {selectedStatuses.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Filter by Status</Label>
              {STATUSES.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={() => onStatusToggle(status)}
                    data-testid={`checkbox-status-${status}`}
                  />
                  <label
                    htmlFor={`status-${status}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {status}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Assignee Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-filter-assignee">
              <Filter className="h-3 w-3 mr-2" />
              Assignee
              {selectedAssignees.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {selectedAssignees.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className="text-sm font-semibold">Filter by Assignee</Label>
              {assignees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No assignees available</p>
              ) : (
                assignees.map((assignee) => (
                  <div key={assignee} className="flex items-center space-x-2">
                    <Checkbox
                      id={`assignee-${assignee}`}
                      checked={selectedAssignees.includes(assignee)}
                      onCheckedChange={() => onAssigneeToggle(assignee)}
                      data-testid={`checkbox-assignee-${assignee}`}
                    />
                    <label
                      htmlFor={`assignee-${assignee}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {assignee}
                    </label>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Client Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-filter-client">
              <Filter className="h-3 w-3 mr-2" />
              Client
              {selectedClients.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  {selectedClients.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <Label className="text-sm font-semibold">Filter by Client</Label>
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No clients available</p>
              ) : (
                clients.map((client) => (
                  <div key={client} className="flex items-center space-x-2">
                    <Checkbox
                      id={`client-${client}`}
                      checked={selectedClients.includes(client)}
                      onCheckedChange={() => onClientToggle(client)}
                      data-testid={`checkbox-client-${client}`}
                    />
                    <label
                      htmlFor={`client-${client}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {client}
                    </label>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-filter-date">
              <CalendarIcon className="h-3 w-3 mr-2" />
              Due Date
              {(dateRange?.from || dateRange?.to) && (
                <Badge variant="secondary" className="ml-2 h-5 px-1">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={2}
            />
            {(dateRange?.from || dateRange?.to) && (
              <div className="p-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDateRangeChange(undefined)}
                  className="w-full"
                >
                  Clear date range
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStatuses.map((status) => (
            <Badge
              key={`status-${status}`}
              variant="secondary"
              className="gap-1"
            >
              Status: {status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onStatusToggle(status)}
              />
            </Badge>
          ))}
          {selectedAssignees.map((assignee) => (
            <Badge
              key={`assignee-${assignee}`}
              variant="secondary"
              className="gap-1"
            >
              Assignee: {assignee}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onAssigneeToggle(assignee)}
              />
            </Badge>
          ))}
          {selectedClients.map((client) => (
            <Badge
              key={`client-${client}`}
              variant="secondary"
              className="gap-1"
            >
              Client: {client}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onClientToggle(client)}
              />
            </Badge>
          ))}
          {(dateRange?.from || dateRange?.to) && (
            <Badge variant="secondary" className="gap-1">
              Due: {dateRange?.from && format(dateRange.from, "MMM d")}
              {dateRange?.from && dateRange?.to && " - "}
              {dateRange?.to && format(dateRange.to, "MMM d")}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onDateRangeChange(undefined)}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Save Filter Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Filter</DialogTitle>
            <DialogDescription>
              Give your filter a name to save it for quick access later.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-name">Filter Name</Label>
              <Input
                id="filter-name"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="e.g., My In-Progress Tasks"
                className="mt-2"
                data-testid="input-filter-name"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Current filters:</p>
              <ul className="list-disc pl-4 space-y-1">
                {selectedStatuses.length > 0 && (
                  <li>Status: {selectedStatuses.join(", ")}</li>
                )}
                {selectedAssignees.length > 0 && (
                  <li>Assignees: {selectedAssignees.join(", ")}</li>
                )}
                {selectedClients.length > 0 && (
                  <li>Clients: {selectedClients.join(", ")}</li>
                )}
                {(dateRange?.from || dateRange?.to) && (
                  <li>
                    Due date: {dateRange?.from && format(dateRange.from, "MMM d")}
                    {dateRange?.from && dateRange?.to && " - "}
                    {dateRange?.to && format(dateRange.to, "MMM d")}
                  </li>
                )}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveFilter}
              disabled={saveFilterMutation.isPending}
              data-testid="button-confirm-save-filter"
            >
              {saveFilterMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Filter"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
