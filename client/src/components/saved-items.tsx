import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck, Trash2, ExternalLink, FileText, Users, CheckSquare, Folder, Package } from "lucide-react";
import type { SavedItem } from "@shared/schema";
import { format } from "date-fns";

interface SavedItemsProps {
  showPanel?: boolean;
}

interface SaveButtonProps {
  itemType: string;
  itemId: number;
  size?: "sm" | "icon" | "default";
  variant?: "ghost" | "outline" | "default";
}

const ITEM_TYPES = [
  { value: "all", label: "All", icon: Bookmark },
  { value: "task", label: "Tasks", icon: CheckSquare },
  { value: "client", label: "Clients", icon: Users },
  { value: "deliverable", label: "Deliverables", icon: FileText },
  { value: "asset", label: "Assets", icon: Package },
  { value: "order", label: "Orders", icon: Folder },
];

export function SaveButton({ itemType, itemId, size = "icon", variant = "ghost" }: SaveButtonProps) {
  const { toast } = useToast();

  const { data: checkResult, isLoading } = useQuery<{ isSaved: boolean }>({
    queryKey: ["/api/saved-items/check", itemType, itemId],
    queryFn: async () => {
      const res = await fetch(`/api/saved-items/check/${itemType}/${itemId}`, { credentials: "include" });
      if (!res.ok) return { isSaved: false };
      return res.json();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/saved-items/toggle", {
        method: "POST",
        body: JSON.stringify({ itemType, itemId }),
      });
    },
    onSuccess: (data: { saved: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items/check", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      toast({
        title: data.saved ? "Item saved" : "Item removed",
        description: data.saved ? "Added to your saved items" : "Removed from your saved items",
      });
    },
  });

  const isSaved = checkResult?.isSaved || false;

  return (
    <Button
      size={size}
      variant={variant}
      onClick={(e) => {
        e.stopPropagation();
        toggleMutation.mutate();
      }}
      disabled={isLoading || toggleMutation.isPending}
      className={isSaved ? "text-primary" : ""}
      data-testid={`button-save-${itemType}-${itemId}`}
    >
      {isSaved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  );
}

export function SavedItemsPanel({ showPanel = true }: SavedItemsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: savedItems = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/saved-items/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      toast({ title: "Item removed from saved" });
    },
  });

  const filteredItems = savedItems.filter(item => {
    if (activeTab !== "all" && item.itemType !== activeTab) return false;
    if (searchQuery && item.notes && !item.notes.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getItemIcon = (type: string) => {
    const found = ITEM_TYPES.find(t => t.value === type);
    return found ? found.icon : Bookmark;
  };

  const getItemLink = (item: SavedItem): string | null => {
    switch (item.itemType) {
      case "task":
        return `/content-dashboard?task=${item.itemId}`;
      case "client":
        return `/client-directory/${item.itemId}`;
      case "deliverable":
        return `/content-dashboard?deliverable=${item.itemId}`;
      case "order":
        return `/client-portal?order=${item.itemId}`;
      case "asset":
        return `/content-dashboard?tab=assets&asset=${item.itemId}`;
      default:
        return null;
    }
  };

  const content = (
    <div className="space-y-4">
      <Input
        placeholder="Search saved items..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        data-testid="input-search-saved"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          {ITEM_TYPES.map(type => (
            <TabsTrigger key={type.value} value={type.value} className="text-xs">
              <type.icon className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{type.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          {activeTab === "all" 
            ? "No saved items yet. Click the bookmark icon on any item to save it."
            : `No saved ${activeTab}s.`
          }
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const Icon = getItemIcon(item.itemType);
            const link = getItemLink(item);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3 hover-elevate"
                data-testid={`saved-item-${item.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.itemType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ID: {item.itemId}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Saved {item.createdAt && format(new Date(item.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {link && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => window.location.href = link}
                      data-testid={`button-view-saved-${item.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    onClick={() => deleteMutation.mutate(item.id)}
                    data-testid={`button-remove-saved-${item.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!showPanel) {
    return content;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative" data-testid="button-open-saved-items">
          <Bookmark className="h-4 w-4 mr-2" />
          Saved
          {savedItems.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1">
              {savedItems.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            Saved Items
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SavedItemsCard() {
  const { data: savedItems = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
  });

  const recentItems = savedItems.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="h-4 w-4" />
          Quick Access
        </CardTitle>
        <SavedItemsPanel />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-4 text-sm">Loading...</div>
        ) : recentItems.length === 0 ? (
          <div className="text-center text-muted-foreground py-4 text-sm">
            No saved items yet
          </div>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item) => {
              const Icon = ITEM_TYPES.find(t => t.value === item.itemType)?.icon || Bookmark;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm hover-elevate rounded p-2 cursor-pointer"
                  onClick={() => {
                    const link = item.itemType === "task" ? `/content-dashboard?task=${item.itemId}`
                      : item.itemType === "client" ? `/client-directory/${item.itemId}`
                      : null;
                    if (link) window.location.href = link;
                  }}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{item.itemType}</span>
                  <span className="text-muted-foreground">#{item.itemId}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
