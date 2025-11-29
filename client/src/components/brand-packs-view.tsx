import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Package, Search, ExternalLink, Globe, FileText, Image, FileType, Download, Palette, ChevronRight, Files } from "lucide-react";

type BrandPack = {
  id: number;
  clientName: string;
  description: string | null;
  website: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fileCount?: number;
};

type BrandPackFile = {
  id: number;
  brandPackId: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: string | null;
  fileType: string | null;
  category: string | null;
  description: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
};

const FILE_CATEGORIES = [
  { value: "logo", label: "Logo" },
  { value: "guideline", label: "Brand Guidelines" },
  { value: "font", label: "Font" },
  { value: "color", label: "Color Palette" },
  { value: "template", label: "Template" },
  { value: "other", label: "Other" },
];

function getCategoryIcon(category: string | null) {
  switch (category) {
    case "logo": return <Image className="h-4 w-4" />;
    case "guideline": return <FileText className="h-4 w-4" />;
    case "font": return <FileType className="h-4 w-4" />;
    case "color": return <Palette className="h-4 w-4" />;
    case "template": return <FileText className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
}

function getCategoryColor(category: string | null) {
  switch (category) {
    case "logo": return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "guideline": return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "font": return "bg-green-500/10 text-green-700 dark:text-green-400";
    case "color": return "bg-pink-500/10 text-pink-700 dark:text-pink-400";
    case "template": return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    default: return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  }
}

function groupFilesByCategory(files: BrandPackFile[]) {
  const grouped: Record<string, BrandPackFile[]> = {};
  
  for (const file of files) {
    const category = file.category || "other";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(file);
  }
  
  return grouped;
}

export function BrandPacksView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPack, setSelectedPack] = useState<BrandPack | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: brandPacks, isLoading } = useQuery<BrandPack[]>({
    queryKey: ["/api/brand-packs"],
  });

  const { data: packDetails, isLoading: loadingDetails } = useQuery<BrandPack & { files: BrandPackFile[] }>({
    queryKey: ["/api/brand-packs", selectedPack?.id],
    enabled: !!selectedPack && isDetailsOpen,
  });

  const filteredPacks = brandPacks?.filter(pack => 
    pack.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pack.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleOpenPack = (pack: BrandPack) => {
    setSelectedPack(pack);
    setIsDetailsOpen(true);
  };

  const handleDownloadFile = (file: BrandPackFile) => {
    window.open(file.filePath, "_blank");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brand packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-brand-packs"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredPacks.length} client{filteredPacks.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {filteredPacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPacks.map(pack => (
            <Card 
              key={pack.id}
              className="cursor-pointer transition-colors hover-elevate"
              onClick={() => handleOpenPack(pack)}
              data-testid={`brand-pack-card-${pack.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {pack.primaryColor ? (
                      <div 
                        className="w-10 h-10 rounded-md border flex items-center justify-center"
                        style={{ backgroundColor: pack.primaryColor }}
                      >
                        <Package className="h-5 w-5 text-white drop-shadow-md" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">{pack.clientName}</CardTitle>
                      {pack.fileCount !== undefined && (
                        <CardDescription className="text-xs">
                          {pack.fileCount} file{pack.fileCount !== 1 ? "s" : ""}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {pack.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {pack.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {pack.website && (
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 mr-1" />
                      Website
                    </Badge>
                  )}
                  {(pack.primaryColor || pack.secondaryColor) && (
                    <div className="flex items-center gap-1">
                      {pack.primaryColor && (
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: pack.primaryColor }}
                          title={`Primary: ${pack.primaryColor}`}
                        />
                      )}
                      {pack.secondaryColor && (
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: pack.secondaryColor }}
                          title={`Secondary: ${pack.secondaryColor}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium mb-1">
              {searchQuery ? "No matching brand packs" : "No Brand Packs Available"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchQuery 
                ? "Try adjusting your search terms"
                : "Brand packs will appear here once your admin adds them. Brand packs contain logos, guidelines, fonts, and other assets for each client."
              }
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              {selectedPack?.primaryColor ? (
                <div 
                  className="w-12 h-12 rounded-lg border flex items-center justify-center"
                  style={{ backgroundColor: selectedPack.primaryColor }}
                >
                  <Package className="h-6 w-6 text-white drop-shadow-md" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div>
                <DialogTitle className="text-xl">{selectedPack?.clientName}</DialogTitle>
                {selectedPack?.description && (
                  <DialogDescription>{selectedPack.description}</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6">
            {loadingDetails ? (
              <div className="space-y-4 pb-6">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            ) : packDetails ? (
              <div className="space-y-6 pb-6">
                {(packDetails.website || packDetails.primaryColor || packDetails.secondaryColor) && (
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    {packDetails.website && (
                      <a
                        href={packDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="h-4 w-4" />
                        {packDetails.website}
                      </a>
                    )}
                    {(packDetails.primaryColor || packDetails.secondaryColor) && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Brand Colors:</span>
                        {packDetails.primaryColor && (
                          <div className="flex items-center gap-1">
                            <div
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: packDetails.primaryColor }}
                            />
                            <span className="text-xs text-muted-foreground font-mono">{packDetails.primaryColor}</span>
                          </div>
                        )}
                        {packDetails.secondaryColor && (
                          <div className="flex items-center gap-1">
                            <div
                              className="w-8 h-8 rounded border"
                              style={{ backgroundColor: packDetails.secondaryColor }}
                            />
                            <span className="text-xs text-muted-foreground font-mono">{packDetails.secondaryColor}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {packDetails.notes && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm">
                      <strong className="text-muted-foreground">Notes:</strong> {packDetails.notes}
                    </p>
                  </div>
                )}

                {packDetails.files && packDetails.files.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium flex items-center gap-2">
                        <Files className="h-4 w-4" />
                        Files ({packDetails.files.length})
                      </h3>
                    </div>
                    
                    {Object.entries(groupFilesByCategory(packDetails.files)).map(([category, files]) => (
                      <div key={category} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-2">
                          <div className={`p-1.5 rounded ${getCategoryColor(category)}`}>
                            {getCategoryIcon(category)}
                          </div>
                          {FILE_CATEGORIES.find(c => c.value === category)?.label || "Other"}
                          <Badge variant="outline" className="ml-auto text-xs">
                            {files.length}
                          </Badge>
                        </h4>
                        <div className="grid gap-2">
                          {files.map(file => (
                            <div
                              key={file.id}
                              className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                              data-testid={`brand-pack-file-${file.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{file.originalName}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {file.fileSize && <span>{file.fileSize}</span>}
                                  {file.description && (
                                    <>
                                      <span>-</span>
                                      <span className="truncate">{file.description}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadFile(file)}
                                data-testid={`button-download-file-${file.id}`}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                    <Files className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No files uploaded yet</p>
                    <p className="text-sm">Ask your admin to add brand assets</p>
                  </div>
                )}
              </div>
            ) : null}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
