import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

interface DamageItem {
  id: string;
  part: string;
  damageType: string;
  confidence: number;
  severity: "minor" | "moderate" | "severe";
  estimatedCost: number;
}

interface DamageSummaryProps {
  damages?: DamageItem[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const mockDamages: DamageItem[] = [
  {
    id: "dmg-001",
    part: "Hood Panel",
    damageType: "Dent + Scratch",
    confidence: 94,
    severity: "severe",
    estimatedCost: 28000,
  },
  {
    id: "dmg-002",
    part: "Left Headlight",
    damageType: "Crack",
    confidence: 87,
    severity: "moderate",
    estimatedCost: 9500,
  },
  {
    id: "dmg-003",
    part: "Front Bumper",
    damageType: "Scratch",
    confidence: 91,
    severity: "minor",
    estimatedCost: 5000,
  },
];

const severityConfig = {
  minor: {
    label: "Minor",
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
    icon: CheckCircle,
  },
  moderate: {
    label: "Moderate",
    color: "bg-warning",
    textColor: "text-warning",
    icon: AlertCircle,
  },
  severe: {
    label: "Severe",
    color: "bg-destructive",
    textColor: "text-destructive",
    icon: AlertTriangle,
  },
};

export function DamageSummary({
  damages = mockDamages,
  selectedId,
  onSelect,
}: DamageSummaryProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Damage Assessment
      </h3>

      <div className="space-y-3">
        {damages.map((damage, index) => {
          const severity = severityConfig[damage.severity];
          const Icon = severity.icon;
          const isSelected = selectedId === damage.id;

          return (
            <motion.div
              key={damage.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 overflow-hidden",
                  isSelected
                    ? "ring-2 ring-emerald-500 bg-emerald-500/5"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSelect?.(damage.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-foreground truncate">
                          {damage.part}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs shrink-0",
                            severity.textColor,
                            "border-current"
                          )}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {severity.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {damage.damageType}
                      </p>

                      {/* Confidence Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            AI Confidence
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              damage.confidence >= 90
                                ? "text-emerald-500"
                                : damage.confidence >= 80
                                  ? "text-warning"
                                  : "text-destructive"
                            )}
                          >
                            {damage.confidence}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${damage.confidence}%` }}
                            transition={{
                              delay: index * 0.1 + 0.3,
                              duration: 0.5,
                            }}
                            className={cn(
                              "h-full rounded-full",
                              damage.confidence >= 90
                                ? "bg-emerald-500"
                                : damage.confidence >= 80
                                  ? "bg-warning"
                                  : "bg-destructive"
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cost */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">
                        Est. Repair
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        ₹{damage.estimatedCost.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
