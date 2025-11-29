import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, Loader2, UserCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ContentAccessStatus {
  status: "pending" | "approved" | "rejected" | "no_record";
  profileComplete?: boolean;
  needsProfile?: boolean;
  reviewNotes?: string;
}

interface ContentAccessGuardProps {
  children: React.ReactNode;
}

export function ContentAccessGuard({ children }: ContentAccessGuardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: accessStatus, isLoading } = useQuery<ContentAccessStatus>({
    queryKey: ["/api/auth/content-access-status"],
    enabled: !!user && (user.role === "content" || user.role === "admin"),
  });

  if (user?.role === "admin") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accessStatus) {
    return (
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <Card className="border-destructive">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Error</CardTitle>
            <CardDescription>
              Unable to verify your content access status. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => setLocation("/role-select")} data-testid="button-go-back">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessStatus.status === "pending") {
    return (
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <CardTitle>Access Pending</CardTitle>
            <CardDescription className="text-base">
              Your request to join the content team is being reviewed by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              You'll receive a notification once your access has been approved. This usually takes less than 24 hours.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => window.location.reload()} data-testid="button-refresh">
                Check Status
              </Button>
              <Button variant="ghost" onClick={() => setLocation("/role-select")} data-testid="button-change-role">
                Choose a Different Role
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessStatus.status === "rejected") {
    return (
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <Card className="border-destructive">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Not Approved</CardTitle>
            <CardDescription className="text-base">
              Your request to join the content team was not approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {accessStatus.reviewNotes && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-left">
                <p className="font-medium mb-1">Message from admin:</p>
                <p className="text-muted-foreground">{accessStatus.reviewNotes}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Please contact an administrator if you believe this was in error.
            </p>
            <Button variant="outline" onClick={() => setLocation("/role-select")} data-testid="button-change-role">
              Choose a Different Role
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accessStatus.status === "approved" && accessStatus.needsProfile) {
    return (
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription className="text-base">
              Your content access has been approved! Please complete your profile to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/content/profile-setup")} data-testid="button-complete-profile">
              Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
