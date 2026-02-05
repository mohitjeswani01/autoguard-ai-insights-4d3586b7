import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import demoCarImage from "@/assets/demo-car-damage.jpg";
import { cn } from "@/lib/utils";

interface LiveDemoProps {
  className?: string;
}

interface DamageBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  delay: number;
}

const mockDamageBoxes: DamageBox[] = [
  {
    id: "1",
    x: 32,
    y: 18,
    width: 20,
    height: 22,
    label: "Hood Damage",
    confidence: 94,
    delay: 0.5,
  },
  {
    id: "2",
    x: 28,
    y: 40,
    width: 12,
    height: 10,
    label: "Headlight Crack",
    confidence: 87,
    delay: 1.0,
  },
  {
    id: "3",
    x: 8,
    y: 48,
    width: 18,
    height: 12,
    label: "Bumper Scratch",
    confidence: 91,
    delay: 1.5,
  },
];

export function LiveDemo({ className }: LiveDemoProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [showBoxes, setShowBoxes] = useState(false);

  useEffect(() => {
    const scanTimer = setTimeout(() => {
      setIsScanning(false);
      setShowBoxes(true);
    }, 3000);

    const resetTimer = setTimeout(() => {
      setIsScanning(true);
      setShowBoxes(false);
    }, 8000);

    const interval = setInterval(() => {
      setIsScanning(true);
      setShowBoxes(false);
      
      setTimeout(() => {
        setIsScanning(false);
        setShowBoxes(true);
      }, 3000);
    }, 8000);

    return () => {
      clearTimeout(scanTimer);
      clearTimeout(resetTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "border border-border shadow-2xl",
        className
      )}
    >
      {/* Demo Label */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 text-xs font-semibold backdrop-blur-sm border border-emerald-500/30">
          LIVE DEMO
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/80 text-foreground text-xs font-medium backdrop-blur-sm border border-border">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI Processing
        </span>
      </div>

      {/* Car Image */}
      <div className="relative aspect-[4/3]">
        <img
          src={demoCarImage}
          alt="Demo car with damage"
          className="w-full h-full object-cover"
        />

        {/* Scan Line Effect */}
        {isScanning && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: "400%" }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="absolute w-full h-1 bg-gradient-to-b from-transparent via-emerald-500 to-transparent opacity-80"
              style={{ boxShadow: "0 0 40px 10px hsl(160 84% 39% / 0.5)" }}
            />
          </div>
        )}

        {/* Damage Bounding Boxes */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {showBoxes &&
            mockDamageBoxes.map((box) => (
              <motion.g key={box.id}>
                <motion.rect
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: box.delay, duration: 0.3 }}
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  fill="none"
                  stroke="hsl(160 84% 39%)"
                  strokeWidth="0.4"
                  rx="0.5"
                  className="animate-pulse"
                />
                {/* Corner markers */}
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: box.delay + 0.2, duration: 0.2 }}
                  d={`M${box.x},${box.y + 2} L${box.x},${box.y} L${box.x + 2},${box.y}`}
                  stroke="hsl(160 84% 50%)"
                  strokeWidth="0.5"
                  fill="none"
                />
                <motion.path
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: box.delay + 0.2, duration: 0.2 }}
                  d={`M${box.x + box.width - 2},${box.y} L${box.x + box.width},${box.y} L${box.x + box.width},${box.y + 2}`}
                  stroke="hsl(160 84% 50%)"
                  strokeWidth="0.5"
                  fill="none"
                />
              </motion.g>
            ))}
        </svg>

        {/* Damage Labels */}
        {showBoxes &&
          mockDamageBoxes.map((box) => (
            <motion.div
              key={`label-${box.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: box.delay + 0.3, duration: 0.3 }}
              className="absolute pointer-events-none"
              style={{
                left: `${box.x}%`,
                top: `${box.y - 6}%`,
              }}
            >
              <div className="px-2 py-1 rounded-md bg-navy-900/90 backdrop-blur-sm border border-emerald-500/50 whitespace-nowrap">
                <span className="text-xs font-medium text-emerald-400">
                  {box.label}
                </span>
                <span className="text-xs text-slate-300 ml-2">
                  {box.confidence}%
                </span>
              </div>
            </motion.div>
          ))}
      </div>

      {/* Analysis Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showBoxes ? 1 : 0.3, y: 0 }}
        transition={{ duration: 0.5, delay: 2 }}
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-navy-900 via-navy-900/95 to-transparent"
      >
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-400">3</p>
            <p className="text-xs text-slate-400">Damages Found</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">Moderate</p>
            <p className="text-xs text-slate-400">Severity</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">$4,250</p>
            <p className="text-xs text-slate-400">Est. Repair</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
