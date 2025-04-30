import { useState, useEffect } from 'react';
import { createFFmpeg } from '@/lib/audioProcessing';
import { useToast } from '@/components/ui/useToast';

/**
 * FFmpegインスタンスの初期化と管理を行うカスタムフック
 */
export function useFFmpeg() {
  const [ffmpeg, setFFmpeg] = useState<any>(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpegInstance = await createFFmpeg();
        setFFmpeg(ffmpegInstance);
        setIsFFmpegLoaded(true);
      } catch (error) {
        console.error("FFmpeg failed to load:", error);
        toast({
          title: "エラー",
          description: "処理エンジンの読み込みに失敗しました",
          variant: "destructive",
        });
      }
    };

    loadFFmpeg();
  }, [toast]);

  return { ffmpeg, isFFmpegLoaded };
}
