import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, CheckCircle, AlertTriangle, FileText, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Papa from "papaparse";

interface DuplicateResult {
  originalCount: number;
  uniqueCount: number;
  duplicateCount: number;
  duplicates: { address: string; count: number }[];
  cleanedAddresses: string[];
  filename: string;
}

export default function DuplicateChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DuplicateResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processCSV = useCallback((csvFile: File) => {
    setIsProcessing(true);
    setResult(null);

    Papa.parse(csvFile, {
      complete: (results) => {
        const allAddresses: string[] = [];
        
        results.data.forEach((row: unknown) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (typeof cell === "string" && cell.trim()) {
                const cleaned = cell.trim().toLowerCase();
                if (cleaned.startsWith("0x") && cleaned.length === 42) {
                  allAddresses.push(cleaned);
                } else if (cleaned.length === 42 || cleaned.length === 40) {
                  const addr = cleaned.startsWith("0x") ? cleaned : `0x${cleaned}`;
                  if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
                    allAddresses.push(addr.toLowerCase());
                  }
                }
              }
            });
          }
        });

        const addressCounts = new Map<string, number>();
        allAddresses.forEach((addr) => {
          addressCounts.set(addr, (addressCounts.get(addr) || 0) + 1);
        });

        const duplicates: { address: string; count: number }[] = [];
        addressCounts.forEach((count, address) => {
          if (count > 1) {
            duplicates.push({ address, count });
          }
        });

        duplicates.sort((a, b) => b.count - a.count);

        const uniqueAddresses = Array.from(addressCounts.keys());

        setResult({
          originalCount: allAddresses.length,
          uniqueCount: uniqueAddresses.length,
          duplicateCount: allAddresses.length - uniqueAddresses.length,
          duplicates,
          cleanedAddresses: uniqueAddresses,
          filename: csvFile.name,
        });

        setIsProcessing(false);

        if (duplicates.length > 0) {
          toast({
            title: "Duplicates found",
            description: `Found ${duplicates.length} addresses with duplicates (${allAddresses.length - uniqueAddresses.length} total duplicate entries)`,
          });
        } else {
          toast({
            title: "No duplicates",
            description: `All ${uniqueAddresses.length} addresses are unique`,
          });
        }
      },
      error: (error) => {
        setIsProcessing(false);
        toast({
          title: "Error parsing CSV",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  }, [toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".csv")) {
      setFile(droppedFile);
      processCSV(droppedFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
    }
  }, [processCSV, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processCSV(selectedFile);
    }
  }, [processCSV]);

  const downloadCleanedCSV = useCallback(() => {
    if (!result) return;

    const csvContent = result.cleanedAddresses.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaned_${result.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: `Cleaned CSV with ${result.uniqueCount} unique addresses`,
    });
  }, [result, toast]);

  const resetChecker = useCallback(() => {
    setFile(null);
    setResult(null);
    setSearchQuery("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const filteredDuplicates = result?.duplicates.filter((d) =>
    d.address.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Duplicate Checker</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to check for duplicate addresses and download a cleaned version
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Upload CSV</CardTitle>
          <CardDescription>
            Drop your CSV file here or click to browse. The tool will find and remove duplicate EVM addresses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
              data-testid="input-file"
            />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : "Drag & drop a CSV file here, or click to select"}
            </p>
            {isProcessing && (
              <p className="text-sm text-primary mt-2">Processing...</p>
            )}
          </div>

          {file && !isProcessing && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetChecker();
                }}
                data-testid="button-reset"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {result.duplicateCount > 0 ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Duplicates Found
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    No Duplicates
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold" data-testid="text-original-count">
                    {result.originalCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Entries</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600" data-testid="text-unique-count">
                    {result.uniqueCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Unique Addresses</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className={`text-2xl font-bold ${result.duplicateCount > 0 ? "text-yellow-600" : "text-green-600"}`} data-testid="text-duplicate-count">
                    {result.duplicateCount.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Duplicate Entries</div>
                </div>
              </div>

              {result.duplicateCount > 0 && (
                <Button
                  onClick={downloadCleanedCSV}
                  className="w-full"
                  data-testid="button-download-cleaned"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Cleaned CSV ({result.uniqueCount.toLocaleString()} addresses)
                </Button>
              )}
            </CardContent>
          </Card>

          {result.duplicates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Duplicate Details</CardTitle>
                <CardDescription>
                  {result.duplicates.length} addresses appeared more than once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search duplicates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-duplicates"
                    />
                  </div>
                </div>

                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {filteredDuplicates.map((dup, index) => (
                      <div
                        key={dup.address}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`row-duplicate-${index}`}
                      >
                        <code className="text-sm font-mono truncate flex-1 mr-2">
                          {dup.address}
                        </code>
                        <Badge variant="secondary">
                          {dup.count}x
                        </Badge>
                      </div>
                    ))}
                    {filteredDuplicates.length === 0 && searchQuery && (
                      <p className="text-center text-muted-foreground py-4">
                        No duplicates match your search
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
