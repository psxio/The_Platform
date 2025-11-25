import { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { Search, X, Filter, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

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
}: AdvancedTaskFiltersProps) {
  const activeFilterCount =
    selectedStatuses.length +
    selectedAssignees.length +
    selectedClients.length +
    (dateRange?.from || dateRange?.to ? 1 : 0);

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
              {assignees.map((assignee) => (
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
              ))}
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
              {clients.map((client) => (
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
              ))}
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
    </div>
  );
}
