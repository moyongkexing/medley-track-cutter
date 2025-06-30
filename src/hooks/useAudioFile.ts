import { useState, useCallback } from 'react';
import { useToast } from '@/components/ui/useToast';
import { clearPreviewCache } from '@/lib/audioProcessing';

/**
 * オーディオファイルの管理と関連リソースのクリーンアップを行うカスタムフック
 */
export function useAudioFile() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [trackUrls, setTrackUrls] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());
  const { toast } = useToast();

  // オーディオファイル選択時の処理
  const handleFileSelected = useCallback(
    (file: File) => {
      // 既存のURLをクリーンアップ
      for (const url of trackUrls) {
        URL.revokeObjectURL(url);
      }
      
      for (const url of Array.from(previewUrls.values())) {
        URL.revokeObjectURL(url);
      }
      
      // プレビューキャッシュをクリア
      clearPreviewCache();
      
      // 状態を更新
      setAudioFile(file);
      setTrackUrls([]);
      setPreviewUrls(new Map());
      
      toast({
        title: "ファイルを選択しました",
        description: file.name,
      });
    },
    [trackUrls, previewUrls, toast],
  );

  // コンポーネントのアンマウント時にURLをクリーンアップ
  const cleanup = useCallback(() => {
    for (const url of trackUrls) {
      URL.revokeObjectURL(url);
    }
    
    for (const url of Array.from(previewUrls.values())) {
      URL.revokeObjectURL(url);
    }
    
    clearPreviewCache();
  }, [trackUrls, previewUrls]);

  return {
    audioFile,
    setAudioFile,
    trackUrls,
    setTrackUrls,
    previewUrls,
    setPreviewUrls,
    handleFileSelected,
    cleanup,
  };
}
