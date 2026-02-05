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

export function ImageViewer({
  imageUrl = demoCarImage,
  boundingBoxes = [],
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

  // Validate image URL
  const isValidImageUrl = (url: string) => {
    try {
      return url && (url.startsWith("http") || url.startsWith("data") || url.startsWith("/"));
    } catch {
      return false;
    }
  };

  const displayImage = isValidImageUrl(imageUrl)
    ? (imageUrl.startsWith("/")
      ? (imageUrl.startsWith("/api/v1")
        ? `http://localhost:8000${imageUrl}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${imageUrl}`)
      : imageUrl)
    : demoCarImage;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <div className="text-sm text-muted-foreground font-medium">
            {Math.round(zoom * 100)}%
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            title="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showOverlay ? "default" : "ghost"}
            size="icon"
            onClick={() => setShowOverlay(!showOverlay)}
            title="Toggle damage boxes"
          >
            <Layers className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Download image"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-auto bg-black/50 relative">
        <div className="flex items-center justify-center min-h-full p-4">
          <div
            style={{ transform: `scale(${zoom})` }}
            className="relative origin-center transition-transform duration-200"
          >
            <img
              src={displayImage}
              alt="Vehicle damage"
              className="max-w-full max-h-[600px] rounded-lg shadow-lg"
              onError={(e) => {
                console.error("Image load error:", e);
                (e.target as HTMLImageElement).src = demoCarImage;
              }}
            />

            {/* Bounding Boxes Overlay */}
            {showOverlay &&
              boundingBoxes &&
              boundingBoxes.length > 0 &&
              boundingBoxes.map((box) => {
                const isSelected = selectedBoxId === box.id;
                const isHovered = hoveredBox === box.id;

                return (
                  <motion.div
                    key={box.id}
                    onClick={() => onBoxClick?.(box)}
                    onHoverStart={() => setHoveredBox(box.id)}
                    onHoverEnd={() => setHoveredBox(null)}
                    className="absolute cursor-pointer transition-all duration-200"
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                      opacity: isSelected || isHovered ? 1 : 0.7,
                    }}
                  >
                    <div
                      className={cn(
                        "w-full h-full border-2 rounded transition-all duration-200",
                        isSelected ? "border-solid" : "border-dashed"
                      )}
                      style={{
                        borderColor: box.color,
                        backgroundColor: `${box.color}10`,
                      }}
                    />

                    {/* Label */}
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: isSelected || isHovered ? 1 : 0, y: isSelected || isHovered ? 0 : -10 }}
                      className="absolute -top-8 left-0 px-2 py-1 rounded text-xs font-semibold text-white whitespace-nowrap"
                      style={{ backgroundColor: box.color }}
                    >
                      {box.label} ({Math.round(box.confidence)}%)
                    </motion.div>
                  </motion.div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Info Footer */}
      {selectedBoxId && boundingBoxes?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t border-border bg-muted/50 text-sm"
        >
          {(() => {
            const box = boundingBoxes.find((b) => b.id === selectedBoxId);
            return box ? (
              <div>
                <p className="font-semibold text-foreground">
                  {box.label} - {box.damageType}
                </p>
                <p className="text-muted-foreground">
                  Confidence: {Math.round(box.confidence)}%
                </p>
              </div>
            ) : null;
          })()}
        </motion.div>
      )}
    </div>
  );
}
