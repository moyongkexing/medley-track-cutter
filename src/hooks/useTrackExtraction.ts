import { useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import { extractTracks, type Track } from '@/lib/audioProcessing';

/**
 * トラックの抽出処理を管理するカスタムフック
 */
export function useTrackExtraction(
  isProcessing: boolean,
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>,
  setProgress: React.Dispatch<React.SetStateAction<number>>,
  setProgressMessage: React.Dispatch<React.SetStateAction<string>>,
  setTrackUrls: React.Dispatch<React.SetStateAction<string[]>>
) {
  const { toast } = useToast();

  /**
   * 選択されたトラックを抽出する処理
   */
  const handleExtractSelected = useCallback(
    async (ffmpeg: any, audioFile: File | null, tracks: Track[], trackUrls: string[]) => {
      if (!ffmpeg || !audioFile || tracks.length === 0) return;

      const selectedTracks = tracks.filter(track => track.selected);
      if (selectedTracks.length === 0) {
        toast({
          title: "エラー",
          description: "抽出する曲が選択されていません",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);
      setProgressMessage("曲を抽出中...");
      setProgress(0);

      try {
        // 既存のURLをクリーンアップ
        for (const url of trackUrls) {
          URL.revokeObjectURL(url);
        }

        const extractedBlobs = await extractTracks(
          ffmpeg,
          audioFile,
          tracks,
          (progress, current, total) => {
            // 進捗状態を正確に更新する
            if (progress !== undefined) {
              // 進捗状態をパーセント表示に変換 (0-100%)
              const progressPercent = Math.max(0, Math.min(100, progress * 100));
              setProgress(progressPercent);
            }

            // ステータスメッセージを更新
            if (current !== undefined && total !== undefined) {
              setProgressMessage(`曲を抽出中... (${current}/${total})`);
            }
          },
        );

        // 抽出したトラックのBlobからURLを作成
        const urls = extractedBlobs.map(blob => URL.createObjectURL(blob));
        setTrackUrls(urls);

        toast({
          title: "抽出が完了しました",
          description: `${urls.length}曲の抽出が完了しました`,
        });
      } catch (error) {
        console.error("Track extraction error:", error);
        toast({
          title: "エラー",
          description: "曲の抽出中にエラーが発生しました",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [setIsProcessing, setProgress, setProgressMessage, setTrackUrls, toast],
  );

  return { handleExtractSelected };
}
