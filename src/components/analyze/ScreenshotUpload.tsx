"use client";

import { useCallback, useState, useRef } from "react";

interface ScreenshotUploadProps {
  onUpload: (file: File) => void;
  preview?: string;
  onRemove?: () => void;
}

export default function ScreenshotUpload({
  onUpload,
  preview,
  onRemove,
}: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(
    (file: File) => {
      const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        alert("Please upload a PNG, JPG, GIF, or WebP image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Image must be under 10MB.");
        return;
      }
      onUpload(file);
    },
    [onUpload]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        validateAndUpload(files[0]);
      }
    },
    [validateAndUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  if (preview) {
    return (
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview}
          alt="Screenshot preview"
          className="w-full max-h-80 object-contain rounded-xl border border-white/10"
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
        isDragging
          ? "border-white/40 bg-white/5"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="text-4xl mb-3">📸</div>
      <p className="text-white/60 mb-1">Drop a screenshot here or click to upload</p>
      <p className="text-sm text-white/30">PNG, JPG, GIF, or WebP up to 10MB</p>
    </div>
  );
}
