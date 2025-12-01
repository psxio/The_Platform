import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Search,
  Plus,
  Users,
  Wallet,
  DollarSign,
  Edit,
  Trash2,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Mail,
  Building2,
  Clock,
  CreditCard,
  User,
  Briefcase,
} from "lucide-react";
import { SiTelegram, SiDiscord, SiX } from "react-icons/si";
import type { InternalTeamMember, TeamPaymentHistory } from "@shared/schema";

const roleOptions = [
  { value: "founder", label: "Founder" },
  { value: "lead", label: "Lead" },
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "content_creator", label: "Content Creator" },
  { value: "community_manager", label: "Community Manager" },
  { value: "business_development", label: "Business Development" },
  { value: "marketing", label: "Marketing" },
  { value: "artist", label: "Artist" },
  { value: "video_editor", label: "Video Editor" },
  { value: "writer", label: "Writer" },
  { value: "project_manager", label: "Project Manager" },
  { value: "operations", label: "Operations" },
  { value: "advisor", label: "Advisor" },
  { value: "contributor", label: "Contributor" },
  { value: "other", label: "Other" },
];

const departmentOptions = [
  { value: "leadership", label: "Leadership" },
  { value: "engineering", label: "Engineering" },
  { value: "content", label: "Content" },
  { value: "design", label: "Design" },
  { value: "community", label: "Community" },
  { value: "business", label: "Business" },
  { value: "operations", label: "Operations" },
  { value: "general", label: "General" },
];

const paymentMethodOptions = [
  { value: "crypto_base", label: "Crypto (Base)" },
  { value: "crypto_eth", label: "Crypto (Ethereum)" },
  { value: "crypto_sol", label: "Crypto (Solana)" },
  { value: "venmo", label: "Venmo" },
  { value: "paypal", label: "PayPal" },
  { value: "wells_fargo", label: "Wells Fargo" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

const employmentTypeOptions = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contractor", label: "Contractor" },
  { value: "intern", label: "Intern" },
  { value: "shadow", label: "Shadow" },
];

const teamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nickname: z.string().optional(),
  role: z.string().default("contributor"),
  department: z.string().default("general"),
  employmentType: z.string().default("full_time"),
  supervisorId: z.coerce.number().nullable().optional(),
  currentFocus: z.string().optional(),
  walletAddress: z.string().optional(),
  walletChain: z.string().default("base"),
  payRate: z.coerce.number().min(0).default(0),
  payFrequency: z.string().default("weekly"),
  paymentMethod: z.string().default("crypto_base"),
  paymentNotes: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  discord: z.string().optional(),
  twitter: z.string().optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("active"),
});

type TeamMemberForm = z.infer<typeof teamMemberSchema>;

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "founder": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "lead": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "developer": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "designer": return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
    case "content_creator": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    case "community_manager": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    case "artist": return "bg-red-500/10 text-red-700 dark:text-red-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "inactive": return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    case "on_hold": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  }
}

function getPaymentMethodIcon(method: string) {
  if (method.startsWith("crypto")) {
    return <Wallet className="w-4 h-4" />;
  }
  return <CreditCard className="w-4 h-4" />;
}

