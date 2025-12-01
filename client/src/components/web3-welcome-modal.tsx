import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  GitCompare, 
  FileSearch, 
  FolderPlus, 
  History, 
  Merge,
  Wallet,
  Circle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Web3Onboarding } from "@shared/schema";

interface OnboardingStep {
  id: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  action?: string;
  checklistKey: keyof Web3Onboarding;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    icon: Wallet,
    title: "Welcome to Onchain Tools",
    description: "Your toolkit for managing and analyzing blockchain addresses. Compare wallets, extract addresses from files, and organize your collections.",
    checklistKey: "hasSeenWelcome",
  },
  {
    id: "compare",
    icon: GitCompare,
    title: "Compare Addresses",
    description: "Upload two lists of wallet addresses and instantly find which ones overlap, which are unique to each list, and get detailed breakdowns.",
    action: "Go to Compare",
    checklistKey: "hasComparedAddresses",
  },
  {
    id: "extract",
    icon: FileSearch,
    title: "Extract Addresses",
    description: "Upload CSV, PDF, or image files and automatically extract all EVM wallet addresses. Perfect for processing documents and screenshots.",
    action: "Go to Extract",
    checklistKey: "hasExtractedAddresses",
  },
  {
    id: "collections",
    icon: FolderPlus,
    title: "Manage Collections",
    description: "Organize your addresses into named collections. Track minted wallets, manage allowlists, and keep everything organized.",
    action: "Go to Collections",
    checklistKey: "hasCreatedCollection",
  },
  {
    id: "history",
    icon: History,
    title: "View History",
    description: "Access your past comparisons anytime. Review results, re-download exports, and track your comparison activity.",
    action: "Go to History",
    checklistKey: "hasViewedHistory",
  },
  {
    id: "merge",
    icon: Merge,
    title: "Merge & Dedupe",
    description: "Combine multiple CSV files into one and automatically remove duplicate addresses. Essential for managing large address lists.",
    action: "Go to Merge",
    checklistKey: "hasUsedMerge",
  },
];

export function Web3WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: onboarding } = useQuery<Web3Onboarding>({
    queryKey: ["/api/web3-onboarding"],
    enabled: !!user && user.role === "web3",
  });

  const markStepMutation = useMutation({
    mutationFn: (step: string) => apiRequest("POST", "/api/web3-onboarding/mark-step", { step }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web3-onboarding"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save onboarding progress.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (onboarding && !onboarding.hasSeenWelcome && user?.role === "web3") {
      setOpen(true);
    }
  }, [onboarding, user]);

  const handleClose = () => {
    markStepMutation.mutate("hasSeenWelcome");
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (user?.role !== "web3") {
    return null;
  }

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const featureCards = [
    { icon: GitCompare, title: "Compare Lists", desc: "Find overlaps between address lists" },
    { icon: FileSearch, title: "Extract from Files", desc: "Pull addresses from any document" },
    { icon: FolderPlus, title: "Collections", desc: "Organize and manage address groups" },
    { icon: Merge, title: "Merge & Dedupe", desc: "Combine and clean up lists" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-web3-welcome-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {step.title}
          </DialogTitle>
          <DialogDescription>
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center gap-2 mb-4">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {onboardingSteps.length}
            </span>
          </div>

          {currentStep === 0 && (
            <div className="grid gap-3">
              {featureCards.map((card, index) => (
                <Card key={index} className="hover-elevate cursor-default">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <card.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{card.title}</p>
                      <p className="text-xs text-muted-foreground">{card.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {currentStep > 0 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Your Progress</p>
                <div className="space-y-1">
                  {onboardingSteps.slice(1).map((s, i) => {
                    const isCompleted = onboarding?.[s.checklistKey];
                    const isCurrent = i + 1 === currentStep;
                    return (
                      <div 
                        key={s.id} 
                        className={`flex items-center gap-2 text-sm p-2 rounded-md ${
                          isCurrent ? 'bg-primary/5 border border-primary/20' : ''
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Circle className={`h-4 w-4 ${isCurrent ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        )}
                        <span className={isCompleted ? 'text-muted-foreground' : ''}>{s.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          {currentStep > 0 ? (
            <Button variant="ghost" onClick={handleBack} data-testid="button-back">
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep < onboardingSteps.length - 1 ? (
            <Button onClick={handleNext} data-testid="button-next">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleClose} data-testid="button-get-started">
              Get Started
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Web3OnboardingChecklist() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: onboarding } = useQuery<Web3Onboarding>({
    queryKey: ["/api/web3-onboarding"],
    enabled: !!user && user.role === "web3",
  });

  const markStepMutation = useMutation({
    mutationFn: (step: string) => apiRequest("POST", "/api/web3-onboarding/mark-step", { step }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web3-onboarding"] });
    },
  });

  if (!onboarding || user?.role !== "web3") {
    return null;
  }

  const completedCount = onboardingSteps.filter(s => onboarding[s.checklistKey]).length;
  const totalSteps = onboardingSteps.length;
  const allComplete = completedCount === totalSteps;

  if (allComplete) {
    return null;
  }

  const progress = (completedCount / totalSteps) * 100;

  return (
    <Card className="mb-4" data-testid="card-onboarding-checklist">
      <CardContent className="p-4">
        <button 
          className="w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Getting Started</span>
              <span className="text-sm text-muted-foreground">
                ({completedCount}/{totalSteps} complete)
              </span>
            </div>
            <Progress value={progress} className="w-24 h-2" />
          </div>
        </button>
        
        {isExpanded && (
          <div className="mt-4 space-y-2">
            {onboardingSteps.map((step) => {
              const isCompleted = onboarding[step.checklistKey];
              const Icon = step.icon;
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-3 p-2 rounded-md ${
                    isCompleted ? 'opacity-60' : 'hover-elevate cursor-pointer'
                  }`}
                  onClick={() => !isCompleted && step.action && markStepMutation.mutate(step.checklistKey)}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className={`text-sm ${isCompleted ? 'line-through' : ''}`}>{step.title}</span>
                  </div>
                  {step.action && !isCompleted && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
