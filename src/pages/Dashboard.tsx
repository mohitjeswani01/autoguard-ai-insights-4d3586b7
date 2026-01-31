import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Send,
  ArrowLeft,
  Car,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ImageViewer } from "@/components/dashboard/ImageViewer";
import { DamageSummary } from "@/components/dashboard/DamageSummary";
import { SeverityMeter } from "@/components/dashboard/SeverityMeter";
import { PayoutDisplay } from "@/components/dashboard/PayoutDisplay";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Dashboard() {
  const [selectedDamageId, setSelectedDamageId] = useState<string | undefined>(
    "dmg-001"
  );
  const navigate = useNavigate();

  const handleBoxClick = (box: { id: string }) => {
    setSelectedDamageId(box.id);
  };

  const handleGenerateReport = () => {
    // Simulate report generation
    console.log("Generating PDF report...");
  };

  const handleApproveClaim = () => {
    // Simulate claim approval
    console.log("Approving claim...");
    navigate("/claims");
  };

  return (
    <AppLayout>
      <div className="min-h-screen p-6 lg:p-8">
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
                Claim #CLM-2024-001234 • BMW 5 Series • Plate: ABC 1234
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Analysis Complete
              </div>
              <div className="text-sm text-muted-foreground">
                Processed in <span className="font-semibold text-foreground">8.4s</span>
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
            <DamageSummary
              selectedId={selectedDamageId}
              onSelect={setSelectedDamageId}
            />

            {/* Severity Meter */}
            <SeverityMeter severity="moderate" score={58} />

            {/* Payout Display */}
            <PayoutDisplay amount={4250} />
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
                Review Notes
              </h3>
              <p className="text-sm text-muted-foreground">
                Hood damage shows significant structural deformation. Recommend
                full panel replacement. Headlight assembly requires OEM parts.
                AI confidence is high (94%) - suitable for automated processing.
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
                Generate PDF Report
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Download className="w-5 h-5" />
                Export Data
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
