import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadCardProps {
  className?: string;
}

export function UploadCard({ className }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith("image/")) {
        setFile(droppedFile);
        setPreview(URL.createObjectURL(droppedFile));
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
      }
    },
    []
  );

  const handleClear = useCallback(() => {
    setFile(null);
    setPreview(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) return;
    setIsUploading(true);
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsUploading(false);
    navigate("/dashboard");
  }, [file, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn(
        "relative p-8 rounded-2xl overflow-hidden",
        "glass-card glow-emerald",
        className
      )}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-navy-800/20 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Start Your Assessment
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          Upload a vehicle damage photo for instant AI analysis
        </p>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl transition-all duration-300",
            "flex flex-col items-center justify-center p-8",
            isDragging
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-border hover:border-emerald-500/50 hover:bg-muted/30",
            preview && "border-solid border-emerald-500"
          )}
        >
          {preview ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <motion.div
                animate={{
                  y: isDragging ? -5 : 0,
                  scale: isDragging ? 1.1 : 1,
                }}
                className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"
              >
                {isDragging ? (
                  <ImageIcon className="w-8 h-8 text-emerald-500" />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground" />
                )}
              </motion.div>

              <p className="text-foreground font-medium mb-1">
                {isDragging ? "Drop your image here" : "Drag and drop an image"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">or</p>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium text-sm">
                  Browse Files
                </span>
              </label>

              <p className="text-xs text-muted-foreground mt-4">
                Supports JPG, PNG, WEBP up to 10MB
              </p>
            </>
          )}
        </div>

        {/* Analyze Button */}
        {file && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleAnalyze}
            disabled={isUploading}
            className={cn(
              "w-full mt-6 py-4 rounded-xl font-semibold text-lg",
              "bg-gradient-to-r from-emerald-500 to-emerald-600",
              "text-white shadow-lg shadow-emerald-500/30",
              "hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]",
              "transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </span>
            ) : (
              "Analyze Damage"
            )}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
