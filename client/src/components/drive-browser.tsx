import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  ChevronRight,
  ExternalLink,
  Search,
  HardDrive,
  RefreshCw,
  Users,
  Briefcase,
  Home,
  FolderOpen,
  Grid3X3,
  List,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  isFolder: boolean;
}

interface DriveFolder {
  id: string;
  name: string;
  path: string[];
  files: DriveFile[];
  subfolders: DriveFolder[];
}

interface ContentTeamFolder {
  memberName: string;
  folderId: string;
  clientFolder?: DriveFolder;
  internalFolder?: DriveFolder;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.folder') return Folder;
  if (mimeType.startsWith('image/') || mimeType === 'application/vnd.google-apps.drawing') return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
}

function formatFileSize(bytes?: string) {
  if (!bytes) return '';
  const size = parseInt(bytes);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getMimeTypeLabel(mimeType: string): string {
  const mapping: Record<string, string> = {
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.spreadsheet': 'Google Sheet',
    'application/vnd.google-apps.presentation': 'Google Slides',
    'application/vnd.google-apps.drawing': 'Google Drawing',
    'application/vnd.google-apps.folder': 'Folder',
    'application/pdf': 'PDF',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'video/mp4': 'MP4 Video',
    'video/quicktime': 'QuickTime Video',
    'audio/mpeg': 'MP3 Audio',
    'text/plain': 'Text File',
  };
  return mapping[mimeType] || mimeType.split('/').pop()?.toUpperCase() || 'File';
}

interface FileCardProps {
  file: DriveFile;
  viewMode: 'grid' | 'list';
  onClick?: () => void;
}

function FileCard({ file, viewMode, onClick }: FileCardProps) {
  const Icon = getFileIcon(file.mimeType);
  
  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-md transition-colors",
          file.isFolder ? "hover-elevate cursor-pointer" : "hover-elevate"
        )}
        onClick={onClick}
        data-testid={`file-item-${file.id}`}
      >
        <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {getMimeTypeLabel(file.mimeType)}
            {file.size && ` • ${formatFileSize(file.size)}`}
          </p>
        </div>
        {file.modifiedTime && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            {format(new Date(file.modifiedTime), 'MMM d, yyyy')}
          </p>
        )}
        {!file.isFolder && file.webViewLink && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              window.open(file.webViewLink, '_blank');
            }}
            data-testid={`open-file-${file.id}`}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all",
        file.isFolder ? "hover-elevate cursor-pointer" : "hover-elevate"
      )}
      onClick={onClick}
      data-testid={`file-card-${file.id}`}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-2">
          {file.thumbnailLink && !file.isFolder ? (
            <div className="w-full h-24 rounded-md overflow-hidden bg-muted">
              <img
                src={file.thumbnailLink}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-24 rounded-md bg-muted flex items-center justify-center">
              <Icon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="w-full text-center">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {getMimeTypeLabel(file.mimeType)}
            </p>
          </div>
          {!file.isFolder && file.webViewLink && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                window.open(file.webViewLink, '_blank');
              }}
              data-testid={`open-file-btn-${file.id}`}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FolderBrowserProps {
  folder: DriveFolder;
  breadcrumb: { id: string; name: string }[];
  onNavigate: (folderId: string, path: { id: string; name: string }[]) => void;
  viewMode: 'grid' | 'list';
}

function FolderBrowser({ folder, breadcrumb, onNavigate, viewMode }: FolderBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const allItems = [
    ...folder.subfolders.map(sf => ({ ...sf, isFolder: true, mimeType: 'application/vnd.google-apps.folder' } as DriveFile & { subfolders?: DriveFolder[]; path?: string[] })),
    ...folder.files,
  ];
  
  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('', [])}
          className="text-muted-foreground"
          data-testid="breadcrumb-root"
        >
          <Home className="w-4 h-4" />
        </Button>
        {breadcrumb.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(crumb.id, breadcrumb.slice(0, index + 1))}
              className={index === breadcrumb.length - 1 ? 'font-semibold' : ''}
              data-testid={`breadcrumb-${crumb.id}`}
            >
              {crumb.name}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="search-files-input"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{searchQuery ? 'No files match your search' : 'This folder is empty'}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <FileCard
              key={item.id}
              file={item}
              viewMode={viewMode}
              onClick={item.isFolder ? () => {
                onNavigate(item.id, [...breadcrumb, { id: item.id, name: item.name }]);
              } : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <FileCard
              key={item.id}
              file={item}
              viewMode={viewMode}
              onClick={item.isFolder ? () => {
                onNavigate(item.id, [...breadcrumb, { id: item.id, name: item.name }]);
              } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface MemberFolderViewProps {
  memberFolder: ContentTeamFolder;
  viewMode: 'grid' | 'list';
}

function MemberFolderView({ memberFolder, viewMode }: MemberFolderViewProps) {
  const [activeTab, setActiveTab] = useState<'client' | 'internal'>('client');
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([]);

  const { data: folderContents, isLoading } = useQuery<DriveFolder>({
    queryKey: ['/api/drive/folders', currentFolder?.id || (activeTab === 'client' ? memberFolder.clientFolder?.id : memberFolder.internalFolder?.id), 'contents'],
    enabled: !!currentFolder?.id || !!(activeTab === 'client' ? memberFolder.clientFolder?.id : memberFolder.internalFolder?.id),
  });

  const displayFolder = currentFolder 
    ? folderContents 
    : (activeTab === 'client' ? memberFolder.clientFolder : memberFolder.internalFolder);

  const handleNavigate = (folderId: string, newBreadcrumb: { id: string; name: string }[]) => {
    if (!folderId) {
      setCurrentFolder(null);
      setBreadcrumb([]);
    } else {
      setCurrentFolder({ id: folderId, name: '', path: [], files: [], subfolders: [] });
      setBreadcrumb(newBreadcrumb);
    }
  };

  const handleTabChange = (tab: 'client' | 'internal') => {
    setActiveTab(tab);
    setCurrentFolder(null);
    setBreadcrumb([]);
  };

  const hasClient = !!memberFolder.clientFolder;
  const hasInternal = !!memberFolder.internalFolder;

  if (!hasClient && !hasInternal) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No client or internal folders found for this member</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as 'client' | 'internal')}>
        <TabsList>
          {hasClient && (
            <TabsTrigger value="client" className="gap-2" data-testid="tab-client">
              <Briefcase className="w-4 h-4" />
              Client
            </TabsTrigger>
          )}
          {hasInternal && (
            <TabsTrigger value="internal" className="gap-2" data-testid="tab-internal">
              <Users className="w-4 h-4" />
              Internal
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          ) : displayFolder ? (
            <FolderBrowser
              folder={displayFolder}
              breadcrumb={breadcrumb}
              onNavigate={handleNavigate}
              viewMode={viewMode}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Folder not found</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function DriveBrowser() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: driveStatus, isLoading: statusLoading } = useQuery<{ configured: boolean; hasFolderId: boolean }>({
    queryKey: ['/api/drive/status'],
  });

  const { data: teamFolders, isLoading: foldersLoading, refetch } = useQuery<ContentTeamFolder[]>({
    queryKey: ['/api/drive/team-folders'],
    enabled: driveStatus?.configured && driveStatus?.hasFolderId,
  });

  const isLoading = statusLoading || foldersLoading;
  const selectedMemberData = teamFolders?.find(f => f.memberName === selectedMember);

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 py-12">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Checking Drive connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!driveStatus?.configured) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <HardDrive className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Google Drive Not Connected</h3>
            <p className="text-muted-foreground mb-4">
              Google Drive integration needs to be configured to browse team files.
            </p>
            <Badge variant="outline">Contact Admin</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!driveStatus?.hasFolderId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Content Folder Not Set</h3>
            <p className="text-muted-foreground mb-4">
              The shared content folder needs to be configured.
            </p>
            <Badge variant="outline">Contact Admin</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Team Drive</h2>
            <p className="text-sm text-muted-foreground">
              Browse content team files organized by member
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="refresh-drive"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode('grid')}
              data-testid="view-grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode('list')}
              data-testid="view-list"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : !teamFolders || teamFolders.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Team Folders Found</h3>
              <p className="text-muted-foreground">
                No member folders were found in the shared Drive folder.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-2 space-y-1">
                    {teamFolders.map((folder) => (
                      <Button
                        key={folder.memberName}
                        variant={selectedMember === folder.memberName ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-2"
                        onClick={() => setSelectedMember(folder.memberName)}
                        data-testid={`member-${folder.memberName}`}
                      >
                        <Folder className="w-4 h-4" />
                        <span className="truncate">{folder.memberName}</span>
                        <div className="ml-auto flex gap-1">
                          {folder.clientFolder && (
                            <Badge variant="outline" className="text-xs px-1">C</Badge>
                          )}
                          {folder.internalFolder && (
                            <Badge variant="outline" className="text-xs px-1">I</Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {selectedMemberData ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5" />
                    {selectedMemberData.memberName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MemberFolderView
                    memberFolder={selectedMemberData}
                    viewMode={viewMode}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-16">
                    <Folder className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Select a Team Member</h3>
                    <p className="text-muted-foreground">
                      Choose a team member from the list to browse their files
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
