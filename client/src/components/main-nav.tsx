import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { SavedItemsPanel } from "@/components/saved-items";
import { SpaceSwitcher, SpaceTabs } from "@/components/space-switcher";
import { SpotlightSearch } from "@/components/spotlight-search";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Menu,
  X,
  Wallet,
  FileText,
  FileSearch,
  Combine,
  Database,
  History,
  CheckSquare,
  ClipboardList,
  Camera,
  CreditCard,
  ShoppingCart,
  Receipt,
  Users,
  UserPlus,
  Monitor,
  DollarSign,
  Package,
  FileSpreadsheet,
  Key,
  Settings,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  LayoutGrid,
  Shield,
  HelpCircle,
  FolderOpen,
  Radio,
  Building2,
  Network,
  Crown,
  Briefcase,
} from "lucide-react";

type NavSection = "web3" | "content" | "client" | "admin";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description?: string;
}

const web3Items: NavItem[] = [
  { title: "Compare", href: "/web3/compare", icon: FileText, description: "Compare wallet address lists" },
  { title: "Extract", href: "/web3/extract", icon: FileSearch, description: "Extract addresses from files" },
  { title: "Merge", href: "/web3/merge", icon: Combine, description: "Merge and deduplicate lists" },
  { title: "Collections", href: "/web3/collections", icon: Database, description: "Manage NFT collections" },
  { title: "History", href: "/web3/history", icon: History, description: "View comparison history" },
  { title: "To Do", href: "/web3/todo", icon: CheckSquare, description: "Personal task list" },
];

const contentItems: NavItem[] = [
  { title: "Dashboard", href: "/content-dashboard", icon: LayoutDashboard, description: "Tasks, campaigns, and team" },
  { title: "Work Library", href: "/content/work-library", icon: FolderOpen, description: "Client work uploads" },
  { title: "Monitoring", href: "/content/monitoring", icon: Camera, description: "Activity tracking" },
];

const clientItems: NavItem[] = [
  { title: "My Portal", href: "/client-portal", icon: CreditCard, description: "Buy power and orders" },
];

const sharedItems: NavItem[] = [
  { title: "Client Directory", href: "/client-directory", icon: Building2, description: "All client & partner profiles" },
];

const daoItems: NavItem[] = [
  { title: "DAO Dashboard", href: "/dao", icon: Crown, description: "Treasury, projects, and ranks" },
  { title: "Service Catalog", href: "/dao/catalog", icon: Briefcase, description: "Manage service offerings" },
];

const adminItems: NavItem[] = [
  { title: "Control Center", href: "/admin/control-center", icon: LayoutGrid, description: "Unified admin dashboard" },
  { title: "Internal Team", href: "/admin/internal-team", icon: Users, description: "Team roster and payroll" },
  { title: "Team Structure", href: "/admin/team-structure", icon: Network, description: "Org chart and hierarchy" },
  { title: "Manage Users", href: "/admin/content-users", icon: Shield, description: "View and manage all users" },
  { title: "Pending Members", href: "/admin/pending-members", icon: UserPlus, description: "Approve new members" },
  { title: "Worker Monitoring", href: "/admin/monitoring", icon: Monitor, description: "View worker activity" },
  { title: "Payment Requests", href: "/admin/payments", icon: DollarSign, description: "Approve payments" },
  { title: "Buy Power Requests", href: "/admin/credit-requests", icon: Receipt, description: "Approve buy power requests" },
  { title: "Client Buy Power", href: "/admin/credits", icon: CreditCard, description: "Manage client buy power" },
  { title: "Brand Packs", href: "/admin/brand-packs", icon: Package, description: "Manage brand assets" },
  { title: "Discord Monitor", href: "/admin/discord", icon: Radio, description: "Screen sharing status" },
  { title: "Sheets Hub", href: "/admin/sheets-hub", icon: FileSpreadsheet, description: "Google Sheets sync" },
  { title: "Invite Codes", href: "/admin/codes", icon: Key, description: "Generate invite codes" },
];

function NavDropdownItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const [location] = useLocation();
  const isActive = location === item.href || location.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link href={item.href} onClick={onClick}>
      <div
        className={cn(
          "flex items-start gap-3 rounded-md p-3 hover-elevate cursor-pointer",
          isActive && "bg-accent"
        )}
        data-testid={`nav-item-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{item.title}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function MobileNav({ 
  showWeb3, 
  showContent, 
  showAdmin,
  hasActiveSession,
  onLogout 
}: { 
  showWeb3: boolean; 
  showContent: boolean; 
  showAdmin: boolean;
  hasActiveSession: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const handleItemClick = () => {
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" data-testid="nav-mobile-trigger">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Navigation
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {showWeb3 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
                <Wallet className="h-4 w-4" />
                Onchain Tools
              </h4>
              <div className="space-y-1">
                {web3Items.map((item) => (
                  <NavDropdownItem key={item.href} item={item} onClick={handleItemClick} />
                ))}
              </div>
            </div>
          )}

          {showContent && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
                <ClipboardList className="h-4 w-4" />
                Content Studio
                {hasActiveSession && (
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </h4>
              <div className="space-y-1">
                {contentItems.map((item) => (
                  <NavDropdownItem key={item.href} item={item} onClick={handleItemClick} />
                ))}
              </div>
            </div>
          )}

          {showContent && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
                <CreditCard className="h-4 w-4" />
                Client Portal
              </h4>
              <div className="space-y-1">
                {clientItems.map((item) => (
                  <NavDropdownItem key={item.href} item={item} onClick={handleItemClick} />
                ))}
              </div>
            </div>
          )}

          {/* Client Directory - visible to all authenticated users */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
              <Building2 className="h-4 w-4" />
              Team Resources
            </h4>
            <div className="space-y-1">
              {sharedItems.map((item) => (
                <NavDropdownItem key={item.href} item={item} onClick={handleItemClick} />
              ))}
            </div>
          </div>

          {/* DAO Management - visible to content and admin users */}
          {showContent && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
                <Crown className="h-4 w-4" />
                DAO Management
              </h4>
              <div className="space-y-1">
                {daoItems.map((item) => (
                  <NavDropdownItem key={item.href} item={item} onClick={handleItemClick} />
                ))}
              </div>
            </div>
          )}

          {showAdmin && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground px-2">
                <Shield className="h-4 w-4" />
                Admin
              </h4>
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <NavDropdownItem key={item.href} item={item} onClick={handleItemClick} />
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>
                  {[user?.firstName, user?.lastName]
                    .filter(Boolean)
                    .map(n => n?.[0])
                    .join('')
                    .toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              <Link href="/help" onClick={handleItemClick}>
                <div className="flex items-center gap-3 rounded-md p-3 hover-elevate cursor-pointer" data-testid="nav-help">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Help &amp; Docs</span>
                </div>
              </Link>
              <Link href="/role-select" onClick={handleItemClick}>
                <div className="flex items-center gap-3 rounded-md p-3 hover-elevate cursor-pointer">
                  <Settings className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Change Role</span>
                </div>
              </Link>
              <div 
                className="flex items-center gap-3 rounded-md p-3 hover-elevate cursor-pointer text-destructive"
                onClick={() => {
                  handleItemClick();
                  onLogout();
                }}
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm">Log out</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UserMenu({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuth();

  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n?.[0])
    .join('')
    .toUpperCase() || user.email?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium" data-testid="text-user-name">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'User'}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-email">
              {user.email}
            </p>
            {user.role && (
              <p className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
                Role: {user.role}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/help" data-testid="nav-help-desktop">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help &amp; Docs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/role-select">
            <Settings className="mr-2 h-4 w-4" />
            Change Role
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogout} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MainNav() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const showWeb3 = user?.role === "web3" || user?.role === "admin";
  const showContent = user?.role === "content" || user?.role === "admin";
  const showAdmin = user?.role === "admin";

  const { data: sessionData } = useQuery<{ session: { id: number; status: string } | null }>({
    queryKey: ["/api/monitoring/session/active"],
    enabled: showContent,
    refetchInterval: 30000,
  });

  const hasActiveSession = sessionData?.session?.status === "active";

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      setLocation("/");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4 px-4">
        <MobileNav
          showWeb3={showWeb3}
          showContent={showContent}
          showAdmin={showAdmin}
          hasActiveSession={hasActiveSession}
          onLogout={handleLogout}
        />

        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wallet className="h-5 w-5" />
          <span className="hidden sm:inline-block">Platform</span>
        </Link>

        <div className="md:hidden">
          <SpaceSwitcher />
        </div>

        <SpaceTabs />

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <SpotlightSearch />
          </div>
          <div className="hidden md:block">
            <SavedItemsPanel />
          </div>
          <NotificationBell />
          <ThemeToggle />
          <div className="hidden md:block">
            <UserMenu onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}
