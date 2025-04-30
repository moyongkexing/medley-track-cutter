import { useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import { downloadTracksAsZip, type Track } from '@/lib/audioProcessing';

/**
 * トラックのダウンロード機能を管理するカスタムフック
 */
export function useTrackDownload() {
  const { toast } = useToast();

  /**
   * 選択されたトラックを一括ダウンロードする処理
   */
  const handleDownloadAll = useCallback(
    async (audioFile: File | null, tracks: Track[], trackUrls: string[]) => {
      if (!audioFile || trackUrls.length === 0) return;

      // 選択されたトラックを取得
      const selectedTracks = tracks.filter(track => track.selected);
      
      // 各URLに対応するBlobを取得
      const blobs = trackUrls.map(url => {
        return fetch(url)
          .then(res => res.blob())
          .catch(err => {
            console.error("Failed to fetch blob:", err);
            return new Blob();
          });
      });

      // すべてのBlobが準備できたらZIPファイルを作成
      Promise.all(blobs).then(blobResults => {
        downloadTracksAsZip(selectedTracks, blobResults, audioFile.name);

        toast({
          title: "ダウンロード開始",
          description: "ZIPファイルのダウンロードが開始されました",
        });
      });
    },
    [toast],
  );

  return { handleDownloadAll };
}
