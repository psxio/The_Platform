import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

type CreditTransaction = {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
};

type CreditBalanceData = {
  balance: number;
  currency: string;
  notes: string | null;
  transactions: CreditTransaction[];
};

function formatCurrency(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(cents / 100);
}

export function CreditBalanceDisplay() {
  const { data, isLoading } = useQuery<CreditBalanceData>({
    queryKey: ["/api/client-credits/my-balance"],
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.balance === 0) {
    return null;
  }

  const lastTransaction = data.transactions?.[0];

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Credit</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-my-credit-balance">
                {formatCurrency(data.balance, data.currency)}
              </p>
            </div>
          </div>
          
          {lastTransaction && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">Last activity:</span>
                  <Badge variant="secondary" className="gap-1">
                    {lastTransaction.amount >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={lastTransaction.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                      {lastTransaction.amount >= 0 ? "+" : ""}{formatCurrency(Math.abs(lastTransaction.amount))}
                    </span>
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{lastTransaction.description || "Transaction"}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(lastTransaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {data.notes && (
          <p className="mt-2 text-sm text-muted-foreground italic">
            {data.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
