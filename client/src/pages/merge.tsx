import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Trash2, FileSpreadsheet, Loader2, Copy, Check, FileText, File, AlertTriangle, Archive } from "lucide-react";
import JSZip from "jszip";

interface FileProcessingResult {
  fileName: string;
  addressCount: number;
  error?: string;
  fromZip?: string;
}

interface MergeResult {
  addresses: string[];
  duplicatesRemoved: number;
  totalFromFiles: number;
  filesProcessed: number;
  fileResults: FileProcessingResult[];
}

interface ProcessableFile {
  name: string;
  data: Blob;
  fromZip?: string;
}

export default function Merge() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MergeResult | null>(null);
  const [amountPerWallet, setAmountPerWallet] = useState("0.05");
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // Accept ALL files - no filtering
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
      setResult(null);
      
      const zipCount = droppedFiles.filter(f => f.name.toLowerCase().endsWith('.zip')).length;
      const regularCount = droppedFiles.length - zipCount;
      
      let desc = `${droppedFiles.length} file(s) added`;
      if (zipCount > 0) {
        desc = `${regularCount} file(s) + ${zipCount} ZIP archive(s) added`;
      }
      
      toast({
        title: "Files added",
        description: desc,
      });
    }
  }, [toast]);

  // Accept ALL files - no filtering
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const allFiles = Array.from(e.target.files || []);
    
    if (allFiles.length > 0) {
      setFiles(prev => [...prev, ...allFiles]);
      setResult(null);
      
      const zipCount = allFiles.filter(f => f.name.toLowerCase().endsWith('.zip')).length;
      const regularCount = allFiles.length - zipCount;
      
      let desc = `${allFiles.length} file(s) added`;
      if (zipCount > 0) {
        desc = `${regularCount} file(s) + ${zipCount} ZIP archive(s) added`;
      }
      
      toast({
        title: "Files added",
        description: desc,
      });
    }
    
    // Reset the input
    if (e.target) {
      e.target.value = '';
    }
  }, [toast]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setResult(null);
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setResult(null);
  }, []);

  // Extract files from ZIP
  const extractZipFiles = async (zipFile: File): Promise<ProcessableFile[]> => {
    const extractedFiles: ProcessableFile[] = [];
    
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const filePromises: Promise<void>[] = [];
      
      zip.forEach((relativePath, zipEntry) => {
        // Skip directories and hidden files
        if (zipEntry.dir || relativePath.startsWith('__MACOSX') || relativePath.startsWith('.')) {
          return;
        }
        
        const promise = zipEntry.async('blob').then(blob => {
          extractedFiles.push({
            name: relativePath.split('/').pop() || relativePath,
            data: blob,
            fromZip: zipFile.name,
          });
        });
        
        filePromises.push(promise);
      });
      
      await Promise.all(filePromises);
    } catch (err) {
      console.error('Error extracting ZIP:', err);
    }
    
    return extractedFiles;
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: files.length, status: "Preparing files..." });
    
    try {
      // First, expand all ZIP files
      const allProcessableFiles: ProcessableFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i, total: files.length, status: `Checking ${file.name}...` });
        
        if (file.name.toLowerCase().endsWith('.zip')) {
          setProgress({ current: i, total: files.length, status: `Extracting ${file.name}...` });
          const extracted = await extractZipFiles(file);
          allProcessableFiles.push(...extracted);
        } else {
          allProcessableFiles.push({
            name: file.name,
            data: file,
          });
        }
      }
      
      toast({
        title: "Files prepared",
        description: `Processing ${allProcessableFiles.length} files...`,
      });
      
      const allAddresses: string[] = [];
      const fileResults: FileProcessingResult[] = [];
      
      // Process each file individually to track per-file results
      for (let i = 0; i < allProcessableFiles.length; i++) {
        const pFile = allProcessableFiles[i];
        setProgress({ 
          current: i, 
          total: allProcessableFiles.length, 
          status: `Processing ${pFile.name}${pFile.fromZip ? ` (from ${pFile.fromZip})` : ''}...` 
        });
        
        try {
          const formData = new FormData();
          formData.append("files", pFile.data, pFile.name);
          
          const response = await fetch("/api/extract", {
            method: "POST",
            body: formData,
          });
          
          if (!response.ok) {
            const error = await response.json();
            fileResults.push({
              fileName: pFile.name,
              addressCount: 0,
              error: error.message || "Failed to process file",
              fromZip: pFile.fromZip,
            });
          } else {
            const extractResult = await response.json();
            const addressCount = extractResult.addresses?.length || 0;
            
            if (addressCount > 0) {
              allAddresses.push(...extractResult.addresses);
            }
            
            fileResults.push({
              fileName: pFile.name,
              addressCount,
              error: addressCount === 0 ? "No wallet addresses found" : undefined,
              fromZip: pFile.fromZip,
            });
          }
        } catch (err) {
          fileResults.push({
            fileName: pFile.name,
            addressCount: 0,
            error: err instanceof Error ? err.message : "Unknown error",
            fromZip: pFile.fromZip,
          });
        }
      }
      
      setProgress({ current: allProcessableFiles.length, total: allProcessableFiles.length, status: "Removing duplicates..." });
      
      const totalFromFiles = allAddresses.length;
      
      // DEDUPLICATION: Normalize all addresses to lowercase and use Set
      const normalizedAddresses = allAddresses.map(addr => addr.toLowerCase().trim());
      const uniqueSet = new Set(normalizedAddresses);
      const uniqueAddresses = Array.from(uniqueSet);
      const duplicatesRemoved = totalFromFiles - uniqueAddresses.length;
      
      const filesWithErrors = fileResults.filter(f => f.error);
      const filesWithAddresses = fileResults.filter(f => f.addressCount > 0);
      
      setResult({
        addresses: uniqueAddresses,
        duplicatesRemoved,
        totalFromFiles,
        filesProcessed: allProcessableFiles.length,
        fileResults,
      });
      
      if (filesWithErrors.length > 0 && filesWithErrors.length < allProcessableFiles.length) {
        toast({
          title: "Merge complete with issues",
          description: `Found ${uniqueAddresses.length} unique addresses (${duplicatesRemoved} duplicates removed). ${filesWithErrors.length} file(s) had issues.`,
        });
      } else if (uniqueAddresses.length === 0) {
        toast({
          title: "No addresses found",
          description: "None of the files contained wallet addresses",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Merge complete",
          description: `Found ${uniqueAddresses.length} unique addresses from ${filesWithAddresses.length} files (${duplicatesRemoved} duplicates removed)`,
        });
      }
    } catch (error) {
      toast({
        title: "Merge failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const csvContent = [
      "wallet_address,amount",
      ...result.addresses.map(addr => `${addr},${amountPerWallet}`)
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `merged-wallets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `Downloading ${result.addresses.length} unique addresses`,
    });
  };

  const handleCopyAll = async () => {
    if (!result) return;
    
    const text = result.addresses.map(addr => `${addr},${amountPerWallet}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied to clipboard",
      description: `${result.addresses.length} unique addresses copied`,
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (ext === '.zip') {
      return <Archive className="w-4 h-4 flex-shrink-0 text-purple-600" />;
    } else if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      return <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-green-600" />;
    } else if (ext === '.pdf') {
      return <FileText className="w-4 h-4 flex-shrink-0 text-red-500" />;
    } else if (ext === '.json') {
      return <FileText className="w-4 h-4 flex-shrink-0 text-yellow-600" />;
    }
    return <File className="w-4 h-4 flex-shrink-0 text-muted-foreground" />;
  };

  const filesWithIssues = result?.fileResults.filter(f => f.error) || [];
  const zipFilesCount = files.filter(f => f.name.toLowerCase().endsWith('.zip')).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Merge & Extract Wallets</h1>
          <p className="text-muted-foreground">
            Upload any files (including ZIP archives) to extract and combine all wallet addresses into one file with no duplicates
          </p>
        </div>

        <div className="grid gap-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Files
              </CardTitle>
              <CardDescription>
                Drag and drop any files including ZIP archives. We'll extract and process all files inside.
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
                data-testid="dropzone-merge"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-merge"
                />
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">
                  {isDragOver ? "Drop files here" : "Click or drag files here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports any file type including ZIP archives
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {files.length} file(s) selected
                      {zipFilesCount > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({zipFilesCount} ZIP archive{zipFilesCount > 1 ? 's' : ''} will be extracted)
                        </span>
                      )}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearAll}
                      data-testid="button-clear-files"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {files.map((file, index) => (
                      <div 
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                        data-testid={`file-item-${index}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(file.name)}
                          <span className="truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                          {file.name.toLowerCase().endsWith('.zip') && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">
                              ZIP
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => removeFile(index)}
                          data-testid={`button-remove-file-${index}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="amount">Amount per wallet</Label>
                  <Input
                    id="amount"
                    type="text"
                    value={amountPerWallet}
                    onChange={(e) => setAmountPerWallet(e.target.value)}
                    placeholder="0.05"
                    className="mt-1"
                    data-testid="input-amount"
                  />
                </div>
              </div>

              {/* Progress */}
              {progress && (
                <div className="mt-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {progress.status}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {progress.current} / {progress.total} files
                      </p>
                      <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Merge Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleMerge}
                  disabled={files.length === 0 || processing}
                  size="lg"
                  className="min-w-[200px]"
                  data-testid="button-merge"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Extract & Merge
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* File Issues Warning */}
          {result && filesWithIssues.length > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20" data-testid="card-file-issues">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="w-5 h-5" />
                  Files With Issues ({filesWithIssues.length})
                </CardTitle>
                <CardDescription className="text-yellow-600 dark:text-yellow-500">
                  These files could not be processed or contained no wallet addresses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filesWithIssues.map((file, index) => (
                    <div 
                      key={`issue-${index}`}
                      className="flex items-center justify-between p-2 bg-yellow-100/50 dark:bg-yellow-900/20 rounded text-sm"
                      data-testid={`file-issue-${index}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-yellow-600" />
                        <span className="font-medium truncate">{file.fileName}</span>
                        {file.fromZip && (
                          <span className="text-xs text-yellow-600">
                            (from {file.fromZip})
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-yellow-700 dark:text-yellow-400 ml-2 whitespace-nowrap">
                        {file.error}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <Card data-testid="card-merge-results">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      Merge Results
                    </CardTitle>
                    <CardDescription>
                      {result.addresses.length} unique addresses from {result.filesProcessed} files 
                      {result.duplicatesRemoved > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium ml-1">
                          ({result.duplicatesRemoved} duplicates removed)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyAll}
                      disabled={result.addresses.length === 0}
                      data-testid="button-copy-all"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy All
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDownload}
                      disabled={result.addresses.length === 0}
                      data-testid="button-download-merged"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {result.addresses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No wallet addresses found in the uploaded files</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full" data-testid="table-merged-addresses">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium text-muted-foreground text-sm">#</th>
                            <th className="text-left p-3 font-medium text-muted-foreground text-sm">Wallet Address</th>
                            <th className="text-right p-3 font-medium text-muted-foreground text-sm">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {result.addresses.slice(0, 100).map((address, index) => (
                            <tr key={address} className="hover:bg-muted/30">
                              <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                              <td className="p-3 font-mono text-sm">{address}</td>
                              <td className="p-3 text-sm text-right">{amountPerWallet}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {result.addresses.length > 100 && (
                      <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                        Showing first 100 of {result.addresses.length} addresses. Download CSV for complete list.
                      </div>
                    )}
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
