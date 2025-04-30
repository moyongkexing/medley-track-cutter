import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import {
  type Track,
  type TrackDetectionOptions,
  detectTracks,
} from '@/lib/audioProcessing';

/**
 * トラック検出と関連状態管理を行うカスタムフック
 */
export function useTrackDetection() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const { toast } = useToast();

  // トラック検出の処理
  const handleDetectTracks = useCallback(
    async (ffmpeg: any, audioFile: File | null, options: TrackDetectionOptions) => {
      if (!ffmpeg || !audioFile) return;

      setIsProcessing(true);
      setProgressMessage("曲を分割中...");
      setProgress(0);

      try {
        const detectedTracks = await detectTracks(ffmpeg, audioFile, options, progress => {
          if (progress !== undefined) {
            // 進捗状態をパーセント表示に変換 (0-100%)
            const progressPercent = Math.max(0, Math.min(100, progress * 100));
            setProgress(progressPercent);
          }
        });

        setTracks(detectedTracks);
        toast({
          title: "曲の分割が完了しました",
          description: `${detectedTracks.length}曲に分割されました`,
        });
      } catch (error) {
        console.error("Track detection error:", error);
        toast({
          title: "エラー",
          description: "曲の分割中にエラーが発生しました",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  // トラックの選択/非選択を切り替える処理
  const handleTrackToggle = useCallback((trackId: number, selected: boolean) => {
    setTracks(prevTracks =>
      prevTracks.map(track => (track.id === trackId ? { ...track, selected } : track)),
    );
  }, []);

  return {
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    progressMessage,
    setProgressMessage,
    tracks,
    setTracks,
    handleDetectTracks,
    handleTrackToggle,
  };
}
