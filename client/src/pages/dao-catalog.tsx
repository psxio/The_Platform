import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Briefcase, 
  Plus, 
  Edit2, 
  Search,
  DollarSign,
  Clock,
  ChevronRight,
  ArrowLeft,
  Target,
  Users,
  Package,
  Repeat,
  TrendingUp,
  Palette,
  Code,
  Megaphone
} from "lucide-react";
import { Link } from "wouter";

type DaoService = {
  id: number;
  category: string;
  serviceName: string;
  description: string;
  scope: string;
  deliverables: string;
  idealFor: string;
  pricingTier1Name: string;
  pricingTier1Min: number;
  pricingTier1Max: number;
  pricingTier1Duration: string;
  pricingTier2Name: string;
  pricingTier2Min: number;
  pricingTier2Max: number;
  pricingTier2Duration: string;
  pricingTier3Name: string;
  pricingTier3Min: number;
  pricingTier3Max: number;
  pricingTier3Duration: string;
  isRetainer: boolean;
  isActive: boolean;
  sortOrder: number;
};

type DaoDiscount = {
  id: number;
  name: string;
  discountType: string;
  percentOff: number;
  conditions: string;
  isActive: boolean;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "strategy_consulting":
      return <Target className="h-5 w-5" />;
    case "development":
      return <Code className="h-5 w-5" />;
    case "design_ux":
      return <Palette className="h-5 w-5" />;
    case "marketing_growth":
      return <Megaphone className="h-5 w-5" />;
    case "retainers":
      return <Repeat className="h-5 w-5" />;
    default:
      return <Briefcase className="h-5 w-5" />;
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    strategy_consulting: "Strategy & Consulting",
    development: "Development",
    design_ux: "Design & UX",
    marketing_growth: "Marketing & Growth",
    retainers: "Retainers",
  };
  return labels[category] || category;
}

function ServiceCard({ service, onEdit }: { service: DaoService; onEdit?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Card 
      className={`hover-elevate ${!service.isActive ? "opacity-60" : ""}`}
      data-testid={`service-card-${service.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-muted">
              {getCategoryIcon(service.category)}
            </div>
            <div>
              <CardTitle className="text-lg">{service.serviceName}</CardTitle>
              <CardDescription className="mt-1">
                {service.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {service.isRetainer && (
              <Badge variant="outline" className="gap-1">
                <Repeat className="h-3 w-3" />
                Retainer
              </Badge>
            )}
            {!service.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3 mt-2">
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">{service.pricingTier1Name}</p>
            <p className="font-semibold">
              {formatCurrency(service.pricingTier1Min)}
              {service.pricingTier1Min !== service.pricingTier1Max && (
                <> - {formatCurrency(service.pricingTier1Max)}</>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{service.pricingTier1Duration}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">{service.pricingTier2Name}</p>
            <p className="font-semibold">
              {formatCurrency(service.pricingTier2Min)}
              {service.pricingTier2Min !== service.pricingTier2Max && (
                <> - {formatCurrency(service.pricingTier2Max)}</>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{service.pricingTier2Duration}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground mb-1">{service.pricingTier3Name}</p>
            <p className="font-semibold">
              {formatCurrency(service.pricingTier3Min)}
              {service.pricingTier3Min !== service.pricingTier3Max && (
                <> - {formatCurrency(service.pricingTier3Max)}</>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{service.pricingTier3Duration}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 w-full"
          data-testid={`expand-service-${service.id}`}
        >
          {isExpanded ? "Show Less" : "Show Details"}
          <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </Button>

        {isExpanded && (
          <div className="mt-4 space-y-4 pt-4 border-t">
            <div>
              <h4 className="text-sm font-medium mb-1">Scope</h4>
              <p className="text-sm text-muted-foreground">{service.scope}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Deliverables</h4>
              <p className="text-sm text-muted-foreground">{service.deliverables}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-1">Ideal For</h4>
              <p className="text-sm text-muted-foreground">{service.idealFor}</p>
            </div>
            {isAdmin && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="w-full mt-2" data-testid={`edit-service-${service.id}`}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Service
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DiscountCard({ discount }: { discount: DaoDiscount }) {
  return (
    <Card className={`hover-elevate ${!discount.isActive ? "opacity-60" : ""}`} data-testid={`discount-card-${discount.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{discount.name}</CardTitle>
          <Badge variant={discount.isActive ? "default" : "secondary"}>
            {discount.percentOff}% off
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{discount.conditions}</p>
        <Badge variant="outline" className="mt-2 capitalize">
          {discount.discountType.replace(/_/g, " ")}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function DaoCatalog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const isAdmin = user?.role === "admin";

  const { data: services, isLoading: servicesLoading } = useQuery<DaoService[]>({
    queryKey: ["/api/dao/catalog"],
  });

  const { data: discounts, isLoading: discountsLoading } = useQuery<DaoDiscount[]>({
    queryKey: ["/api/dao/discounts"],
  });

  const categories = [
    { id: "all", label: "All Services", icon: Briefcase },
    { id: "strategy_consulting", label: "Strategy", icon: Target },
    { id: "development", label: "Development", icon: Code },
    { id: "design_ux", label: "Design", icon: Palette },
    { id: "marketing_growth", label: "Marketing", icon: Megaphone },
    { id: "retainers", label: "Retainers", icon: Repeat },
  ];

  const filteredServices = services?.filter((service) => {
    const matchesCategory = activeCategory === "all" || service.category === activeCategory;
    const matchesSearch = 
      !searchQuery ||
      service.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  const categoryStats = categories.slice(1).map((cat) => ({
    ...cat,
    count: services?.filter((s) => s.category === cat.id).length || 0,
  }));

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dao">
              <Button variant="ghost" size="icon" data-testid="button-back-to-dao">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-service-catalog">
                Service Catalog
              </h1>
              <p className="text-muted-foreground">
                Standardized DAO service offerings and pricing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" data-testid="button-add-service">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {categoryStats.map((cat) => (
            <Card 
              key={cat.id}
              className={`hover-elevate cursor-pointer ${activeCategory === cat.id ? "border-primary" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
              data-testid={`category-filter-${cat.id}`}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-muted">
                    <cat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.count} services</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="services" className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="services" className="gap-2" data-testid="tab-services">
                <Briefcase className="h-4 w-4" />
                Services
              </TabsTrigger>
              <TabsTrigger value="discounts" className="gap-2" data-testid="tab-discounts">
                <DollarSign className="h-4 w-4" />
                Discounts
              </TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[250px]"
                data-testid="input-search-services"
              />
            </div>
          </div>

          <TabsContent value="services">
            {servicesLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading services...
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredServices.map((service) => (
                  <ServiceCard 
                    key={service.id} 
                    service={service}
                    onEdit={() => {
                      toast({ title: "Edit functionality coming soon" });
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">No services found</p>
                <p className="text-sm">
                  {searchQuery 
                    ? "Try adjusting your search" 
                    : "Add services to populate the catalog"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="discounts">
            {discountsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading discounts...
              </div>
            ) : discounts && discounts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {discounts.map((discount) => (
                  <DiscountCard key={discount.id} discount={discount} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">No discounts configured</p>
                <p className="text-sm">Add discounts to offer special pricing</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
