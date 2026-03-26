"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Loader } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./toast";

interface ResumeUploadProps {
  resumeId: string;
  resumeName: string;
  currentFileUrl?: string | null;
  onUploadSuccess?: (fileUrl: string) => void;
}

export function ResumeUpload({
  resumeId,
  resumeName,
  currentFileUrl,
  onUploadSuccess,
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const getFileName = (url: string): string => {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    // Extract original filename from the timestamp-filename format
    return lastPart.replace(/^\d+-/, "").replace(/\.pdf$/, "");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (file.type !== "application/pdf") {
      error("Only PDF files are allowed");
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      error(
        `File size exceeds 5MB limit (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
      );
      return;
    }

    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 30;
        });
      }, 100);

      const res = await fetch(`/api/resumes/${resumeId}/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const data = await res.json();
        error(data.error || "Failed to upload resume");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      const data = await res.json();
      success("Resume uploaded successfully");
      onUploadSuccess?.(data.fileUrl);

      // Reset after a short delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 500);
    } catch (err) {
      console.error("Upload error:", err);
      error("An unexpected error occurred during upload");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border hover:border-muted"
        } ${isUploading ? "opacity-60 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          disabled={isUploading}
          className="hidden"
        />

        <div className="text-center">
          {isUploading ? (
            <div className="space-y-3">
              <Loader className="w-8 h-8 mx-auto text-accent animate-spin" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Uploading...
                </p>
                <div className="w-full bg-border rounded-full h-1 mt-2">
                  <div
                    className="bg-accent h-1 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag and drop your resume
                </p>
                <p className="text-xs text-muted mt-1">or</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Browse Files
              </Button>
              <p className="text-xs text-muted">PDF only, max 5MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Current File Display */}
      {currentFileUrl && !isUploading && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-muted flex-shrink-0" />
            <span className="text-sm text-foreground truncate">
              {getFileName(currentFileUrl)}.pdf
            </span>
          </div>
          <a
            href={currentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent/80 font-medium flex-shrink-0 ml-2"
          >
            View
          </a>
        </div>
      )}

      {!currentFileUrl && !isUploading && (
        <p className="text-xs text-muted text-center">
          No file uploaded yet for {resumeName}
        </p>
      )}
    </div>
  );
}
