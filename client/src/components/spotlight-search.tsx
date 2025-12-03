import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Briefcase,
  Users,
  Settings,
  Building2,
  Database,
  GitCompare,
  Crown,
  LayoutDashboard,
  FolderOpen,
  UserPlus,
  Vault,
  Zap,
  Search,
  ListTodo,
  ArrowRight,
  CopyCheck,
} from "lucide-react";

type SearchResult = {
  id: string;
  type: "page" | "task" | "project" | "client" | "wallet" | "collection";
  title: string;
  description?: string;
  path: string;
  icon: typeof Home;
  badge?: string;
};

type ContentTask = {
  id: number;
  description: string;
  status: string;
  priority: string | null;
};

type DaoProject = {
  id: number;
  projectName: string;
  status: string;
  totalValue: number;
};

type ClientProfile = {
  id: number;
  companyName: string;
  industry: string | null;
};

type SafeWallet = {
  id: number;
  address: string;
  label: string | null;
  chainId: number;
};

type Collection = {
  id: number;
  name: string;
  addressCount: number;
};

type PageItem = SearchResult & { role?: "admin" | "content" | "web3" };

const PAGE_RESULTS: PageItem[] = [
  { id: "page-workspace", type: "page", title: "My Workspace", description: "Personal dashboard", path: "/workspace", icon: Home },
  { id: "page-content", type: "page", title: "Content Studio", description: "Content production hub", path: "/content-dashboard", icon: Briefcase, role: "content" },
  { id: "page-onchain", type: "page", title: "Onchain Ops", description: "Web3 tools dashboard", path: "/onchain-ops", icon: Zap, role: "web3" },
  { id: "page-compare", type: "page", title: "Address Compare", description: "Compare address lists", path: "/web3/compare", icon: GitCompare, role: "web3" },
  { id: "page-extract", type: "page", title: "EVM Extractor", description: "Extract addresses from files", path: "/web3/extract", icon: Database, role: "web3" },
  { id: "page-collections", type: "page", title: "NFT Collections", description: "Manage NFT collections", path: "/web3/collections", icon: FolderOpen, role: "web3" },
  { id: "page-duplicates", type: "page", title: "Duplicate Checker", description: "Find and remove duplicate addresses", path: "/web3/duplicates", icon: CopyCheck, role: "web3" },
  { id: "page-dao", type: "page", title: "DAO Hub", description: "DAO management dashboard", path: "/dao", icon: Crown },
  { id: "page-dao-catalog", type: "page", title: "Service Catalog", description: "DAO services", path: "/dao/catalog", icon: Briefcase },
  { id: "page-clients", type: "page", title: "Client Directory", description: "Client profiles", path: "/client-directory", icon: Building2 },
  { id: "page-admin", type: "page", title: "Admin Center", description: "System administration", path: "/admin/control-center", icon: Settings, badge: "Admin", role: "admin" },
  { id: "page-internal-team", type: "page", title: "Internal Team", description: "Internal team management", path: "/admin/internal-team", icon: Users, badge: "Admin", role: "admin" },
  { id: "page-invite-codes", type: "page", title: "Invite Codes", description: "Manage access codes", path: "/admin/codes", icon: UserPlus, badge: "Admin", role: "admin" },
  { id: "page-work-library", type: "page", title: "Work Library", description: "Client work uploads", path: "/content/work-library", icon: FolderOpen, role: "content" },
  { id: "page-monitoring", type: "page", title: "Worker Monitoring", description: "Activity tracking", path: "/content/monitoring", icon: LayoutDashboard, role: "content" },
];

