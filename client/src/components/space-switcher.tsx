import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  ClipboardList,
  Crown,
  Shield,
  Home,
  ChevronDown,
  Check,
  LucideIcon,
} from "lucide-react";

interface Space {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  homeRoute: string;
  pathPrefix: string[];
  roles: ("web3" | "content" | "admin")[];
  badgeCount?: number;
}

const spaces: Space[] = [
  {
    id: "workspace",
    name: "My Workspace",
    icon: Home,
    description: "Personal dashboard and tasks",
    homeRoute: "/workspace",
    pathPrefix: ["/workspace"],
    roles: ["web3", "content", "admin"],
  },
  {
    id: "content",
    name: "Content Studio",
    icon: ClipboardList,
    description: "Content production and team",
    homeRoute: "/content-dashboard",
    pathPrefix: ["/content", "/client"],
    roles: ["content", "admin"],
  },
  {
    id: "onchain",
    name: "Onchain Ops",
    icon: Wallet,
    description: "Web3 tools and wallets",
    homeRoute: "/web3/compare",
    pathPrefix: ["/web3"],
    roles: ["web3", "admin"],
  },
  {
    id: "dao",
    name: "DAO Hub",
    icon: Crown,
    description: "Treasury, projects, and governance",
    homeRoute: "/dao",
    pathPrefix: ["/dao"],
    roles: ["content", "admin"],
  },
  {
    id: "admin",
    name: "Admin",
    icon: Shield,
    description: "System settings and approvals",
    homeRoute: "/admin/control-center",
    pathPrefix: ["/admin"],
    roles: ["admin"],
  },
];

function useSpaceStats(isAdmin: boolean) {
  const { data: pendingMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/pending-content-members"],
    enabled: isAdmin,
  });

  const { data: pendingPaymentCount } = useQuery<{ count: number }>({
    queryKey: ["/api/payment-requests/pending/count"],
    enabled: isAdmin,
  });

  const { data: pendingCredits = [] } = useQuery<any[]>({
    queryKey: ["/api/credit-requests/pending"],
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return { admin: 0 };
  }

  const paymentCount = pendingPaymentCount?.count || 0;
  return {
    admin: pendingMembers.length + paymentCount + pendingCredits.length,
  };
}

export function SpaceSwitcher() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  if (!user) return null;

  const userRole = user.role || "content";
  const isAdmin = userRole === "admin";
  const stats = useSpaceStats(isAdmin);
  
  const availableSpaces = spaces.filter((space) =>
    space.roles.includes(userRole as "web3" | "content" | "admin")
  );

  const currentSpace = availableSpaces.find((space) =>
    space.pathPrefix.some((prefix) => location.startsWith(prefix))
  ) || availableSpaces[0];

  const CurrentIcon = currentSpace?.icon || Home;

  const getSpaceBadge = (spaceId: string) => {
    if (spaceId === "admin" && stats.admin > 0) {
      return stats.admin;
    }
    return undefined;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="gap-2 h-9 px-3 font-semibold"
          data-testid="button-space-switcher"
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentSpace?.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
          {currentSpace?.id === "admin" && stats.admin > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5">
              {stats.admin}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch Space
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableSpaces.map((space) => {
          const Icon = space.icon;
          const isActive = currentSpace?.id === space.id;
          const badgeCount = getSpaceBadge(space.id);

          return (
            <DropdownMenuItem
              key={space.id}
              asChild
              className={cn(
                "cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              <Link
                href={space.homeRoute}
                className="flex items-center justify-between w-full"
                data-testid={`space-link-${space.id}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{space.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {space.description}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                      {badgeCount}
                    </Badge>
                  )}
                  {isActive && <Check className="h-4 w-4" />}
                </div>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SpaceTabs() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const userRole = user.role || "content";
  const isAdmin = userRole === "admin";
  const stats = useSpaceStats(isAdmin);
  
  const availableSpaces = spaces.filter((space) =>
    space.roles.includes(userRole as "web3" | "content" | "admin")
  );

  const getSpaceBadge = (spaceId: string) => {
    if (spaceId === "admin" && stats.admin > 0) {
      return stats.admin;
    }
    return undefined;
  };

  return (
    <div className="hidden md:flex items-center gap-1 border-l ml-4 pl-4">
      {availableSpaces.map((space) => {
        const Icon = space.icon;
        const isActive = space.pathPrefix.some((prefix) =>
          location.startsWith(prefix)
        );
        const badgeCount = getSpaceBadge(space.id);

        return (
          <Link key={space.id} href={space.homeRoute}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "gap-2 h-8",
                isActive && "bg-accent"
              )}
              data-testid={`space-tab-${space.id}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden lg:inline">{space.name}</span>
              {badgeCount !== undefined && badgeCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                  {badgeCount}
                </Badge>
              )}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

export { spaces };
export type { Space };
