import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Briefcase,
  DollarSign,
  Users,
  FileText,
  Plus,
  X,
  Percent,
  Calendar,
  CreditCard
} from "lucide-react";
import { Link } from "wouter";

type ClientProfile = {
  id: string;
  companyName: string;
  contactName: string;
  industry: string;
};

type DaoService = {
  id: number;
  category: string;
  serviceName: string;
  description: string;
  pricingTier1Name: string;
  pricingTier1Min: number;
  pricingTier1Max: number;
  pricingTier2Name: string;
  pricingTier2Min: number;
  pricingTier2Max: number;
  pricingTier3Name: string;
  pricingTier3Min: number;
  pricingTier3Max: number;
  isRetainer: boolean;
};

type DaoDiscount = {
  id: number;
  name: string;
  discountType: string;
  percentOff: number;
  conditions: string;
  isActive: boolean;
};

type DirectoryMember = {
  id: number;
  person: string;
  skill: string;
};

type SelectedService = {
  serviceId: number;
  service: DaoService;
  tier: "tier1" | "tier2" | "tier3";
  customPrice?: number;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index < currentStep
                ? "bg-primary border-primary text-primary-foreground"
                : index === currentStep
                ? "border-primary text-primary"
                : "border-muted text-muted-foreground"
            }`}
          >
            {index < currentStep ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-sm font-medium">{index + 1}</span>
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-2 ${
                index < currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function DaoProjectNew() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<number[]>([]);
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [paymentSchedule, setPaymentSchedule] = useState("milestone");
  const [assignedMembers, setAssignedMembers] = useState<number[]>([]);
  const [notes, setNotes] = useState("");

  const steps = ["Client", "Services", "Discounts", "Payment", "Team", "Review"];

  const { data: clients } = useQuery<ClientProfile[]>({
    queryKey: ["/api/client-profiles"],
  });

  const { data: services } = useQuery<DaoService[]>({
    queryKey: ["/api/dao/catalog"],
  });

  const { data: discounts } = useQuery<DaoDiscount[]>({
    queryKey: ["/api/dao/discounts"],
  });

  const { data: members } = useQuery<DirectoryMember[]>({
    queryKey: ["/api/directory"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/dao/projects", data);
    },
    onSuccess: (data: any) => {
      toast({ title: "Project created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/dao/projects"] });
      navigate("/dao");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectedClient = clients?.find((c) => c.id === selectedClientId);

  const calculateSubtotal = () => {
    return selectedServices.reduce((total, item) => {
      let price = 0;
      switch (item.tier) {
        case "tier1":
          price = item.customPrice || item.service.pricingTier1Max;
          break;
        case "tier2":
          price = item.customPrice || item.service.pricingTier2Max;
          break;
        case "tier3":
          price = item.customPrice || item.service.pricingTier3Max;
          break;
      }
      return total + price;
    }, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    const totalDiscountPercent = selectedDiscounts.reduce((total, id) => {
      const discount = discounts?.find((d) => d.id === id);
      return total + (discount?.percentOff || 0);
    }, 0);
    return Math.round(subtotal * (totalDiscountPercent / 100));
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount();
  };

  const addService = (service: DaoService, tier: "tier1" | "tier2" | "tier3") => {
    const existing = selectedServices.find((s) => s.serviceId === service.id);
    if (!existing) {
      setSelectedServices([
        ...selectedServices,
        { serviceId: service.id, service, tier },
      ]);
    }
  };

  const removeService = (serviceId: number) => {
    setSelectedServices(selectedServices.filter((s) => s.serviceId !== serviceId));
  };

  const updateServiceTier = (serviceId: number, tier: "tier1" | "tier2" | "tier3") => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.serviceId === serviceId ? { ...s, tier } : s
      )
    );
  };

  const toggleDiscount = (discountId: number) => {
    if (selectedDiscounts.includes(discountId)) {
      setSelectedDiscounts(selectedDiscounts.filter((id) => id !== discountId));
    } else {
      setSelectedDiscounts([...selectedDiscounts, discountId]);
    }
  };

  const toggleMember = (memberId: number) => {
    if (assignedMembers.includes(memberId)) {
      setAssignedMembers(assignedMembers.filter((id) => id !== memberId));
    } else {
      setAssignedMembers([...assignedMembers, memberId]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedClientId && projectName;
      case 1:
        return selectedServices.length > 0;
      case 2:
        return true;
      case 3:
        return paymentTerms && paymentSchedule;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    const projectData = {
      clientId: selectedClientId,
      projectName,
      description: projectDescription,
      totalValue: calculateTotal(),
      paymentTerms,
      notes,
      services: selectedServices.map((s) => ({
        serviceId: s.serviceId,
        tier: s.tier,
        customPrice: s.customPrice,
      })),
      discountIds: selectedDiscounts,
      teamMemberIds: assignedMembers,
    };

    createProjectMutation.mutate(projectData);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-1"
                  data-testid="input-project-name"
                />
              </div>
              <div>
                <Label htmlFor="projectDescription">Description (Optional)</Label>
                <Textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Brief project description"
                  className="mt-1"
                  data-testid="input-project-description"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label>Select Client</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a client from your directory
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {clients?.map((client) => (
                  <Card
                    key={client.id}
                    className={`hover-elevate cursor-pointer ${
                      selectedClientId === client.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedClientId(client.id)}
                    data-testid={`client-card-${client.id}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{client.companyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {client.contactName}
                          </p>
                          {client.industry && (
                            <Badge variant="outline" className="mt-1">
                              {client.industry}
                            </Badge>
                          )}
                        </div>
                        {selectedClientId === client.id && (
                          <Check className="h-5 w-5 text-primary ml-auto" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!clients || clients.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2" />
                    <p>No clients found</p>
                    <Link href="/client-directory">
                      <Button variant="ghost" size="sm" className="mt-2">
                        Add Client
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label>Select Services</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose services and pricing tiers for this project
              </p>
            </div>

            {selectedServices.length > 0 && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Selected Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedServices.map((item) => (
                      <div
                        key={item.serviceId}
                        className="flex items-center justify-between p-3 rounded-lg bg-background border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.service.serviceName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Select
                              value={item.tier}
                              onValueChange={(value) =>
                                updateServiceTier(item.serviceId, value as any)
                              }
                            >
                              <SelectTrigger className="h-8 w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tier1">
                                  {item.service.pricingTier1Name}
                                </SelectItem>
                                <SelectItem value="tier2">
                                  {item.service.pricingTier2Name}
                                </SelectItem>
                                <SelectItem value="tier3">
                                  {item.service.pricingTier3Name}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <span className="text-sm text-muted-foreground">
                              {item.tier === "tier1" &&
                                formatCurrency(item.service.pricingTier1Max)}
                              {item.tier === "tier2" &&
                                formatCurrency(item.service.pricingTier2Max)}
                              {item.tier === "tier3" &&
                                formatCurrency(item.service.pricingTier3Max)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeService(item.serviceId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {services
                  ?.filter(
                    (s) => !selectedServices.find((sel) => sel.serviceId === s.id)
                  )
                  .map((service) => (
                    <Card
                      key={service.id}
                      className="hover-elevate"
                      data-testid={`available-service-${service.id}`}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{service.serviceName}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {service.description}
                            </p>
                            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                              <span>
                                {service.pricingTier1Name}:{" "}
                                {formatCurrency(service.pricingTier1Max)}
                              </span>
                              <span>|</span>
                              <span>
                                {service.pricingTier2Name}:{" "}
                                {formatCurrency(service.pricingTier2Max)}
                              </span>
                              <span>|</span>
                              <span>
                                {service.pricingTier3Name}:{" "}
                                {formatCurrency(service.pricingTier3Max)}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addService(service, "tier2")}
                            data-testid={`add-service-${service.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label>Apply Discounts</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select any applicable discounts for this project
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {discounts
                ?.filter((d) => d.isActive)
                .map((discount) => (
                  <Card
                    key={discount.id}
                    className={`hover-elevate cursor-pointer ${
                      selectedDiscounts.includes(discount.id)
                        ? "border-primary"
                        : ""
                    }`}
                    onClick={() => toggleDiscount(discount.id)}
                    data-testid={`discount-card-${discount.id}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedDiscounts.includes(discount.id)}
                            onCheckedChange={() => toggleDiscount(discount.id)}
                          />
                          <div>
                            <p className="font-medium">{discount.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {discount.conditions}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <Percent className="h-3 w-3 mr-1" />
                          {discount.percentOff}% off
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {(!discounts || discounts.filter((d) => d.isActive).length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Percent className="h-8 w-8 mx-auto mb-2" />
                <p>No active discounts available</p>
              </div>
            )}

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {selectedDiscounts.length > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(calculateDiscountAmount())}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Payment Terms</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Configure payment structure for this project
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger data-testid="select-payment-terms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Schedule</Label>
                <Select
                  value={paymentSchedule}
                  onValueChange={setPaymentSchedule}
                >
                  <SelectTrigger data-testid="select-payment-schedule">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upfront">100% Upfront</SelectItem>
                    <SelectItem value="split_50_50">50% Upfront, 50% on Completion</SelectItem>
                    <SelectItem value="milestone">Milestone-based</SelectItem>
                    <SelectItem value="monthly">Monthly Billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Project Total: {formatCurrency(calculateTotal())}</p>
                    <p className="text-sm text-muted-foreground">
                      Payment: {paymentTerms.replace(/_/g, " ")} • {paymentSchedule.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Assign Team Members</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Select team members to work on this project
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {members?.map((member) => (
                <Card
                  key={member.id}
                  className={`hover-elevate cursor-pointer ${
                    assignedMembers.includes(member.id) ? "border-primary" : ""
                  }`}
                  onClick={() => toggleMember(member.id)}
                  data-testid={`member-card-${member.id}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={assignedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <div>
                        <p className="font-medium">{member.person}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.skill}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {assignedMembers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{assignedMembers.length} team members assigned</span>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label>Review & Create</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Review project details before creating
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Client
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{selectedClient?.companyName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedClient?.contactName}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Project
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{projectName}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {projectDescription || "No description"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Services ({selectedServices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {selectedServices.slice(0, 3).map((item) => (
                      <p key={item.serviceId} className="text-sm">
                        {item.service.serviceName} ({item.tier})
                      </p>
                    ))}
                    {selectedServices.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{selectedServices.length - 3} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatCurrency(calculateTotal())}</p>
                  {selectedDiscounts.length > 0 && (
                    <p className="text-sm text-green-600">
                      {selectedDiscounts.length} discount(s) applied
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium capitalize">
                    {paymentTerms.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {paymentSchedule.replace(/_/g, " ")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{assignedMembers.length} members</p>
                  <p className="text-sm text-muted-foreground">
                    {members
                      ?.filter((m) => assignedMembers.includes(m.id))
                      .map((m) => m.person)
                      .slice(0, 3)
                      .join(", ")}
                    {assignedMembers.length > 3 && "..."}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this project..."
                data-testid="input-notes"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dao">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-new-project">
            Create New Project
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
          </p>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} steps={steps} />

      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 0}
          data-testid="button-previous"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
            data-testid="button-next"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createProjectMutation.isPending}
            data-testid="button-create-project"
          >
            {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
