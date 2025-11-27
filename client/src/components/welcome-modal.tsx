import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ListTodo, Users, FileUp, ArrowRight, Sparkles, ClipboardCheck, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingStatus {
  userId: string;
  hasSeenWelcome: boolean;
  hasCreatedTask: boolean;
  hasAddedTeamMember: boolean;
  hasUploadedDeliverable: boolean;
}

interface OnboardingStep {
  icon: typeof Sparkles;
  title: string;
  description: string;
  action?: string;
}

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();

  const { data: onboarding } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding"],
  });

  const dismissMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/onboarding/hasSeenWelcome"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    },
  });

  useEffect(() => {
    if (onboarding && !onboarding.hasSeenWelcome) {
      setOpen(true);
    }
  }, [onboarding]);

  const handleClose = () => {
    dismissMutation.mutate();
    setOpen(false);
  };

  const isAdmin = user?.role === "admin";

  // Don't show modal for web3 users - they don't use ContentFlowStudio
  if (user?.role === "web3") {
    return null;
  }

  // Build role-specific steps
  const getStepsForRole = (): OnboardingStep[] => {
    const steps: OnboardingStep[] = [];

    // Welcome step - same for all content users
    if (isAdmin) {
      steps.push({
        icon: Sparkles,
        title: "Welcome to ContentFlowStudio",
        description: "Your team's content production hub. Manage tasks, coordinate your team, and track deliverables all in one place.",
      });
    } else {
      steps.push({
        icon: Sparkles,
        title: "Welcome to ContentFlowStudio",
        description: "Your content workspace is ready. View your assigned tasks, upload deliverables, and track your progress.",
      });
    }

    // Task step - different messaging for admin vs content creator
    if (isAdmin) {
      steps.push({
        icon: ListTodo,
        title: "Manage Tasks",
        description: "Create and assign tasks to your team. Set priorities, due dates, and track everyone's progress from the Tasks tab.",
        action: "Go to Tasks",
      });
    } else {
      steps.push({
        icon: ClipboardCheck,
        title: "Your Assigned Tasks",
        description: "Check the Tasks tab to see work assigned to you. Update progress, add comments, and mark tasks complete when done.",
        action: "View Tasks",
      });
    }

    // Build team step - ONLY for admins
    if (isAdmin) {
      steps.push({
        icon: Users,
        title: "Build Your Team",
        description: "Invite team members from the Settings tab. They'll receive email invitations and can start collaborating right away.",
        action: "Invite Team",
      });
    }

    // Deliverables step - same for all
    steps.push({
      icon: FileUp,
      title: "Upload Deliverables",
      description: "When your work is ready, upload files in the Deliverables tab. Track versions and get feedback from your team.",
      action: "Manage Deliverables",
    });

    return steps;
  };

  const steps = getStepsForRole();
  const currentStepData = steps[currentStep];
  
  if (!currentStepData) return null;
  
  const Icon = currentStepData.icon;

  // Feature cards for the welcome step - role-specific
  const getFeatureCards = () => {
    const cards = [];

    if (isAdmin) {
      cards.push(
        { title: "Task Management", desc: "Create, assign, and track content tasks" },
        { title: "Team Collaboration", desc: "Invite team members and coordinate work" },
        { title: "Deliverable Tracking", desc: "Upload files, track versions, get approvals" },
        { title: "Time & Analytics", desc: "Track time spent and view team insights" }
      );
    } else {
      // Content creator - focus on their personal workflow
      cards.push(
        { title: "Your Tasks", desc: "View and complete tasks assigned to you" },
        { title: "Time Tracking", desc: "Log time spent on your work" },
        { title: "Deliverables", desc: "Upload your completed work for review" },
        { title: "Stay Updated", desc: "Get notifications on comments and updates" }
      );
    }

    return cards;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-welcome-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentStep ? "bg-primary" : index < currentStep ? "bg-primary/60" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {currentStep === 0 && (
            <div className="grid gap-3">
              {getFeatureCards().map((card, index) => (
                <Card key={index} className="p-3 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{card.title}</p>
                    <p className="text-xs text-muted-foreground">{card.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          {currentStep > 0 ? (
            <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleClose} data-testid="button-get-started">
              Get Started
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
