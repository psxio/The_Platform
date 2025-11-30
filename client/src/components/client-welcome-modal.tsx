import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CreditCard, 
  ShoppingCart, 
  History, 
  Package, 
  ArrowRight,
  CheckCircle 
} from "lucide-react";
import type { ClientOnboarding } from "@shared/schema";

export function ClientWelcomeModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { user } = useAuth();

  const { data: onboarding, isLoading } = useQuery<ClientOnboarding>({
    queryKey: ["/api/client-onboarding"],
    enabled: !!user,
  });

  const markStep = useMutation({
    mutationFn: async (stepName: string) => {
      return await apiRequest("POST", "/api/client-onboarding/mark-step", { step: stepName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-onboarding"] });
    },
  });

  useEffect(() => {
    if (!isLoading && onboarding && !onboarding.hasSeenWelcome) {
      setOpen(true);
    }
  }, [onboarding, isLoading]);

  const handleClose = () => {
    markStep.mutate("hasSeenWelcome");
    setOpen(false);
  };

  const features = [
    {
      icon: CreditCard,
      title: "View Your Credits",
      description: "Check your available credit balance at any time. Credits are used to order content through the portal.",
    },
    {
      icon: ShoppingCart,
      title: "Place Content Orders",
      description: "Use your credits to order articles, blog posts, social media content, graphics, and more.",
    },
    {
      icon: Package,
      title: "Request More Credits",
      description: "Need more credits? Submit a request and our team will review it promptly.",
    },
    {
      icon: History,
      title: "Track Everything",
      description: "View your complete transaction history and order status at any time.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to the Client Portal</DialogTitle>
          <DialogDescription>
            Your one-stop destination for managing credits and ordering content
          </DialogDescription>
        </DialogHeader>

        {step === 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 my-4">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate cursor-default">
                  <CardContent className="pt-4 pb-3 px-3">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(1)} className="w-full" data-testid="button-welcome-next">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">You're All Set!</h3>
                <p className="text-muted-foreground mt-1">
                  Start exploring the portal to manage your credits and place orders.
                </p>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <p className="font-medium mb-1">Quick Tips:</p>
                <ul className="text-left space-y-1">
                  <li>- Check your credit balance in the Overview tab</li>
                  <li>- Create draft orders before submitting them</li>
                  <li>- View all your transactions in the History tab</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full" data-testid="button-welcome-close">
                Start Exploring
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
