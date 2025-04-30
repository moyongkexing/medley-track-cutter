import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/useToast';
import { type Track, createTrackPreview } from '@/lib/audioProcessing';

/**
 * トラックのプレビュー再生を管理するカスタムフック
 */
export function useTrackPreview() {
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // プレビュー再生処理
  const handlePreviewTrack = useCallback(
    async (trackId: number, ffmpeg: any, audioFile: File | null, tracks: Track[], previewUrls: Map<number, string>, setPreviewUrls: React.Dispatch<React.SetStateAction<Map<number, string>>>) => {
      if (!ffmpeg || !audioFile || !tracks.length) return undefined;

      try {
        // 現在再生中のトラックがクリックされた場合は停止
        if (playingTrackId === trackId) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          setPlayingTrackId(null);
          return undefined;
        }

        // 既に他のトラックが再生中の場合は停止
        if (playingTrackId !== null && audioRef.current) {
          audioRef.current.pause();
          setPlayingTrackId(null);
        }

        // 対象のトラックを見つける
        const track = tracks.find(t => t.id === trackId);
        if (!track) return undefined;

        // ロード中状態をセット
        setLoadingTrackId(trackId);

        // すでにプレビューURLがあるか確認
        if (previewUrls.has(trackId)) {
          try {
            // キャッシュされているURLを返す
            const url = previewUrls.get(trackId);
            console.log(`Using cached preview URL for track ${trackId}`);

            // オーディオを準備して再生
            await playAudio(url as string, trackId);
            return url;
          } catch (e) {
            console.warn(`Error with cached URL for track ${trackId}:`, e);
            // キャッシュから削除してリトライ
            const url = previewUrls.get(trackId);
            if (url) URL.revokeObjectURL(url);
            setPreviewUrls(prev => {
              const newMap = new Map(prev);
              newMap.delete(trackId);
              return newMap;
            });
          }
        }

        // プレビュー用の音声を生成
        const previewBlob = await createTrackPreview(ffmpeg, audioFile, track, 10);

        // BlobからURLを作成
        const previewUrl = URL.createObjectURL(previewBlob);

        // URLを保存
        setPreviewUrls(prev => {
          const newMap = new Map(prev);
          newMap.set(trackId, previewUrl);
          return newMap;
        });

        // オーディオを準備して再生
        await playAudio(previewUrl, trackId);

        // 生成したURLを返す
        return previewUrl;
      } catch (error) {
        console.error("プレビュー作成エラー:", error);
        setLoadingTrackId(null);
        toast({
          title: "エラー",
          description: "プレビューの作成中にエラーが発生しました",
          variant: "destructive",
        });
        return undefined;
      }
    },
    [playingTrackId, toast],
  );

  // 音声を再生する内部ヘルパー関数
  const playAudio = async (url: string, trackId: number) => {
    // audio要素を作成
    const audio = new Audio();

    // ロード完了時の処理
    audio.oncanplaythrough = () => {
      setLoadingTrackId(null);
      setPlayingTrackId(trackId);
    };

    // 再生終了時の処理
    audio.onended = () => {
      setPlayingTrackId(null);
    };

    // エラー発生時の処理
    audio.onerror = () => {
      setLoadingTrackId(null);
      console.error("音声のロード中にエラーが発生しました");
    };

    // ソースを設定
    audio.src = url;

    // 参照を保存
    audioRef.current = audio;

    // 再生開始
    await audio.play().catch(err => {
      console.error("再生エラー:", err);
      setLoadingTrackId(null);
    });
  };

  return {
    playingTrackId,
    loadingTrackId,
    audioRef,
    handlePreviewTrack,
  };
}
