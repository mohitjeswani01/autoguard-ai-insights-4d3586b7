import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Upload, Image as ImageIcon, X, Loader2, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiService } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { InsuranceForm, InsuranceFormData } from "./InsuranceForm";

interface UploadCardProps {
  className?: string;
}

export function UploadCard({ className }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [insuranceData, setInsuranceData] = useState<InsuranceFormData | null>(null);
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
        setError(null);
      } else {
        setError("Please upload an image file");
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const selectedFile = e.target.files[0];
        if (selectedFile.type.startsWith("image/")) {
          setFile(selectedFile);
          setPreview(URL.createObjectURL(selectedFile));
          setError(null);
        } else {
          setError("Please select an image file (JPG, PNG, WEBP)");
        }
      }
    },
    []
  );

  const handleClear = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    setShowInsuranceForm(false);
  }, []);

  const handleInsuranceFormChange = useCallback((data: InsuranceFormData) => {
    setInsuranceData(data);
  }, []);

  const handleProceedToForm = useCallback(() => {
    if (file) {
      setShowInsuranceForm(true);
    }
  }, [file]);

  const handleBackToUpload = useCallback(() => {
    setShowInsuranceForm(false);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file) {
      setError("Please select an image");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      console.log("Uploading image to backend...");
      const response = await apiService.uploadImage(file, insuranceData || undefined);
      console.log("Upload response:", response);

      const analysisId = response.analysisId;
      if (!analysisId) {
        throw new Error("No analysis ID returned from backend");
      }

      // Save analysis ID to localStorage for the dashboard
      localStorage.setItem("lastAnalysisId", analysisId);
      console.log("Saved analysis ID:", analysisId);

      // Navigate to dashboard with analysis ID
      navigate(`/dashboard?id=${analysisId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload image";
      console.error("Upload error:", err);
      setError(errorMessage);
      setIsUploading(false);
    }
  }, [file, insuranceData, navigate]);

  // Quick analyze without form
  const handleQuickAnalyze = useCallback(async () => {
    setInsuranceData(null);
    await handleAnalyze();
  }, [handleAnalyze]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "glass-card glow-emerald",
        showInsuranceForm ? "p-0" : "p-8",
        className
      )}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-navy-800/20 pointer-events-none" />

      <AnimatePresence mode="wait">
        {!showInsuranceForm ? (
          /* Step 1: Image Upload */
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative z-10 p-8"
          >
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Start Your Assessment
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Upload a vehicle damage photo for instant AI analysis
            </p>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-600 flex items-center gap-2 text-sm"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}

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
                preview && "border-solid border-emerald-500",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {preview ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {!isUploading && (
                    <button
                      onClick={handleClear}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                      disabled={isUploading}
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

            {/* Action Buttons */}
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-3"
              >
                {/* Primary: Add Insurance Details */}
                <button
                  onClick={handleProceedToForm}
                  disabled={isUploading}
                  className={cn(
                    "w-full py-4 rounded-xl font-semibold text-lg",
                    "bg-gradient-to-r from-emerald-500 to-emerald-600",
                    "text-white shadow-lg shadow-emerald-500/30",
                    "hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02]",
                    "transition-all duration-300 flex items-center justify-center gap-2",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  )}
                >
                  Add Insurance Details
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Secondary: Quick Analyze */}
                <button
                  onClick={handleQuickAnalyze}
                  disabled={isUploading}
                  className={cn(
                    "w-full py-3 rounded-xl font-medium text-sm",
                    "bg-muted/50 hover:bg-muted",
                    "text-muted-foreground hover:text-foreground",
                    "transition-all duration-300",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isUploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    "Skip → Quick Analyze (Photo Only)"
                  )}
                </button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          /* Step 2: Insurance Form */
          <motion.div
            key="insurance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="relative z-10"
          >
            {/* Back Button & Preview */}
            <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-4">
              <button
                onClick={handleBackToUpload}
                disabled={isUploading}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {preview && (
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={preview}
                    alt="Selected"
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file && (file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Insurance Form */}
            <div className="max-h-[60vh] overflow-y-auto">
              <InsuranceForm onFormChange={handleInsuranceFormChange} />
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 text-red-600 flex items-center gap-2 text-sm"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              </div>
            )}

            {/* Analyze Button */}
            <div className="p-4 bg-muted/30 border-t border-border">
              <button
                onClick={handleAnalyze}
                disabled={isUploading}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-lg",
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
                    Analyzing with Insurance Context...
                  </span>
                ) : (
                  "Analyze Damage"
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
