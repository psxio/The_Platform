import { useAuth } from "@/hooks/useAuth";
import { AdminPaymentRequests } from "@/components/admin-payment-requests";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Shield, Loader2 } from "lucide-react";

export default function AdminPayments() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You must be an admin to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link href="/content">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="heading-admin-payments-page">
              Payment Management
            </h1>
            <p className="text-muted-foreground">
              Review and process payment requests from content team members
            </p>
          </div>
        </div>

        <AdminPaymentRequests />
      </div>
    </div>
  );
}