export function SpotlightSearch() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isContent = user?.role === "content" || isAdmin;
  const isWeb3 = user?.role === "web3" || isAdmin;

  const { data: tasks } = useQuery<ContentTask[]>({
    queryKey: ["/api/content-tasks"],
    enabled: open && isContent,
  });

  const { data: projects } = useQuery<DaoProject[]>({
    queryKey: ["/api/dao/projects"],
    enabled: open && (isContent || isAdmin),
  });

  const { data: clients } = useQuery<ClientProfile[]>({
    queryKey: ["/api/client-profiles"],
    enabled: open && (isContent || isAdmin),
  });

  const { data: wallets } = useQuery<SafeWallet[]>({
    queryKey: ["/api/dao/safe-wallets"],
    enabled: open && (isContent || isAdmin),
  });

  const { data: collections } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    enabled: open && isWeb3,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((path: string) => {
    setOpen(false);
    setLocation(path);
  }, [setLocation]);

  const filterPagesByRole = (pages: PageItem[]) => {
    return pages.filter((page) => {
      if (page.role === "admin" && !isAdmin) return false;
      if (page.role === "web3" && !isWeb3) return false;
      if (page.role === "content" && !isContent) return false;
      return true;
    });
  };

  const filteredPages = filterPagesByRole(PAGE_RESULTS);

  const taskResults: SearchResult[] = (tasks || []).slice(0, 5).map((task) => ({
    id: `task-${task.id}`,
    type: "task",
    title: task.description.slice(0, 50) + (task.description.length > 50 ? "..." : ""),
    description: `${task.status}${task.priority ? ` • ${task.priority}` : ""}`,
    path: "/content",
    icon: ListTodo,
    badge: task.status,
  }));

  const projectResults: SearchResult[] = (projects || []).slice(0, 5).map((project) => ({
    id: `project-${project.id}`,
    type: "project",
    title: project.projectName,
    description: `${project.status} • $${(project.totalValue / 100).toLocaleString()}`,
    path: "/dao",
    icon: Building2,
    badge: project.status,
  }));

  const clientResults: SearchResult[] = (clients || []).slice(0, 5).map((client) => ({
    id: `client-${client.id}`,
    type: "client",
    title: client.companyName,
    description: client.industry || "Client",
    path: "/clients",
    icon: Building2,
  }));

  const walletResults: SearchResult[] = (wallets || []).slice(0, 3).map((wallet) => ({
    id: `wallet-${wallet.id}`,
    type: "wallet",
    title: wallet.label || `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
    description: `Chain ${wallet.chainId}`,
    path: "/dao",
    icon: Vault,
  }));

  const collectionResults: SearchResult[] = (collections || []).slice(0, 3).map((collection) => ({
    id: `collection-${collection.id}`,
    type: "collection",
    title: collection.name,
    description: `${collection.addressCount.toLocaleString()} addresses`,
    path: "/web3/collections",
    icon: Database,
  }));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border rounded-md hover-elevate transition-colors"
        data-testid="button-spotlight-search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages, tasks, projects, clients..." data-testid="input-spotlight-search" />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-4">
              <Search className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No results found</p>
            </div>
          </CommandEmpty>

          <CommandGroup heading="Pages">
            {filteredPages.slice(0, 8).map((result) => (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result.path)}
                className="gap-3"
                data-testid={`search-result-${result.id}`}
              >
                <result.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{result.title}</span>
                    {result.badge && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {result.badge}
                      </Badge>
                    )}
                  </div>
                  {result.description && (
                    <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                  )}
                </div>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </CommandItem>
            ))}
          </CommandGroup>

          {taskResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tasks">
                {taskResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.path)}
                    className="gap-3"
                    data-testid={`search-result-${result.id}`}
                  >
                    <result.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{result.title}</span>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                      )}
                    </div>
                    {result.badge && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {result.badge}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {projectResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projectResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.path)}
                    className="gap-3"
                    data-testid={`search-result-${result.id}`}
                  >
                    <result.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{result.title}</span>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                      )}
                    </div>
                    {result.badge && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {result.badge}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {clientResults.length > 0 && isAdmin && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clients">
                {clientResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.path)}
                    className="gap-3"
                    data-testid={`search-result-${result.id}`}
                  >
                    <result.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{result.title}</span>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {(walletResults.length > 0 || collectionResults.length > 0) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Onchain">
                {walletResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.path)}
                    className="gap-3"
                    data-testid={`search-result-${result.id}`}
                  >
                    <result.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{result.title}</span>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {collectionResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.path)}
                    className="gap-3"
                    data-testid={`search-result-${result.id}`}
                  >
                    <result.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="truncate">{result.title}</span>
                      {result.description && (
                        <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