function shortenAddress(address: string) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function InternalTeam() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<InternalTeamMember | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery<InternalTeamMember[]>({
    queryKey: ["/api/internal-team"],
  });

  const { data: selectedMemberPayments = [] } = useQuery<TeamPaymentHistory[]>({
    queryKey: [`/api/internal-team/${selectedMember?.id}/payments`],
    enabled: !!selectedMember,
  });

  const form = useForm<TeamMemberForm>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      name: "",
      nickname: "",
      role: "contributor",
      department: "general",
      employmentType: "full_time",
      supervisorId: null,
      currentFocus: "",
      walletAddress: "",
      walletChain: "base",
      payRate: 0,
      payFrequency: "weekly",
      paymentMethod: "crypto_base",
      paymentNotes: "",
      email: "",
      telegram: "",
      discord: "",
      twitter: "",
      bio: "",
      notes: "",
      status: "active",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TeamMemberForm) => {
      const res = await apiRequest("POST", "/api/internal-team", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-team"] });
      setShowCreateDialog(false);
      form.reset();
      toast({ title: "Team member added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add team member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TeamMemberForm> }) => {
      const res = await apiRequest("PATCH", `/api/internal-team/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-team"] });
      setShowEditDialog(false);
      setSelectedMember(null);
      toast({ title: "Team member updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/internal-team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/internal-team"] });
      setSelectedMember(null);
      toast({ title: "Team member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove team member", variant: "destructive" });
    },
  });

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === "all" || member.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const departmentCounts = {
    all: members.length,
    ...departmentOptions.reduce((acc, dept) => {
      acc[dept.value] = members.filter(m => m.department === dept.value).length;
      return acc;
    }, {} as Record<string, number>),
  };

  const totalPayroll = members
    .filter(m => m.status === "active")
    .reduce((sum, m) => sum + (m.payRate || 0), 0);

  const copyToClipboard = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const openEditDialog = (member: InternalTeamMember) => {
    setSelectedMember(member);
    form.reset({
      name: member.name,
      nickname: member.nickname || "",
      role: member.role || "contributor",
      department: member.department || "general",
      employmentType: member.employmentType || "full_time",
      supervisorId: member.supervisorId || null,
      currentFocus: member.currentFocus || "",
      walletAddress: member.walletAddress || "",
      walletChain: member.walletChain || "base",
      payRate: member.payRate || 0,
      payFrequency: member.payFrequency || "weekly",
      paymentMethod: member.paymentMethod || "crypto_base",
      paymentNotes: member.paymentNotes || "",
      email: member.email || "",
      telegram: member.telegram || "",
      discord: member.discord || "",
      twitter: member.twitter || "",
      bio: member.bio || "",
      notes: member.notes || "",
      status: member.status || "active",
    });
    setShowEditDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Internal Team</h1>
            <p className="text-muted-foreground">
              Manage team members, roles, and payment information
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-member">
                <Plus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a new member to the internal team
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Full name" {...field} data-testid="input-member-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nickname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nickname</FormLabel>
                          <FormControl>
                            <Input placeholder="Display name" {...field} data-testid="input-member-nickname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-member-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roleOptions.map(role => (
                                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-member-department">
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departmentOptions.map(dept => (
                                <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employment-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employmentTypeOptions.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supervisorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reports To</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                            value={field.value ? String(field.value) : "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-supervisor">
                                <SelectValue placeholder="Select supervisor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Supervisor</SelectItem>
                              {members.map(m => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="currentFocus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Focus</FormLabel>
                        <FormControl>
                          <Input placeholder="Current project or area of focus" {...field} data-testid="input-current-focus" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pay Rate (USD)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              data-testid="input-member-pay-rate" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentMethodOptions.map(method => (
                                <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="walletAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wallet Address</FormLabel>
                        <FormControl>
                          <Input placeholder="0x..." {...field} data-testid="input-wallet-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="email@example.com" {...field} data-testid="input-member-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telegram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telegram</FormLabel>
                          <FormControl>
                            <Input placeholder="@username" {...field} data-testid="input-member-telegram" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="discord"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discord</FormLabel>
                          <FormControl>
                            <Input placeholder="username#1234" {...field} data-testid="input-member-discord" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>X/Twitter</FormLabel>
                          <FormControl>
                            <Input placeholder="@handle" {...field} data-testid="input-member-twitter" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment instructions, notes..." {...field} data-testid="input-member-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-member-status">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-member">
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Member
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">
                {members.filter(m => m.status === "active").length} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Weekly Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPayroll.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active members only
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(members.map(m => m.department)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all teams
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.filter(m => m.paymentMethod?.startsWith("crypto")).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Using crypto payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-members"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedDepartment === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDepartment("all")}
              data-testid="button-filter-all"
            >
              All ({departmentCounts.all})
            </Button>
            {departmentOptions.filter(d => departmentCounts[d.value] > 0).map(dept => (
              <Button
                key={dept.value}
                variant={selectedDepartment === dept.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDepartment(dept.value)}
                data-testid={`button-filter-${dept.value}`}
              >
                {dept.label} ({departmentCounts[dept.value]})
              </Button>
            ))}
          </div>
        </div>

        {/* Team Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {filteredMembers.length} member{filteredMembers.length !== 1 ? "s" : ""} shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Pay Rate</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            {member.nickname && (
                              <div className="text-xs text-muted-foreground">{member.nickname}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRoleBadgeColor(member.role || "")}>
                          {roleOptions.find(r => r.value === member.role)?.label || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {departmentOptions.find(d => d.value === member.department)?.label || member.department}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          ${(member.payRate || 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          /{member.payFrequency || "weekly"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(member.paymentMethod || "")}
                          <span className="text-sm">
                            {paymentMethodOptions.find(m => m.value === member.paymentMethod)?.label || member.paymentMethod}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.walletAddress ? (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {shortenAddress(member.walletAddress)}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(member.walletAddress!)}
                              data-testid={`button-copy-wallet-${member.id}`}
                            >
                              {copiedAddress === member.walletAddress ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(member.status || "active")}>
                          {member.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(member)}
                            data-testid={`button-edit-member-${member.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Remove ${member.name} from the team?`)) {
                                deleteMutation.mutate(member.id);
                              }
                            }}
                            data-testid={`button-delete-member-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No team members found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Team Member</DialogTitle>
              <DialogDescription>
                Update {selectedMember?.name}'s information
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => 
                selectedMember && updateMutation.mutate({ id: selectedMember.id, data })
              )} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nickname"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="Display name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map(role => (
                              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departmentOptions.map(dept => (
                              <SelectItem key={dept.value} value={dept.value}>{dept.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employmentTypeOptions.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reports To</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                          value={field.value ? String(field.value) : "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supervisor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Supervisor</SelectItem>
                            {members.filter(m => m.id !== selectedMember?.id).map(m => (
                              <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="currentFocus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Focus</FormLabel>
                      <FormControl>
                        <Input placeholder="Current project or area of focus" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Rate (USD)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethodOptions.map(method => (
                              <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wallet Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telegram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telegram</FormLabel>
                        <FormControl>
                          <Input placeholder="@username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="discord"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discord</FormLabel>
                        <FormControl>
                          <Input placeholder="username#1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>X/Twitter</FormLabel>
                        <FormControl>
                          <Input placeholder="@handle" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Payment instructions, notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
