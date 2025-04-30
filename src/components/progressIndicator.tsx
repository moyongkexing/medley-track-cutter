import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import React from "react";

interface ProgressIndicatorProps {
  progress: number;
  message: string;
  isVisible: boolean;
}

export function ProgressIndicator({ progress, message, isVisible }: ProgressIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="my-6 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <h3 className="text-base font-medium text-blue-700">{message}</h3>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-600">処理中...</span>
        <span className="text-sm font-medium text-blue-600">
          {Math.min(100, Math.floor(progress))}%
        </span>
      </div>

      <Progress value={Math.max(0, Math.min(100, progress))} className="h-2.5 bg-blue-100" />

      <p className="mt-3 text-xs text-blue-600 text-center">
        処理には時間がかかる場合があります。しばらくお待ちください。
      </p>
    </div>
  );
}
