import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, File as FileIcon, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT" | "POST";
    url: string;
    objectPath?: string;
  }>;
  onComplete?: (result: { successful: Array<{ name: string; size: number; uploadURL: string }> }) => void;
  buttonClassName?: string;
  children: ReactNode;
}

interface FileWithProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter((file) => {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > maxNumberOfFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload ${maxNumberOfFiles} file(s)`,
        variant: "destructive",
      });
      return;
    }

    setFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      })),
    ]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const successful: Array<{ name: string; size: number; uploadURL: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const fileWithProgress = files[i];
      if (fileWithProgress.status !== "pending") continue;

      try {
        setFiles((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "uploading" };
          return updated;
        });

        const uploadParams = await onGetUploadParameters();
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            setFiles((prev) => {
              const updated = [...prev];
              updated[i] = { ...updated[i], progress };
              return updated;
            });
          }
        });

        await new Promise<void>((resolve, reject) => {
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setFiles((prev) => {
                const updated = [...prev];
                updated[i] = { ...updated[i], status: "success", progress: 100 };
                return updated;
              });
              
              let uploadURL = "";
              
              try {
                if (!xhr.responseText) {
                  throw new Error("Empty response from upload");
                }
                const response = JSON.parse(xhr.responseText);
                uploadURL = response.filePath || response.uploadId || uploadParams.objectPath || uploadParams.url;
              } catch (e) {
                console.error("Failed to parse upload response:", e);
                uploadURL = uploadParams.objectPath || uploadParams.url;
              }
              
              if (!uploadURL) {
                throw new Error("No upload URL received from server");
              }
              successful.push({
                name: fileWithProgress.file.name,
                size: fileWithProgress.file.size,
                uploadURL: uploadURL,
              });
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Upload failed"));
          });

          if (uploadParams.method === "PUT") {
            xhr.open("PUT", uploadParams.url);
            xhr.send(fileWithProgress.file);
          } else {
            const formData = new FormData();
            formData.append("file", fileWithProgress.file);
            xhr.open("POST", uploadParams.url);
            xhr.send(formData);
          }
        });
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "error" };
          return updated;
        });
        toast({
          title: "Upload failed",
          description: `Failed to upload ${fileWithProgress.file.name}`,
          variant: "destructive",
        });
      }
    }

    setUploading(false);

    if (successful.length > 0) {
      onComplete?.({ successful });
      setFiles([]);
      setShowModal(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div>
      <Button
        onClick={() => setShowModal(true)}
        className={buttonClassName}
        type="button"
        data-testid="button-upload"
      >
        {children}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload (max {maxNumberOfFiles} file(s), {Math.round(maxFileSize / 1024 / 1024)}MB each)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-md p-8 text-center cursor-pointer hover-elevate transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                Click to browse or drag and drop files here
              </p>
              <p className="text-xs text-muted-foreground">
                Maximum {Math.round(maxFileSize / 1024 / 1024)}MB per file
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple={maxNumberOfFiles > 1}
                onChange={(e) => handleFileSelect(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((fileWithProgress, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-border rounded-md"
                  >
                    <FileIcon className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileWithProgress.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(fileWithProgress.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {fileWithProgress.status === "uploading" && (
                        <Progress value={fileWithProgress.progress} className="mt-2 h-1" />
                      )}
                      {fileWithProgress.status === "success" && (
                        <p className="text-xs text-emerald-600 mt-1">Upload complete</p>
                      )}
                      {fileWithProgress.status === "error" && (
                        <p className="text-xs text-destructive mt-1">Upload failed</p>
                      )}
                    </div>
                    {fileWithProgress.status === "pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upload {files.length > 0 && `(${files.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
