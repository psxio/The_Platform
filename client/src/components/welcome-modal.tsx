import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ListTodo, Users, FileUp, ArrowRight, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface OnboardingStatus {
  userId: string;
  hasSeenWelcome: boolean;
  hasCreatedTask: boolean;
  hasAddedTeamMember: boolean;
  hasUploadedDeliverable: boolean;
}

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

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

  const steps = [
    {
      icon: Sparkles,
      title: "Welcome to ContentFlowStudio",
      description: "Your team's content production hub. Manage tasks, track deliverables, and collaborate seamlessly.",
    },
    {
      icon: ListTodo,
      title: "Create Your First Task",
      description: "Head to the Tasks tab to create and assign content tasks. Set due dates, priorities, and track progress.",
      action: "Go to Tasks",
    },
    {
      icon: Users,
      title: "Build Your Team",
      description: "Add team members in the Team tab. They'll receive notifications and can be assigned tasks.",
      action: "Add Team Members",
    },
    {
      icon: FileUp,
      title: "Upload Deliverables",
      description: "When tasks are complete, upload deliverable files in the Deliverables tab. Track versions and get approvals.",
      action: "Manage Deliverables",
    },
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
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
              <Card className="p-3 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Task Management</p>
                  <p className="text-xs text-muted-foreground">Create, assign, and track content tasks</p>
                </div>
              </Card>
              <Card className="p-3 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Team Collaboration</p>
                  <p className="text-xs text-muted-foreground">Invite team members and work together</p>
                </div>
              </Card>
              <Card className="p-3 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Deliverable Tracking</p>
                  <p className="text-xs text-muted-foreground">Upload files, track versions, get approvals</p>
                </div>
              </Card>
              <Card className="p-3 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Time & Analytics</p>
                  <p className="text-xs text-muted-foreground">Track time spent and view insights</p>
                </div>
              </Card>
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
            <Button onClick={handleClose}>
              Get Started
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
