import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Send,
  ArrowLeft,
  Car,
  FileJson,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ImageViewer } from "@/components/dashboard/ImageViewer";
import { DamageSummary } from "@/components/dashboard/DamageSummary";
import { SeverityMeter } from "@/components/dashboard/SeverityMeter";
import { PayoutDisplay } from "@/components/dashboard/PayoutDisplay";
import { AppLayout } from "@/components/layout/AppLayout";
import { apiService, AnalysisResult, Claim } from "@/services/apiService";

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const [selectedDamageId, setSelectedDamageId] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const analysisId = searchParams.get("id") || localStorage.getItem("lastAnalysisId");

  const handleBoxClick = (box: { id: string }) => {
    setSelectedDamageId(box.id);
  };

  const handleGenerateReport = async () => {
    if (!claim) {
      alert("Please wait for analysis to complete");
      return;
    }

    try {
      const reportBlob = await apiService.generateReport({
        claimId: claim.id,
        includeImages: true,
        includeConfidenceMetrics: true,
        format: "json",
      });

      const url = URL.createObjectURL(new Blob([JSON.stringify(reportBlob, null, 2)]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `claim-${claim.claimNumber}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Report generation error:", err);
      alert("Failed to generate report");
    }
  };

  const handleApproveClaim = async () => {
    if (!claim) {
      alert("Please wait for analysis to complete");
      return;
    }

    try {
      const updatedClaim = await apiService.approveClaim(claim.id, "Approved by adjuster");
      alert(`Claim ${updatedClaim.claimNumber} approved successfully!`);
      // Refresh claims list and navigate
      setTimeout(() => navigate("/claims"), 1000);
    } catch (err) {
      console.error("Approval error:", err);
      alert("Failed to approve claim. Make sure the claim exists in the system.");
    }
  };

  // Fetch analysis with polling
  useEffect(() => {
    if (!analysisId) {
      setError("No analysis ID provided");
      setLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setError(null);
        const data = await apiService.getAnalysisResult(analysisId);
        console.log("Analysis data:", data);
        setAnalysis(data);

        if (data.damages && data.damages.length > 0) {
          setSelectedDamageId(data.damages[0].id);
        }

        // If still processing, poll again after 3 seconds
        if (data.status === "processing") {
          setPolling(true);
          setTimeout(fetchAnalysis, 3000);
        } else {
          setPolling(false);
          setLoading(false);

          // Create claim record from analysis
          if (data.status === "completed") {
            createClaim(data);
          }
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load analysis";
        console.error("Fetch error:", err);
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [analysisId]);

  const createClaim = async (analysisData: AnalysisResult) => {
    try {
      // Create and save claim to backend
      const savedClaim = await apiService.createClaim(analysisData.id);
      setClaim(savedClaim);
    } catch (err) {
      console.error("Error creating claim:", err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen p-6 lg:p-8 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
          <p className="text-lg text-foreground font-semibold">
            Analyzing vehicle damage...
          </p>
          <p className="text-muted-foreground">
            This may take 10-15 seconds. Please wait.
          </p>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error || !analysis) {
    return (
      <AppLayout>
        <div className="min-h-screen p-6 lg:p-8 flex flex-col items-center justify-center gap-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-lg text-red-500 font-semibold">
            {error || "No analysis data found"}
          </p>
          <Button
            onClick={() => navigate("/")}
            className="mt-4"
          >
            Go Back Home
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
        {/* Polling indicator */}
        {polling && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-blue-500/10 text-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Analysis still processing. Checking for updates...</span>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-emerald-500" />
                </div>
                Damage Analysis
              </h1>
              <p className="text-muted-foreground mt-1">
                {claim
                  ? `Claim #${claim.claimNumber} • ${claim.vehicleInfo?.model || "Vehicle"} • Plate: ${claim.vehiclePlate}`
                  : "Analysis in progress..."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Analysis Complete
              </div>
              <div className="text-sm text-muted-foreground">
                Processed by{" "}
                <span className="font-semibold text-foreground">
                  {analysis.status === "completed"
                    ? "AI Engine"
                    : "Processing..."}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Pane - Image Viewer */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="h-fit"
          >
            <ImageViewer
              imageUrl={analysis.imageUrl}
              boundingBoxes={
                analysis.damages?.map((dmg) => ({
                  id: dmg.id,
                  x: dmg.boundingBox?.x || 0,
                  y: dmg.boundingBox?.y || 0,
                  width: dmg.boundingBox?.width || 0,
                  height: dmg.boundingBox?.height || 0,
                  label: dmg.partIdentified,
                  damageType: dmg.damageType,
                  confidence: dmg.confidenceScore * 100,
                  color: analysis.overallSeverity?.level === "severe" ? "hsl(0 84% 60%)" :
                    analysis.overallSeverity?.level === "moderate" ? "hsl(38 92% 50%)" :
                      "hsl(160 84% 39%)",
                })) || []
              }
              selectedBoxId={selectedDamageId}
              onBoxClick={handleBoxClick}
            />
          </motion.div>

          {/* Right Pane - Analysis Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Damage Summary Cards */}
            {analysis.damages && analysis.damages.length > 0 ? (
              <DamageSummary
                damages={analysis.damages.map((dmg) => ({
                  id: dmg.id,
                  part: dmg.partIdentified,
                  damageType: dmg.damageType,
                  confidence: dmg.confidenceScore * 100,
                  severity: analysis.overallSeverity?.level || "minor",
                  estimatedCost: dmg.estimatedCost || 0,
                }))}
                selectedId={selectedDamageId}
                onSelect={setSelectedDamageId}
              />
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">No damages detected</p>
              </div>
            )}

            {/* Severity Meter */}
            <SeverityMeter
              severity={analysis.overallSeverity?.level || "minor"}
              score={analysis.overallSeverity?.score || 0}
            />

            {/* Payout Display */}
            <PayoutDisplay
              amount={analysis.totalEstimatedCost}
              partsCost={Math.round(analysis.totalEstimatedCost * 0.714)} // Approx 1 / 1.4
              laborCost={Math.round(analysis.totalEstimatedCost * 0.286)} // Approx 0.4 / 1.4
              confidence={Math.round(analysis.aiConfidence * 100)}
              processingTime={
                claim && claim.submittedAt && claim.processedAt
                  ? Math.round((new Date(claim.processedAt).getTime() - new Date(claim.submittedAt).getTime()) / 1000 * 10) / 10
                  : 8.4
              }
            />
          </motion.div>
        </div>

        {/* Bottom Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-6 rounded-2xl bg-card border border-border"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Notes Section */}
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Analysis Summary
              </h3>
              <p className="text-sm text-muted-foreground">
                {analysis.overallSeverity?.description ||
                  "Analyzing vehicle damage using AI models."}
                {" "}AI confidence score:{" "}
                <span className="font-semibold text-foreground">
                  {Math.round(analysis.aiConfidence * 100)}%
                </span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 lg:shrink-0">
              <Button
                variant="outline"
                size="lg"
                onClick={handleGenerateReport}
                className="gap-2"
              >
                <FileText className="w-5 h-5" />
                Generate Report
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const jsonData = {
                    claimNumber: claim?.claimNumber,
                    analysis: analysis,
                    damages: analysis?.damages,
                    totalCost: analysis?.totalEstimatedCost,
                  };
                  const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `claim-${claim?.claimNumber}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="gap-2"
              >
                <Download className="w-5 h-5" />
                Export Data
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={async () => {
                  if (!claim) return;
                  try {
                    await apiService.rejectClaim(claim.id, "Rejected by adjuster");
                    alert("Claim rejected successfully!");
                    navigate("/claims");
                  } catch (err) {
                    console.error("Rejection error:", err);
                    alert("Failed to reject claim");
                  }
                }}
                className="gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Reject Claim
              </Button>
              <Button
                size="lg"
                onClick={handleApproveClaim}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <Send className="w-5 h-5" />
                Approve Claim
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
