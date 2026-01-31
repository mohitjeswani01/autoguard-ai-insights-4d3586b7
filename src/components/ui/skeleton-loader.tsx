import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "card" | "image" | "circular" | "bar";
  lines?: number;
}

export function SkeletonLoader({
  className,
  variant = "text",
  lines = 1,
}: SkeletonLoaderProps) {
  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 rounded skeleton-shimmer",
              i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
            )}
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "rounded-lg bg-muted p-4 space-y-4 skeleton-shimmer",
          className
        )}
      >
        <div className="h-4 w-3/4 rounded bg-muted-foreground/10" />
        <div className="h-4 w-1/2 rounded bg-muted-foreground/10" />
        <div className="h-20 rounded bg-muted-foreground/10" />
      </div>
    );
  }

  if (variant === "image") {
    return (
      <div
        className={cn(
          "aspect-video rounded-lg skeleton-shimmer",
          className
        )}
      />
    );
  }

  if (variant === "circular") {
    return (
      <div
        className={cn(
          "w-12 h-12 rounded-full skeleton-shimmer",
          className
        )}
      />
    );
  }

  if (variant === "bar") {
    return (
      <div
        className={cn(
          "h-2 w-full rounded-full skeleton-shimmer",
          className
        )}
      />
    );
  }

  return null;
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonLoader variant="text" className="w-48" />
        <div className="flex gap-3">
          <SkeletonLoader className="h-10 w-32 rounded-lg" />
          <SkeletonLoader className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Viewer Skeleton */}
        <div className="space-y-4">
          <SkeletonLoader variant="image" className="h-[400px]" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonLoader key={i} className="h-16 w-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Analysis Panel Skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" className="h-32" />
          ))}
          <div className="flex gap-4">
            <SkeletonLoader className="h-12 flex-1 rounded-lg" />
            <SkeletonLoader className="h-12 flex-1 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonLoader key={i} className="h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-6 gap-4 p-4 rounded-lg bg-card"
        >
          {Array.from({ length: 6 }).map((_, j) => (
            <SkeletonLoader key={j} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function AnalysisProcessingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-6">
      {/* Pulsing AI Icon */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-emerald-500/20 animate-pulse flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/40 animate-pulse" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-emerald-500/50 animate-ping" />
      </div>

      {/* Processing Text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">
          AI Analysis in Progress
        </p>
        <p className="text-sm text-muted-foreground">
          Detecting damage and calculating estimates...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 skeleton-shimmer" />
      </div>
    </div>
  );
}
