import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  ListTodo, 
  Users, 
  FileUp, 
  ArrowRight, 
  Sparkles, 
  ClipboardCheck, 
  Clock,
  Circle,
  BarChart3,
  Bell
} from "lucide-react";
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
  id: string;
  icon: typeof Sparkles;
  title: string;
  description: string;
  action?: string;
  checklistKey?: keyof OnboardingStatus;
}

const getAdminSteps = (): OnboardingStep[] => [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome to Content Studio",
    description: "Your team's content production hub. Manage tasks, coordinate your team, and track deliverables all in one place.",
    checklistKey: "hasSeenWelcome",
  },
  {
    id: "tasks",
    icon: ListTodo,
    title: "Manage Tasks",
    description: "Create and assign tasks to your team. Set priorities, due dates, and track everyone's progress from the Tasks tab.",
    action: "Go to Tasks",
    checklistKey: "hasCreatedTask",
  },
  {
    id: "team",
    icon: Users,
    title: "Build Your Team",
    description: "Invite team members from the Settings tab. They'll receive email invitations and can start collaborating right away.",
    action: "Invite Team",
    checklistKey: "hasAddedTeamMember",
  },
  {
    id: "deliverables",
    icon: FileUp,
    title: "Track Deliverables",
    description: "Upload files and track versions in the Deliverables tab. Review submissions and provide feedback to your team.",
    action: "Manage Deliverables",
    checklistKey: "hasUploadedDeliverable",
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "View Analytics",
    description: "Monitor team performance, track completion rates, and identify bottlenecks with built-in analytics dashboards.",
  },
];

const getContentCreatorSteps = (): OnboardingStep[] => [
  {
    id: "welcome",
    icon: Sparkles,
    title: "Welcome to Content Studio",
    description: "Your content workspace is ready. View your assigned tasks, upload deliverables, and track your progress.",
    checklistKey: "hasSeenWelcome",
  },
  {
    id: "tasks",
    icon: ClipboardCheck,
    title: "Your Assigned Tasks",
    description: "Check the Tasks tab to see work assigned to you. Update progress, add comments, and mark tasks complete when done.",
    action: "View Tasks",
    checklistKey: "hasCreatedTask",
  },
  {
    id: "time",
    icon: Clock,
    title: "Track Your Time",
    description: "Log time spent on each task to help the team understand workload and ensure accurate billing.",
    action: "Start Tracking",
  },
  {
    id: "deliverables",
    icon: FileUp,
    title: "Upload Deliverables",
    description: "When your work is ready, upload files in the Deliverables tab. Track versions and get feedback from your team.",
    action: "Manage Deliverables",
    checklistKey: "hasUploadedDeliverable",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Stay Updated",
    description: "You'll receive notifications when tasks are assigned, comments are added, or feedback is provided.",
  },
];

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

  if (user?.role === "web3") {
    return null;
  }

  const steps = isAdmin ? getAdminSteps() : getContentCreatorSteps();
  const currentStepData = steps[currentStep];
  
  if (!currentStepData) return null;
  
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const getFeatureCards = () => {
    if (isAdmin) {
      return [
        { icon: ListTodo, title: "Task Management", desc: "Create, assign, and track content tasks" },
        { icon: Users, title: "Team Collaboration", desc: "Invite team members and coordinate work" },
        { icon: FileUp, title: "Deliverable Tracking", desc: "Upload files, track versions, get approvals" },
        { icon: BarChart3, title: "Analytics Dashboard", desc: "Monitor performance and track progress" },
      ];
    } else {
      return [
        { icon: ClipboardCheck, title: "Your Tasks", desc: "View and complete tasks assigned to you" },
        { icon: Clock, title: "Time Tracking", desc: "Log time spent on your work" },
        { icon: FileUp, title: "Deliverables", desc: "Upload your completed work for review" },
        { icon: Bell, title: "Stay Updated", desc: "Get notifications on comments and updates" },
      ];
    }
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
          <div className="flex items-center gap-2 mb-4">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>
          </div>

          {currentStep === 0 && (
            <div className="grid gap-3">
              {getFeatureCards().map((card, index) => (
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
                    <h4 className="font-semibold">{currentStepData.title}</h4>
                    <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Your Progress</p>
                <div className="space-y-1">
                  {steps.slice(1).map((s, i) => {
                    const isCompleted = s.checklistKey && onboarding?.[s.checklistKey];
                    const isCurrent = i + 1 === currentStep;
                    const StepIcon = s.icon;
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
                        <StepIcon className="h-4 w-4 text-muted-foreground" />
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
            <Button variant="ghost" onClick={() => setCurrentStep(currentStep - 1)} data-testid="button-back">
              Back
            </Button>
          ) : (
            <div />
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(currentStep + 1)} data-testid="button-next">
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

export function ContentOnboardingChecklist() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: onboarding } = useQuery<OnboardingStatus>({
    queryKey: ["/api/onboarding"],
    enabled: !!user && (user.role === "content" || user.role === "admin"),
  });

  if (!onboarding || user?.role === "web3") {
    return null;
  }

  const isAdmin = user?.role === "admin";
  const steps = isAdmin ? getAdminSteps() : getContentCreatorSteps();
  
  const checklistSteps = steps.filter(s => s.checklistKey);
  const completedCount = checklistSteps.filter(s => s.checklistKey && onboarding[s.checklistKey]).length;
  const totalSteps = checklistSteps.length;
  const allComplete = completedCount === totalSteps;

  if (allComplete) {
    return null;
  }

  const progress = (completedCount / totalSteps) * 100;

  return (
    <Card className="mb-4" data-testid="card-content-onboarding-checklist">
      <CardContent className="p-4">
        <button 
          className="w-full text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">Getting Started with Content Studio</span>
              <span className="text-sm text-muted-foreground">
                ({completedCount}/{totalSteps} complete)
              </span>
            </div>
            <Progress value={progress} className="w-24 h-2" />
          </div>
        </button>
        
        {isExpanded && (
          <div className="mt-4 space-y-2">
            {checklistSteps.map((step) => {
              const isCompleted = step.checklistKey && onboarding[step.checklistKey];
              const Icon = step.icon;
              return (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-3 p-2 rounded-md ${
                    isCompleted ? 'opacity-60' : ''
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className={`text-sm ${isCompleted ? 'line-through' : ''}`}>{step.title}</span>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
