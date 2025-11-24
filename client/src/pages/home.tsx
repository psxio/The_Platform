import { useState, useCallback } from "react";
import { Upload, FileText, Check, X, Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { Address, ComparisonResult } from "@shared/schema";

export default function Home() {
  const [mintedFile, setMintedFile] = useState<File | null>(null);
  const [eligibleFile, setEligibleFile] = useState<File | null>(null);
  const [dragOverMinted, setDragOverMinted] = useState(false);
  const [dragOverEligible, setDragOverEligible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "minted" | "eligible") => {
      e.preventDefault();
      e.stopPropagation();
      
      if (type === "minted") setDragOverMinted(false);
      else setDragOverEligible(false);

      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find(file => 
        file.name.endsWith('.csv') || 
        file.name.endsWith('.txt') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type === 'text/csv' ||
        file.type === 'text/plain' ||
        file.type === 'application/json' ||
        file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel'
      );

      if (validFile) {
        if (type === "minted") setMintedFile(validFile);
        else setEligibleFile(validFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV, TXT, JSON, or Excel file",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: "minted" | "eligible") => {
      const file = e.target.files?.[0];
      if (file) {
        if (type === "minted") setMintedFile(file);
        else setEligibleFile(file);
      }
    },
    []
  );

  const handleProcess = async () => {
    if (!mintedFile || !eligibleFile) {
      toast({
        title: "Missing files",
        description: "Please upload both files to continue",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("minted", mintedFile);
      formData.append("eligible", eligibleFile);

      const response = await fetch("/api/compare", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process files");
      }

      const data = await response.json();
      setResults(data);
      
      const invalidWarning = data.stats.invalidAddresses 
        ? ` (${data.stats.invalidAddresses} invalid addresses skipped)`
        : '';
      
      toast({
        title: "Processing complete",
        description: `Found ${data.stats.remaining} addresses eligible to mint${invalidWarning}`,
        variant: data.stats.invalidAddresses ? "default" : "default",
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!results) return;

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
    link.download = `eligible-not-minted-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Your CSV file is being downloaded",
    });
  };

  const handleClear = () => {
    setMintedFile(null);
    setEligibleFile(null);
    setResults(null);
    setSearchQuery("");
  };

  const filteredResults = results?.notMinted.filter(addr =>
    addr.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addr.username?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Wallet Address Comparison Tool
          </h1>
          <p className="text-muted-foreground">
            Compare wallet addresses across CSV files to identify eligible addresses that haven't minted
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-sm font-medium uppercase tracking-wide mb-4">
              Already Minted Addresses
            </label>
            <div
              onDragOver={(e) => {
                handleDragOver(e);
                setDragOverMinted(true);
              }}
              onDragLeave={() => setDragOverMinted(false)}
              onDrop={(e) => handleDrop(e, "minted")}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOverMinted
                  ? "border-primary bg-primary/5"
                  : mintedFile
                  ? "border-primary/50 bg-card"
                  : "border-border hover-elevate"
              }`}
              data-testid="upload-minted"
            >
              {mintedFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">{mintedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(mintedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMintedFile(null)}
                    data-testid="button-remove-minted"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-muted rounded-full">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      Drop file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.txt,.json,.xlsx,.xls,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => handleFileSelect(e, "minted")}
                    className="hidden"
                    id="minted-upload"
                    data-testid="input-minted"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => document.getElementById("minted-upload")?.click()}
                    data-testid="button-browse-minted"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <p className="text-xs text-muted-foreground">CSV, TXT, JSON, or Excel files</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium uppercase tracking-wide mb-4">
              Eligible to Mint Addresses
            </label>
            <div
              onDragOver={(e) => {
                handleDragOver(e);
                setDragOverEligible(true);
              }}
              onDragLeave={() => setDragOverEligible(false)}
              onDrop={(e) => handleDrop(e, "eligible")}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOverEligible
                  ? "border-primary bg-primary/5"
                  : eligibleFile
                  ? "border-primary/50 bg-card"
                  : "border-border hover-elevate"
              }`}
              data-testid="upload-eligible"
            >
              {eligibleFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">{eligibleFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(eligibleFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEligibleFile(null)}
                    data-testid="button-remove-eligible"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="p-3 bg-muted rounded-full">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">
                      Drop file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.txt,.json,.xlsx,.xls,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={(e) => handleFileSelect(e, "eligible")}
                    className="hidden"
                    id="eligible-upload"
                    data-testid="input-eligible"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => document.getElementById("eligible-upload")?.click()}
                    data-testid="button-browse-eligible"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <p className="text-xs text-muted-foreground">CSV, TXT, JSON, or Excel files</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center mb-12">
          <Button
            onClick={handleProcess}
            disabled={!mintedFile || !eligibleFile || processing}
            size="lg"
            className="min-w-48"
            data-testid="button-process"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Process Files"
            )}
          </Button>
          {results && (
            <Button
              variant="outline"
              size="lg"
              onClick={handleClear}
              data-testid="button-clear"
            >
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {results && (
          <>
            {results.validationErrors && results.validationErrors.length > 0 && (
              <Card className="mb-6 border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Validation Warnings</CardTitle>
                  <CardDescription>
                    {results.stats.invalidAddresses} invalid address{results.stats.invalidAddresses !== 1 ? 'es' : ''} found and skipped
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {results.validationErrors.slice(0, 10).map((error, idx) => (
                      <div key={idx} className="text-sm p-2 bg-destructive/10 rounded border border-destructive/20">
                        <span className="font-mono text-xs">{error.address}</span>
                        <span className="text-muted-foreground ml-2">- {error.error}</span>
                      </div>
                    ))}
                    {results.validationErrors.length > 10 && (
                      <p className="text-sm text-muted-foreground">
                        ... and {results.validationErrors.length - 10} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card data-testid="card-total-eligible">
                <CardHeader className="pb-3">
                  <CardDescription>Total Eligible</CardDescription>
                  <CardTitle className="text-3xl md:text-4xl font-bold">
                    {results.stats.totalEligible.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card data-testid="card-already-minted">
                <CardHeader className="pb-3">
                  <CardDescription>Already Minted</CardDescription>
                  <CardTitle className="text-3xl md:text-4xl font-bold">
                    {results.stats.totalMinted.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card data-testid="card-remaining">
                <CardHeader className="pb-3">
                  <CardDescription>Remaining to Mint</CardDescription>
                  <CardTitle className="text-3xl md:text-4xl font-bold text-primary">
                    {results.stats.remaining.toLocaleString()}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Eligible Addresses (Not Minted)</CardTitle>
                    <CardDescription>
                      {filteredResults.length} of {results.notMinted.length} addresses
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 sm:flex-initial sm:min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search addresses or usernames..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search"
                      />
                    </div>
                    <Button
                      onClick={handleDownload}
                      variant="default"
                      data-testid="button-download"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Rank
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Wallet Address
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                            Username
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                            Points
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((addr, idx) => (
                          <tr
                            key={`${addr.address}-${idx}`}
                            className="border-b last:border-0 hover-elevate"
                            data-testid={`row-address-${idx}`}
                          >
                            <td className="p-4 text-sm text-muted-foreground">
                              #{addr.rank || idx + 1}
                            </td>
                            <td className="p-4">
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {addr.address}
                              </code>
                            </td>
                            <td className="p-4 text-sm">
                              {addr.username || <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-4 text-sm text-right font-medium">
                              {addr.points?.toLocaleString() || <span className="text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No addresses match your search</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!results && !processing && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-4 bg-muted rounded-full">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="text-xl font-medium mb-2">No Results Yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Upload both CSV files and click "Process Files" to identify addresses that are eligible to mint but haven't minted yet
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <footer className="border-t mt-12 py-6">
        <div className="max-w-5xl mx-auto px-4 md:px-6 text-center text-sm text-muted-foreground">
          <p>Wallet Address Comparison Tool © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
