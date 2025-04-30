'use client'

import { useState, useEffect, useCallback } from "react";
import { AudioUploader } from "@/components/audio-uploader";
import { ExtractionControls } from "@/components/extraction-controls";
import { TrackList } from "@/components/track-list";
import { ProgressIndicator } from "@/components/progress-indicator";
import { DownloadLinks } from "@/components/download-links";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  createFFmpeg,
  detectTracks,
  extractTracks,
  downloadTracksAsZip,
  createTrackPreview,
  clearPreviewCache,
  type Track,
  type TrackDetectionOptions,
} from "@/lib/audio-processing";

export default function Home() {
  const [ffmpeg, setFFmpeg] = useState<any>(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [trackUrls, setTrackUrls] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<Map<number, string>>(new Map());
  
  const { toast } = useToast();

  // FFmpeg をロードする
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpegInstance = await createFFmpeg();
        setFFmpeg(ffmpegInstance);
        setIsFFmpegLoaded(true);
        // 初期化完了のトースト表示を削除
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

    // Cleanup URLs on unmount
    return () => {
      // 抽出ファイルのURLをクリーンアップ
      trackUrls.forEach(url => URL.revokeObjectURL(url));
      
      // プレビューURLもクリーンアップ
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // プレビューキャッシュもクリア
      clearPreviewCache();
    };
  }, [trackUrls, previewUrls, toast]);

  const handleFileSelected = useCallback((file: File) => {
    // Cleanup previous URLs
    trackUrls.forEach(url => URL.revokeObjectURL(url));
    
    // プレビューURLもクリーンアップ
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls(new Map());
    
    // プレビューキャッシュをクリア
    clearPreviewCache();
    
    setAudioFile(file);
    setTracks([]);
    setTrackUrls([]);
    setProgress(0);
    setProgressMessage("");
    
    toast({
      title: "ファイルを選択しました",
      description: file.name,
    });
  }, [trackUrls, previewUrls]);
  
  // トラックのプレビュー再生処理
  const handlePreviewTrack = useCallback(async (trackId: number): Promise<string | undefined> => {
    if (!ffmpeg || !audioFile || !tracks.length) return undefined;
    
    try {
      // 対象のトラックを見つける
      const track = tracks.find(t => t.id === trackId);
      if (!track) return undefined;
      
      // すでにプレビューURLがあるか確認
      if (previewUrls.has(trackId)) {
        try {
          // キャッシュされているURLを返す
          const url = previewUrls.get(trackId);
          console.log(`Using cached preview URL for track ${trackId}`);
          
          // 有効性チェックは省略 (Blobベースのオブジェクトなので通常は有効)
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
      
      // 生成したURLを返す
      return previewUrl;
    } catch (error) {
      console.error('プレビュー作成エラー:', error);
      toast({
        title: "エラー",
        description: "プレビューの作成中にエラーが発生しました",
        variant: "destructive",
      });
      return undefined;
    }
  }, [ffmpeg, audioFile, tracks, previewUrls, toast]);

  const handleDetectTracks = useCallback(async (options: TrackDetectionOptions) => {
    if (!ffmpeg || !audioFile) return;

    setIsProcessing(true);
    setProgressMessage("曲を分割中...");
    setProgress(0);
    
    try {
      const detectedTracks = await detectTracks(
        ffmpeg,
        audioFile,
        options,
        (progress) => {
          if (progress !== undefined) {
            // 進捗状態をパーセント表示に変換 (0-100%)
            const progressPercent = Math.max(0, Math.min(100, progress * 100));
            setProgress(progressPercent);
          }
        }
      );
      
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
  }, [ffmpeg, audioFile, toast]);

  const handleTrackToggle = useCallback((trackId: number, selected: boolean) => {
    setTracks(prevTracks => 
      prevTracks.map(track => 
        track.id === trackId ? { ...track, selected } : track
      )
    );
  }, []);



  const handleExtractSelected = useCallback(async () => {
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
      // Cleanup previous URLs
      trackUrls.forEach(url => URL.revokeObjectURL(url));
      
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
        }
      );
      
      // Create URLs for the extracted tracks
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
  }, [ffmpeg, audioFile, tracks, trackUrls, toast]);

  const handleDownloadAll = useCallback(() => {
    if (!audioFile || trackUrls.length === 0) return;
    
    // Create a blob for each URL
    const selectedTracks = tracks.filter(track => track.selected);
    const blobs = trackUrls.map(url => {
      const response = fetch(url)
        .then(res => res.blob())
        .catch(err => {
          console.error("Failed to fetch blob:", err);
          return new Blob();
        });
      return response;
    });
    
    // When all blobs are ready
    Promise.all(blobs).then(blobResults => {
      downloadTracksAsZip(selectedTracks, blobResults, audioFile.name);
      
      toast({
        title: "ダウンロード開始",
        description: "ZIPファイルのダウンロードが開始されました",
      });
    });
  }, [audioFile, tracks, trackUrls, toast]);

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">MedleyTrackCutter</h1>
        <p className="text-gray-600">
          音楽メドレーを曲ごとに自動分割してダウンロードできるツール
        </p>
      </div>


        <>
          <div className="grid grid-cols-1 gap-6 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-xl font-bold mb-4">1. オーディオファイルをアップロード</h2>
              <div>
                <AudioUploader onFileSelected={handleFileSelected} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <h2 className="text-xl font-bold mb-4">2. 設定と分割</h2>
              <ExtractionControls
                onDetectTracks={handleDetectTracks}
                isProcessing={isProcessing}
                hasAudioFile={audioFile !== null}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4">3. 曲の分割結果</h2>
              {tracks.length > 0 ? (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="mb-1 text-green-600 font-medium">
                    {tracks.length}曲に分割されました
                  </p>
                  <p className="text-sm text-gray-600">
                    下のリストから曲を選択して分割してください
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">
                    まだ曲が分割されていません
                  </p>
                </div>
              )}
            </div>
          </div>

          <ProgressIndicator
            progress={progress}
            message={progressMessage}
            isVisible={isProcessing}
          />

          {tracks.length > 0 && (
            <>
              <TrackList
                tracks={tracks}
                onTrackToggle={handleTrackToggle}
                ffmpeg={ffmpeg}
                audioFile={audioFile}
                onPreviewPlay={handlePreviewTrack}
              />
              
              {/* 「選択した曲を抽出」ボタンをリストの下に配置 */}
              <div className="mt-4">
                <Button
                  onClick={handleExtractSelected}
                  disabled={isProcessing || !tracks.some(track => track.selected)}
                  variant="default"
                  className="w-full"
                >
                  {isProcessing ? "処理中..." : "選択した曲を抽出"}
                </Button>
              </div>
            </>
          )}

          {trackUrls.length > 0 && audioFile && (
            <DownloadLinks
              tracks={tracks.filter(track => track.selected)}
              trackUrls={trackUrls}
              originalFilename={audioFile.name}
              onDownloadAll={handleDownloadAll}
            />
          )}
        </>
    </main>
  );
}