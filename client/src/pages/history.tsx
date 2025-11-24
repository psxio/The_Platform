import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Comparison, ComparisonResult } from "@shared/schema";
import { format } from "date-fns";

export default function History() {
  const { toast } = useToast();
  
  const { data: comparisons, isLoading } = useQuery<Comparison[]>({
    queryKey: ["/api/comparisons"],
  });

  const handleDownloadResults = (comparison: Comparison) => {
    const results = comparison.results as ComparisonResult;
    
    const csvContent = [
      "Wallet Address,Username,Points,Rank",
      ...results.notMinted.map(addr => 
        `${addr.address},${addr.username || ""},${addr.points || ""},${addr.rank || ""}`
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comparison-${comparison.id}-${format(new Date(comparison.createdAt), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your CSV file is being downloaded",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Comparison History
          </h1>
          <p className="text-muted-foreground">
            View and download previous wallet address comparisons
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading history...</p>
          </div>
        ) : !comparisons || comparisons.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No comparison history yet. Upload and compare files to see results here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {comparisons.map((comparison) => (
              <Card key={comparison.id} data-testid={`card-comparison-${comparison.id}`}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-primary" />
                        Comparison #{comparison.id}
                      </CardTitle>
                      <CardDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{format(new Date(comparison.createdAt), "PPp")}</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">Minted:</span> {comparison.mintedFileName}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">Eligible:</span> {comparison.eligibleFileName}
                        </div>
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadResults(comparison)}
                      data-testid={`button-download-${comparison.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total Eligible</p>
                      <p className="text-2xl font-bold" data-testid={`stat-eligible-${comparison.id}`}>
                        {comparison.totalEligible.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Already Minted</p>
                      <p className="text-2xl font-bold" data-testid={`stat-minted-${comparison.id}`}>
                        {comparison.totalMinted.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Remaining</p>
                      <p className="text-2xl font-bold text-primary" data-testid={`stat-remaining-${comparison.id}`}>
                        {comparison.remaining.toLocaleString()}
                      </p>
                    </div>
                    {comparison.invalidAddresses !== null && comparison.invalidAddresses > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Invalid</p>
                        <p className="text-2xl font-bold text-destructive" data-testid={`stat-invalid-${comparison.id}`}>
                          {comparison.invalidAddresses.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
