import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SeverityMeterProps {
  severity: "minor" | "moderate" | "severe";
  score: number; // 0-100
  className?: string;
}

const severityConfig = {
  minor: {
    label: "Minor",
    color: "text-emerald-500",
    gradientFrom: "from-emerald-500",
    gradientTo: "to-emerald-400",
    bgColor: "bg-emerald-500",
    range: [0, 33],
  },
  moderate: {
    label: "Moderate",
    color: "text-warning",
    gradientFrom: "from-warning",
    gradientTo: "to-yellow-400",
    bgColor: "bg-warning",
    range: [34, 66],
  },
  severe: {
    label: "Severe",
    color: "text-destructive",
    gradientFrom: "from-destructive",
    gradientTo: "to-red-400",
    bgColor: "bg-destructive",
    range: [67, 100],
  },
};

export function SeverityMeter({
  severity,
  score,
  className,
}: SeverityMeterProps) {
  const config = severityConfig[severity];
  
  // Calculate rotation based on score (0-100 maps to -90 to 90 degrees)
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className={cn("p-6 rounded-2xl bg-card border border-border", className)}>
      <h3 className="text-lg font-semibold text-foreground mb-6 text-center">
        Overall Severity
      </h3>

      {/* Radial Gauge */}
      <div className="relative w-48 h-28 mx-auto mb-6">
        {/* Background Arc */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 110"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(160 84% 39%)" />
              <stop offset="50%" stopColor="hsl(38 92% 50%)" />
              <stop offset="100%" stopColor="hsl(0 84% 60%)" />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Colored arc */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: score / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180 - 90;
            const radians = (angle * Math.PI) / 180;
            const innerRadius = 70;
            const outerRadius = 85;
            const x1 = 100 + innerRadius * Math.cos(radians);
            const y1 = 100 + innerRadius * Math.sin(radians);
            const x2 = 100 + outerRadius * Math.cos(radians);
            const y2 = 100 + outerRadius * Math.sin(radians);
            return (
              <line
                key={tick}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="2"
                strokeLinecap="round"
                opacity={0.5}
              />
            );
          })}
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            width: "4px",
            height: "60px",
            marginLeft: "-2px",
          }}
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className={cn(
            "w-full h-full rounded-full",
            config.bgColor
          )} />
          <div className={cn(
            "absolute bottom-0 left-1/2 w-4 h-4 -ml-2 rounded-full",
            config.bgColor
          )} />
        </motion.div>
      </div>

      {/* Severity Label */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl",
            "bg-muted"
          )}
        >
          <span className={cn("w-3 h-3 rounded-full", config.bgColor)} />
          <span className={cn("text-2xl font-bold", config.color)}>
            {config.label}
          </span>
        </motion.div>
        <p className="text-sm text-muted-foreground mt-2">
          Damage Score: {score}/100
        </p>
      </div>

      {/* Segmented Bar Alternative */}
      <div className="mt-6 space-y-2">
        <div className="flex gap-1">
          {["minor", "moderate", "severe"].map((level) => {
            const lvlConfig = severityConfig[level as keyof typeof severityConfig];
            const isActive = level === severity;
            return (
              <div
                key={level}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all duration-300",
                  isActive ? lvlConfig.bgColor : "bg-muted"
                )}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Minor</span>
          <span>Moderate</span>
          <span>Severe</span>
        </div>
      </div>
    </div>
  );
}
