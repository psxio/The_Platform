import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, Clock, BarChart3, Database, ShieldCheck, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MonitoringConsentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const consentItems = [
  {
    id: "screenCapture",
    icon: Camera,
    title: "Screen Capture",
    description: "Your screen will be captured periodically during active monitoring sessions. Screenshots are taken at random intervals (every 1-10 minutes) to ensure fair representation of your work.",
  },
  {
    id: "activityLogging",
    icon: Clock,
    title: "Activity Logging",
    description: "Your active working time and idle periods will be tracked. The system detects when you're actively working versus when you're away from your computer.",
  },
  {
    id: "hourlyReports",
    icon: BarChart3,
    title: "Hourly Reports",
    description: "At the end of each hour, one random screenshot from that hour will be selected and included in your hourly activity report. This report shows your productivity summary.",
  },
  {
    id: "dataStorage",
    icon: Database,
    title: "Data Storage",
    description: "Your monitoring data (screenshots, activity logs, reports) will be stored securely and accessible to authorized administrators. Data is retained according to company policy.",
  },
];

export function MonitoringConsentDialog({ open, onClose, onSuccess }: MonitoringConsentDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [acknowledgements, setAcknowledgements] = useState<Record<string, boolean>>({
    screenCapture: false,
    activityLogging: false,
    hourlyReports: false,
    dataStorage: false,
  });
  const [finalConfirm, setFinalConfirm] = useState(false);

  const submitConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/monitoring/consent", {
        acknowledgedScreenCapture: true,
        acknowledgedActivityLogging: true,
        acknowledgedHourlyReports: true,
        acknowledgedDataStorage: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitoring/consent"] });
      onSuccess();
      resetAndClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit consent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetAndClose = () => {
    setStep(0);
    setAcknowledgements({
      screenCapture: false,
      activityLogging: false,
      hourlyReports: false,
      dataStorage: false,
    });
    setFinalConfirm(false);
    onClose();
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgements(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentItem = consentItems[step];
  const allAcknowledged = Object.values(acknowledgements).every(v => v);
  const isLastItem = step === consentItems.length - 1;
  const isReviewStep = step === consentItems.length;

  const handleNext = () => {
    if (!isReviewStep && acknowledgements[currentItem.id]) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (allAcknowledged && finalConfirm) {
      submitConsentMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Worker Monitoring Consent
          </DialogTitle>
          <DialogDescription>
            {isReviewStep 
              ? "Review and confirm your consent for worker monitoring"
              : `Step ${step + 1} of ${consentItems.length + 1}: ${currentItem.title}`
            }
          </DialogDescription>
        </DialogHeader>

        {isReviewStep ? (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                By providing consent, you acknowledge that your work activity will be monitored during active sessions. This monitoring is only active when you explicitly start a monitoring session.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <p className="text-sm font-medium">You have acknowledged:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {consentItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.title}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-start gap-3 pt-4 border-t">
              <Checkbox
                id="final-confirm"
                checked={finalConfirm}
                onCheckedChange={() => setFinalConfirm(!finalConfirm)}
                data-testid="checkbox-final-consent"
              />
              <Label htmlFor="final-confirm" className="text-sm leading-relaxed">
                I understand that monitoring will only occur during active work sessions that I start, and I consent to all the above monitoring activities.
              </Label>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
              <currentItem.icon className="h-8 w-8 text-primary mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1">{currentItem.title}</h4>
                <p className="text-sm text-muted-foreground">{currentItem.description}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id={`acknowledge-${currentItem.id}`}
                checked={acknowledgements[currentItem.id]}
                onCheckedChange={() => handleAcknowledge(currentItem.id)}
                data-testid={`checkbox-acknowledge-${currentItem.id}`}
              />
              <Label htmlFor={`acknowledge-${currentItem.id}`} className="text-sm">
                I understand and acknowledge the {currentItem.title.toLowerCase()} requirements
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={handleBack} data-testid="button-consent-back">
              Back
            </Button>
          )}
          
          {isReviewStep ? (
            <Button 
              onClick={handleSubmit}
              disabled={!finalConfirm || submitConsentMutation.isPending}
              data-testid="button-consent-submit"
            >
              {submitConsentMutation.isPending ? "Submitting..." : "Provide Consent"}
            </Button>
          ) : (
            <Button 
              onClick={handleNext}
              disabled={!acknowledgements[currentItem.id]}
              data-testid="button-consent-next"
            >
              {isLastItem ? "Review Consent" : "Next"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
