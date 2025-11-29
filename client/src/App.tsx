import { Switch, Route, Link, useLocation, Redirect } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { FileText, History as HistoryIcon, FileSearch, Database, CheckSquare, ClipboardList, LogOut, Settings, Loader2, Key, Combine, UserPlus, Users, Monitor, DollarSign } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Home from "@/pages/home";
import History from "@/pages/history";
import Extract from "@/pages/extract";
import Collections from "@/pages/collections";
import Todo from "@/pages/todo";
import Merge from "@/pages/merge";
import ContentDashboard from "@/pages/content-dashboard";
import AdminCodes from "@/pages/admin-codes";
import AdminPendingMembers from "@/pages/admin-pending-members";
import AdminContentUsers from "@/pages/admin-content-users";
import AdminMonitoring from "@/pages/admin-monitoring";
import AdminPayments from "@/pages/admin-payments";
import ContentProfileSetup from "@/pages/content-profile-setup";
import WorkerMonitoring from "@/pages/worker-monitoring";
import RoleSelect from "@/pages/role-select";
import AuthPage from "@/pages/auth";
import InvitePage from "@/pages/invite";
import NotFound from "@/pages/not-found";

function UserMenu() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      setLocation("/");
    },
  });
  
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
        {user.role === "admin" && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin/content-users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/pending-members">
                <UserPlus className="mr-2 h-4 w-4" />
                Pending Members
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/monitoring">
                <Monitor className="mr-2 h-4 w-4" />
                Worker Monitoring
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/payments">
                <DollarSign className="mr-2 h-4 w-4" />
                Payment Requests
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/codes">
                <Key className="mr-2 h-4 w-4" />
                Invite Codes
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/role-select">
            <Settings className="mr-2 h-4 w-4" />
            Change Role
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => logoutMutation.mutate()} data-testid="button-logout">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Nav() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.role;
  
  const showWeb3 = userRole === "web3" || userRole === "admin";
  const showContent = userRole === "content" || userRole === "admin";
  
  return (
    <nav className="border-b">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {showWeb3 && (
              <>
                <Link href="/compare">
                  <Button 
                    variant={location === "/compare" || location === "/" ? "default" : "ghost"}
                    size="sm"
                    data-testid="nav-compare"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Compare
                  </Button>
                </Link>
                <Link href="/extract">
                  <Button 
                    variant={location === "/extract" ? "default" : "ghost"}
                    size="sm"
                    data-testid="nav-extract"
                  >
                    <FileSearch className="w-4 h-4 mr-2" />
                    Extract
                  </Button>
                </Link>
                <Link href="/merge">
                  <Button 
                    variant={location === "/merge" ? "default" : "ghost"}
                    size="sm"
                    data-testid="nav-merge"
                  >
                    <Combine className="w-4 h-4 mr-2" />
                    Merge
                  </Button>
                </Link>
                <Link href="/collections">
                  <Button 
                    variant={location === "/collections" ? "default" : "ghost"}
                    size="sm"
                    data-testid="nav-collections"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Collections
                  </Button>
                </Link>
                <Link href="/history">
                  <Button 
                    variant={location === "/history" ? "default" : "ghost"}
                    size="sm"
                    data-testid="nav-history"
                  >
                    <HistoryIcon className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </Link>
                <Link href="/todo">
                  <Button 
                    variant={location === "/todo" ? "default" : "ghost"}
                    size="sm"
                    data-testid="nav-todo"
                  >
                    <CheckSquare className="w-4 h-4 mr-2" />
                    To Do
                  </Button>
                </Link>
              </>
            )}
            
            {showContent && (
              <Link href="/content">
                <Button 
                  variant={location === "/content" ? "default" : "ghost"}
                  size="sm"
                  data-testid="nav-content"
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Content
                </Button>
              </Link>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}

function AuthenticatedRouter() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!user) {
    return <AuthPage />;
  }
  
  if (!user.role && location !== "/role-select") {
    return <Redirect to="/role-select" />;
  }
  
  const showWeb3 = user.role === "web3" || user.role === "admin";
  const showContent = user.role === "content" || user.role === "admin";
  
  return (
    <Switch>
      <Route path="/role-select" component={RoleSelect} />
      
      {showWeb3 && (
        <>
          <Route path="/" component={Home} />
          <Route path="/compare" component={Home} />
          <Route path="/extract" component={Extract} />
          <Route path="/merge" component={Merge} />
          <Route path="/collections" component={Collections} />
          <Route path="/history" component={History} />
          <Route path="/todo" component={Todo} />
        </>
      )}
      
      {showContent && (
        <>
          <Route path="/content" component={ContentDashboard} />
          <Route path="/content/profile-setup" component={ContentProfileSetup} />
          <Route path="/content/monitoring" component={WorkerMonitoring} />
        </>
      )}
      
      {user.role === "admin" && (
        <>
          <Route path="/admin/codes" component={AdminCodes} />
          <Route path="/admin/pending-members" component={AdminPendingMembers} />
          <Route path="/admin/content-users" component={AdminContentUsers} />
          <Route path="/admin/monitoring" component={AdminMonitoring} />
          <Route path="/admin/payments" component={AdminPayments} />
        </>
      )}
      
      <Route>
        {user.role === "content" ? (
          <Redirect to="/content" />
        ) : user.role === "web3" || user.role === "admin" ? (
          <Redirect to="/compare" />
        ) : (
          <Redirect to="/role-select" />
        )}
      </Route>
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Handle invite page separately - it's a public route
  if (location.startsWith("/invite/")) {
    return <InvitePage />;
  }
  
  return (
    <>
      {!isLoading && isAuthenticated && <Nav />}
      <AuthenticatedRouter />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
