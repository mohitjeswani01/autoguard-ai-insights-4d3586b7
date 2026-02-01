import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Clock, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PayoutDisplayProps {
  amount: number;
  laborCost?: number;
  partsCost?: number;
  processingTime?: number;
  className?: string;
}

export function PayoutDisplay({
  amount,
  laborCost = 12000,
  partsCost = 30500,
  processingTime = 8.4,
  className,
}: PayoutDisplayProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Main Payout Amount */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
              <span className="text-base font-medium">₹</span>
              Estimated Payout
            </p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold text-foreground"
            >
              ₹{amount.toLocaleString('en-IN')}
            </motion.p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>AI Verified</span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Cost Breakdown
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Parts</p>
              <p className="text-lg font-semibold text-foreground">
                ₹{partsCost.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Labor</p>
              <p className="text-lg font-semibold text-foreground">
                ₹{laborCost.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Processing Stats */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Processing Time</p>
              <p className="text-lg font-semibold text-foreground">
                {processingTime}s
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">AI Confidence</p>
              <p className="text-lg font-semibold text-emerald-500">94%</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
