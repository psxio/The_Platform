import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Search,
  Network,
  Users,
  ChevronDown,
  ChevronRight,
  User,
  Briefcase,
  Target,
  UserCheck,
  Filter,
  List,
  LayoutGrid,
  Building2,
  Loader2,
} from "lucide-react";
import type { InternalTeamMember, ClientProfile } from "@shared/schema";

const employmentTypeOptions = [
  { value: "full_time", label: "Full-Time", color: "bg-green-500/20 text-green-700 dark:text-green-400" },
  { value: "part_time", label: "Part-Time", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { value: "contractor", label: "Contractor", color: "bg-purple-500/20 text-purple-700 dark:text-purple-400" },
  { value: "intern", label: "Intern", color: "bg-orange-500/20 text-orange-700 dark:text-orange-400" },
  { value: "shadow", label: "Shadow", color: "bg-gray-500/20 text-gray-700 dark:text-gray-400" },
];

const departmentColors: Record<string, string> = {
  leadership: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
  engineering: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  content: "bg-pink-500/20 text-pink-700 dark:text-pink-400",
  design: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  community: "bg-green-500/20 text-green-700 dark:text-green-400",
  business: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  operations: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  general: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getEmploymentBadge(type: string | null | undefined) {
  const option = employmentTypeOptions.find(o => o.value === type);
  if (!option) return null;
  return (
    <Badge variant="secondary" className={option.color}>
      {option.label}
    </Badge>
  );
}

interface TeamMemberWithReports extends InternalTeamMember {
  directReports: TeamMemberWithReports[];
}

function buildHierarchyTree(members: InternalTeamMember[]): TeamMemberWithReports[] {
  const memberMap = new Map<number, TeamMemberWithReports>();
  
  members.forEach(member => {
    memberMap.set(member.id, { ...member, directReports: [] });
  });

  const roots: TeamMemberWithReports[] = [];

  members.forEach(member => {
    const node = memberMap.get(member.id)!;
    if (member.supervisorId && memberMap.has(member.supervisorId)) {
      memberMap.get(member.supervisorId)!.directReports.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function OrgChartNode({ 
  member, 
  level = 0,
  allMembers 
}: { 
  member: TeamMemberWithReports; 
  level?: number;
  allMembers: InternalTeamMember[];
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasReports = member.directReports.length > 0;

  const supervisorName = member.supervisorId 
    ? allMembers.find(m => m.id === member.supervisorId)?.name 
    : null;

  return (
    <div className="relative">
      {level > 0 && (
        <div className="absolute left-0 top-0 w-4 h-full border-l-2 border-muted -translate-x-4" />
      )}
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-start gap-2 mb-2">
          {hasReports ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6 h-6 shrink-0" />
          )}
          
          <Card className="flex-1 hover-elevate">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className={departmentColors[member.department || "general"]}>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{member.name}</span>
                    {member.nickname && (
                      <span className="text-xs text-muted-foreground">({member.nickname})</span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground capitalize">
                    {member.role?.replace(/_/g, " ")} • {member.department}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getEmploymentBadge(member.employmentType)}
                    
                    {member.currentFocus && (
                      <Badge variant="outline" className="text-xs">
                        <Target className="h-3 w-3 mr-1" />
                        {member.currentFocus}
                      </Badge>
                    )}
                  </div>

                  {(member.employmentType === "intern" || member.employmentType === "shadow") && supervisorName && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <UserCheck className="h-3 w-3" />
                      Mentored by: {supervisorName}
                    </p>
                  )}
                  
                  {hasReports && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {member.directReports.length} direct report{member.directReports.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {hasReports && (
          <CollapsibleContent>
            <div className="ml-8 pl-4 border-l-2 border-muted space-y-1">
              {member.directReports.map(report => (
                <OrgChartNode 
                  key={report.id} 
                  member={report} 
                  level={level + 1}
                  allMembers={allMembers}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

function OrgChartView({ members }: { members: InternalTeamMember[] }) {
  const hierarchy = useMemo(() => buildHierarchyTree(members), [members]);

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No team members found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)]">
      <div className="space-y-2 pr-4">
        {hierarchy.map(member => (
          <OrgChartNode 
            key={member.id} 
            member={member}
            allMembers={members}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function ListView({ 
  members, 
  clients 
}: { 
  members: InternalTeamMember[];
  clients: ClientProfile[];
}) {
  const [sortBy, setSortBy] = useState<"name" | "department" | "role" | "type">("name");

  const sortedMembers = useMemo(() => {
    const sorted = [...members];
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "department":
        return sorted.sort((a, b) => (a.department || "").localeCompare(b.department || ""));
      case "role":
        return sorted.sort((a, b) => (a.role || "").localeCompare(b.role || ""));
      case "type":
        return sorted.sort((a, b) => (a.employmentType || "").localeCompare(b.employmentType || ""));
      default:
        return sorted;
    }
  }, [members, sortBy]);

  const getSupervisorName = (supervisorId: number | null) => {
    if (!supervisorId) return null;
    return members.find(m => m.id === supervisorId)?.name;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select value={sortBy} onValueChange={(v: "name" | "department" | "role" | "type") => setSortBy(v)}>
          <SelectTrigger className="w-40" data-testid="select-sort-by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="role">Role</SelectItem>
            <SelectItem value="type">Employment Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reports To</TableHead>
              <TableHead>Current Focus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMembers.map(member => {
              const supervisor = getSupervisorName(member.supervisorId);
              return (
                <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={departmentColors[member.department || "general"]}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        {member.nickname && (
                          <p className="text-xs text-muted-foreground">{member.nickname}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {member.role?.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={departmentColors[member.department || "general"]}>
                      {member.department}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getEmploymentBadge(member.employmentType)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {supervisor || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {member.currentFocus || "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

export default function TeamStructure() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [activeView, setActiveView] = useState<"chart" | "list">("chart");

  const { data: members = [], isLoading: isLoadingMembers } = useQuery<InternalTeamMember[]>({
    queryKey: ["/api/team-structure/hierarchy"],
  });

  const { data: clients = [] } = useQuery<ClientProfile[]>({
    queryKey: ["/api/client-profiles"],
  });

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = !searchQuery || 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === "all" || member.employmentType === filterType;
      const matchesDepartment = filterDepartment === "all" || member.department === filterDepartment;

      return matchesSearch && matchesType && matchesDepartment;
    });
  }, [members, searchQuery, filterType, filterDepartment]);

  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    members.forEach(m => {
      const type = m.employmentType || "unspecified";
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  }, [members]);

  const departmentStats = useMemo(() => {
    const stats: Record<string, number> = {};
    members.forEach(m => {
      const dept = m.department || "general";
      stats[dept] = (stats[dept] || 0) + 1;
    });
    return stats;
  }, [members]);

  if (isLoadingMembers) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            Team Structure
          </h1>
          <p className="text-muted-foreground">
            Organizational hierarchy and reporting relationships
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{typeStats["full_time"] || 0}</p>
                <p className="text-xs text-muted-foreground">Full-Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(typeStats["intern"] || 0) + (typeStats["shadow"] || 0)}</p>
                <p className="text-xs text-muted-foreground">Interns & Shadows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Object.keys(departmentStats).length}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-lg">Organization Chart</CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant={activeView === "chart" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("chart")}
                data-testid="button-view-chart"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Chart
              </Button>
              <Button
                variant={activeView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveView("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-members"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="select-filter-type">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {employmentTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40" data-testid="select-filter-department">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Object.keys(departmentStats).map(dept => (
                    <SelectItem key={dept} value={dept} className="capitalize">
                      {dept} ({departmentStats[dept]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredMembers.length} of {members.length} team members
          </div>

          {activeView === "chart" ? (
            <OrgChartView members={filteredMembers} />
          ) : (
            <ListView members={filteredMembers} clients={clients} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
