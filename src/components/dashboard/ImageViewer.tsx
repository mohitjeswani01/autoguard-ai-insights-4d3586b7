import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Download,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import demoCarImage from "@/assets/demo-car-damage.jpg";

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  damageType: string;
  confidence: number;
  color: string;
}

interface ImageViewerProps {
  imageUrl?: string;
  boundingBoxes?: BoundingBox[];
  onBoxClick?: (box: BoundingBox) => void;
  selectedBoxId?: string;
}

const mockBoundingBoxes: BoundingBox[] = [
  {
    id: "dmg-001",
    x: 32,
    y: 18,
    width: 20,
    height: 22,
    label: "Hood",
    damageType: "Dent + Scratch",
    confidence: 94,
    color: "hsl(0 84% 60%)",
  },
  {
    id: "dmg-002",
    x: 28,
    y: 40,
    width: 12,
    height: 10,
    label: "Headlight",
    damageType: "Crack",
    confidence: 87,
    color: "hsl(38 92% 50%)",
  },
  {
    id: "dmg-003",
    x: 8,
    y: 48,
    width: 18,
    height: 12,
    label: "Front Bumper",
    damageType: "Scratch",
    confidence: 91,
    color: "hsl(160 84% 39%)",
  },
];

export function ImageViewer({
  imageUrl = demoCarImage,
  boundingBoxes = mockBoundingBoxes,
  onBoxClick,
  selectedBoxId,
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [showOverlay, setShowOverlay] = useState(true);
  const [hoveredBox, setHoveredBox] = useState<string | null>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
  }, []);

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="h-8 w-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="h-8 w-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showOverlay ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowOverlay(!showOverlay)}
            className="gap-2"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">AI Overlay</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 relative overflow-hidden bg-navy-950/50">
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: zoom }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="relative">
            <img
              src={imageUrl}
              alt="Vehicle damage"
              className="max-w-full max-h-full object-contain rounded-lg"
              style={{ maxHeight: "500px" }}
            />

            {/* SVG Overlay */}
            {showOverlay && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {boundingBoxes.map((box) => {
                  const isSelected = selectedBoxId === box.id;
                  const isHovered = hoveredBox === box.id;
                  return (
                    <g key={box.id}>
                      {/* Bounding Box */}
                      <motion.rect
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          strokeWidth: isSelected || isHovered ? 0.5 : 0.3,
                        }}
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        fill={`${box.color.replace(")", " / 0.1)")}`}
                        stroke={box.color}
                        rx="0.5"
                        className="cursor-pointer pointer-events-auto"
                        onMouseEnter={() => setHoveredBox(box.id)}
                        onMouseLeave={() => setHoveredBox(null)}
                        onClick={() => onBoxClick?.(box)}
                      />
                      
                      {/* Corner Accents */}
                      <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        d={`M${box.x},${box.y + 3} L${box.x},${box.y} L${box.x + 3},${box.y}`}
                        stroke={box.color}
                        strokeWidth="0.6"
                        fill="none"
                      />
                      <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        d={`M${box.x + box.width - 3},${box.y} L${box.x + box.width},${box.y} L${box.x + box.width},${box.y + 3}`}
                        stroke={box.color}
                        strokeWidth="0.6"
                        fill="none"
                      />
                      <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        d={`M${box.x},${box.y + box.height - 3} L${box.x},${box.y + box.height} L${box.x + 3},${box.y + box.height}`}
                        stroke={box.color}
                        strokeWidth="0.6"
                        fill="none"
                      />
                      <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        d={`M${box.x + box.width - 3},${box.y + box.height} L${box.x + box.width},${box.y + box.height} L${box.x + box.width},${box.y + box.height - 3}`}
                        stroke={box.color}
                        strokeWidth="0.6"
                        fill="none"
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Labels */}
            {showOverlay &&
              boundingBoxes.map((box) => {
                const isSelected = selectedBoxId === box.id;
                const isHovered = hoveredBox === box.id;
                return (
                  <motion.div
                    key={`label-${box.id}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{
                      opacity: isSelected || isHovered ? 1 : 0.8,
                      y: 0,
                      scale: isSelected || isHovered ? 1.05 : 1,
                    }}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y - 5}%`,
                    }}
                  >
                    <div
                      className={cn(
                        "px-2 py-1 rounded-md backdrop-blur-sm whitespace-nowrap",
                        "bg-navy-900/90 border shadow-lg"
                      )}
                      style={{ borderColor: box.color }}
                    >
                      <span
                        className="text-xs font-medium"
                        style={{ color: box.color }}
                      >
                        {box.label}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        {box.confidence}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </motion.div>

        {/* Processing Overlay */}
        {false && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-foreground font-medium">
                AI Processing Image...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showOverlay && (
        <div className="p-4 border-t border-border bg-muted/30">
          <div className="flex flex-wrap gap-4">
            {boundingBoxes.map((box) => (
              <button
                key={box.id}
                onClick={() => onBoxClick?.(box)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all",
                  selectedBoxId === box.id
                    ? "bg-secondary"
                    : "hover:bg-secondary/50"
                )}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: box.color }}
                />
                <span className="text-sm text-foreground">{box.label}</span>
                <span className="text-xs text-muted-foreground">
                  {box.damageType}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
