import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Search, Loader2, CheckCircle, FileSearch } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ExtractResult {
  filename: string;
  totalFound: number;
  addresses: string[];
}

export default function Extract() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const extractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to extract addresses");
      }
      
      return response.json() as Promise<ExtractResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: "Extraction complete",
        description: `Found ${data.totalFound} unique EVM addresses`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  }, []);

  const handleExtract = useCallback(() => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a file to extract addresses from",
        variant: "destructive",
      });
      return;
    }
    
    extractMutation.mutate(file);
  }, [file, extractMutation, toast]);

  const handleDownloadCSV = useCallback(() => {
    if (!result || result.addresses.length === 0) return;
    
    const csvContent = "address\n" + result.addresses.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_addresses_${result.filename.replace(/\.[^/.]+$/, "")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "CSV Downloaded",
      description: `${result.addresses.length} addresses exported`,
    });
  }, [result, toast]);

  const handleClear = useCallback(() => {
    setFile(null);
    setResult(null);
    setSearchQuery("");
  }, []);

  const filteredAddresses = result?.addresses.filter(addr => 
    addr.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <FileSearch className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Address Extractor</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload any file or document and we'll automatically find all EVM wallet addresses. 
            Download the results as a CSV to use with the comparison tool.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Supports PDF, CSV, TXT, JSON, Excel, HTML, and most text-based files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragOver 
                    ? "border-primary bg-primary/5" 
                    : file 
                    ? "border-green-500 bg-green-500/5" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
                data-testid="dropzone-extract"
              >
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      data-testid="button-clear-file"
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-12 h-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">Drop file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  data-testid="input-extract-file"
                />
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleExtract}
                  disabled={!file || extractMutation.isPending}
                  size="lg"
                  className="min-w-[200px]"
                  data-testid="button-extract"
                >
                  {extractMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Extract Addresses
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Extraction Results
                    </CardTitle>
                    <CardDescription>
                      Found {result.totalFound} unique EVM addresses in {result.filename}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleDownloadCSV}
                    disabled={result.addresses.length === 0}
                    data-testid="button-download-csv"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {result.addresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No EVM addresses found in this file</p>
                    <p className="text-sm mt-1">
                      Make sure the file contains valid Ethereum addresses (0x + 40 hex characters)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search addresses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-addresses"
                      />
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Showing {filteredAddresses.length} of {result.addresses.length} addresses
                    </div>

                    <div className="max-h-96 overflow-y-auto border rounded-lg">
                      <table className="w-full" data-testid="table-extracted-addresses">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium text-muted-foreground text-sm">#</th>
                            <th className="text-left p-3 font-medium text-muted-foreground text-sm">Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAddresses.slice(0, 100).map((address, index) => (
                            <tr 
                              key={address} 
                              className="border-t hover:bg-muted/30 transition-colors"
                              data-testid={`row-address-${index}`}
                            >
                              <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                              <td className="p-3 font-mono text-sm">{address}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {filteredAddresses.length > 100 && (
                        <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                          Showing first 100 results. Download CSV for complete list.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
