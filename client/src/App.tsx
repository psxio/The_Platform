import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { MainNav } from "@/components/main-nav";
import { PageTransition } from "@/components/page-transition";

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
import AdminBrandPacks from "@/pages/admin-brand-packs";
import AdminDiscordSettings from "@/pages/admin-discord-settings";
import AdminSheetsHub from "@/pages/admin-sheets-hub";
import AdminCredits from "@/pages/admin-credits";
import ContentProfileSetup from "@/pages/content-profile-setup";
import WorkerMonitoring from "@/pages/worker-monitoring";
import ClientPortal from "@/pages/client-portal";
import AdminCreditRequests from "@/pages/admin-credit-requests";
import ClientWorkLibrary from "@/pages/client-work-library";
import RoleSelect from "@/pages/role-select";
import AuthPage from "@/pages/auth";
import InvitePage from "@/pages/invite";
import HelpPage from "@/pages/help";
import ClientDirectory from "@/pages/client-directory";
import NotFound from "@/pages/not-found";
import { Web3WelcomeModal } from "@/components/web3-welcome-modal";
import { WelcomeModal } from "@/components/welcome-modal";
import { ClientWelcomeModal } from "@/components/client-welcome-modal";

function getDefaultRoute(role: string | null | undefined): string {
  switch (role) {
    case "content":
      return "/content-dashboard";
    case "web3":
      return "/web3/compare";
    case "admin":
      return "/content-dashboard";
    default:
      return "/role-select";
  }
}

function Web3RouteGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const canAccess = user?.role === "web3" || user?.role === "admin";
  
  if (!canAccess) {
    return <Redirect to={getDefaultRoute(user?.role)} />;
  }
  
  return <>{children}</>;
}

function ContentRouteGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const canAccess = user?.role === "content" || user?.role === "admin";
  
  if (!canAccess) {
    return <Redirect to={getDefaultRoute(user?.role)} />;
  }
  
  return <>{children}</>;
}

function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  if (user?.role !== "admin") {
    return <Redirect to={getDefaultRoute(user?.role)} />;
  }
  
  return <>{children}</>;
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

  return (
    <Switch>
      <Route path="/role-select" component={RoleSelect} />

      {/* Web3 Routes */}
      <Route path="/web3/compare">
        <Web3RouteGuard><Home /></Web3RouteGuard>
      </Route>
      <Route path="/web3/extract">
        <Web3RouteGuard><Extract /></Web3RouteGuard>
      </Route>
      <Route path="/web3/merge">
        <Web3RouteGuard><Merge /></Web3RouteGuard>
      </Route>
      <Route path="/web3/collections">
        <Web3RouteGuard><Collections /></Web3RouteGuard>
      </Route>
      <Route path="/web3/history">
        <Web3RouteGuard><History /></Web3RouteGuard>
      </Route>
      <Route path="/web3/todo">
        <Web3RouteGuard><Todo /></Web3RouteGuard>
      </Route>
      <Route path="/web3">
        <Web3RouteGuard><Home /></Web3RouteGuard>
      </Route>

      {/* Legacy Web3 routes - redirect to new paths */}
      <Route path="/compare">
        <Redirect to="/web3/compare" />
      </Route>
      <Route path="/extract">
        <Redirect to="/web3/extract" />
      </Route>
      <Route path="/merge">
        <Redirect to="/web3/merge" />
      </Route>
      <Route path="/collections">
        <Redirect to="/web3/collections" />
      </Route>
      <Route path="/history">
        <Redirect to="/web3/history" />
      </Route>
      <Route path="/todo">
        <Redirect to="/web3/todo" />
      </Route>

      {/* Content Routes */}
      <Route path="/content-dashboard">
        <ContentRouteGuard><ContentDashboard /></ContentRouteGuard>
      </Route>
      <Route path="/content/profile-setup">
        <ContentRouteGuard><ContentProfileSetup /></ContentRouteGuard>
      </Route>
      <Route path="/content/monitoring">
        <ContentRouteGuard><WorkerMonitoring /></ContentRouteGuard>
      </Route>
      <Route path="/content/work-library">
        <ContentRouteGuard><ClientWorkLibrary /></ContentRouteGuard>
      </Route>
      <Route path="/content">
        <Redirect to="/content-dashboard" />
      </Route>

      {/* Client Portal */}
      <Route path="/client-portal">
        <ContentRouteGuard><ClientPortal /></ContentRouteGuard>
      </Route>

      {/* Help - accessible to all authenticated users */}
      <Route path="/help">
        <HelpPage />
      </Route>

      {/* Client Directory - accessible to all team members */}
      <Route path="/client-directory">
        <ClientDirectory />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/codes">
        <AdminRouteGuard><AdminCodes /></AdminRouteGuard>
      </Route>
      <Route path="/admin/pending-members">
        <AdminRouteGuard><AdminPendingMembers /></AdminRouteGuard>
      </Route>
      <Route path="/admin/content-users">
        <AdminRouteGuard><AdminContentUsers /></AdminRouteGuard>
      </Route>
      <Route path="/admin/monitoring">
        <AdminRouteGuard><AdminMonitoring /></AdminRouteGuard>
      </Route>
      <Route path="/admin/payments">
        <AdminRouteGuard><AdminPayments /></AdminRouteGuard>
      </Route>
      <Route path="/admin/brand-packs">
        <AdminRouteGuard><AdminBrandPacks /></AdminRouteGuard>
      </Route>
      <Route path="/admin/discord">
        <AdminRouteGuard><AdminDiscordSettings /></AdminRouteGuard>
      </Route>
      <Route path="/admin/sheets-hub">
        <AdminRouteGuard><AdminSheetsHub /></AdminRouteGuard>
      </Route>
      <Route path="/admin/credits">
        <AdminRouteGuard><AdminCredits /></AdminRouteGuard>
      </Route>
      <Route path="/admin/credit-requests">
        <AdminRouteGuard><AdminCreditRequests /></AdminRouteGuard>
      </Route>
      <Route path="/admin">
        <AdminRouteGuard><Redirect to="/admin/content-users" /></AdminRouteGuard>
      </Route>

      {/* Root redirect based on role */}
      <Route path="/">
        <Redirect to={getDefaultRoute(user.role)} />
      </Route>

      {/* Fallback - redirect to role-appropriate page */}
      <Route>
        <Redirect to={getDefaultRoute(user.role)} />
      </Route>
    </Switch>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  if (location.startsWith("/invite/")) {
    return <InvitePage />;
  }

  return (
    <>
      {!isLoading && isAuthenticated && <MainNav />}
      <main className="flex-1">
        <PageTransition>
          <AuthenticatedRouter />
        </PageTransition>
      </main>
      {!isLoading && isAuthenticated && user?.role === "web3" && <Web3WelcomeModal />}
      {!isLoading && isAuthenticated && (user?.role === "content" || user?.role === "admin") && <WelcomeModal />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <TooltipProvider>
          <div className="min-h-screen flex flex-col bg-background">
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
