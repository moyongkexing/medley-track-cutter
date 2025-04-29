import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress: number;
  message: string;
  isVisible: boolean;
}

export function ProgressIndicator({
  progress,
  message,
  isVisible,
}: ProgressIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="my-4 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{message}</span>
        <span className="text-sm font-medium">{Math.min(100, Math.floor(progress))}%</span>
      </div>
      <Progress value={Math.max(0, Math.min(100, progress))} className="h-2" />
    </div>
  );
}