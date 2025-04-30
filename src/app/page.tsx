"use client";

import { AudioUploader } from "@/components/audioUploader";
import { DownloadLinks } from "@/components/downloadLinks";
import { ExtractionControls } from "@/components/extractionControls";
import { ProgressIndicator } from "@/components/progressIndicator";
import { TrackList } from "@/components/trackList";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useFFmpeg } from "@/hooks/useFFmpeg";
import { useAudioFile } from "@/hooks/useAudioFile";
import { useTrackDetection } from "@/hooks/useTrackDetection";
import { useTrackPreview } from "@/hooks/useTrackPreview";
import { useTrackExtraction } from "@/hooks/useTrackExtraction";
import { useTrackDownload } from "@/hooks/useTrackDownload";

export default function Home() {
  // FFmpeg関連のフック
  const { ffmpeg  } = useFFmpeg();
  
  // オーディオファイル関連のフック
  const {
    audioFile,
    trackUrls,
    setTrackUrls,
    previewUrls,
    setPreviewUrls,
    handleFileSelected,
    cleanup
  } = useAudioFile();
  
  // トラック検出関連のフック
  const {
    isProcessing,
    setIsProcessing,
    progress,
    setProgress,
    progressMessage,
    setProgressMessage,
    tracks,
    setTracks,
    handleDetectTracks,
    handleTrackToggle
  } = useTrackDetection();
  
  // プレビュー再生関連のフック
  const { 
    playingTrackId,
    loadingTrackId,
    handlePreviewTrack
  } = useTrackPreview();
  
  // トラック抽出関連のフック
  const { handleExtractSelected } = useTrackExtraction(
    isProcessing,
    setIsProcessing,
    setProgress,
    setProgressMessage,
    setTrackUrls
  );
  
  // ダウンロード関連のフック
  const { handleDownloadAll } = useTrackDownload();

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // トラック検出を行うラッパー関数
  const onDetectTracks = async (options) => {
    await handleDetectTracks(ffmpeg, audioFile, options);
  };

  // トラック抽出を行うラッパー関数
  const onExtractSelected = async () => {
    await handleExtractSelected(ffmpeg, audioFile, tracks, trackUrls);
  };

  // プレビュー再生を行うラッパー関数
  const onPreviewTrack = async (trackId) => {
    return await handlePreviewTrack(
      trackId,
      ffmpeg,
      audioFile,
      tracks,
      previewUrls,
      setPreviewUrls
    );
  };

  // ダウンロードを行うラッパー関数
  const onDownloadAll = () => {
    handleDownloadAll(audioFile, tracks, trackUrls);
  };

  return (
    <main className="container max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">MedleyTrackCutter</h1>
        <p className="text-gray-600">音楽メドレーを曲ごとに自動分割してダウンロードできるツール</p>
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
              onDetectTracks={onDetectTracks}
              isProcessing={isProcessing}
              hasAudioFile={audioFile !== null}
            />
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">3. 曲の分割結果</h2>
            {tracks.length > 0 ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="mb-1 text-green-600 font-medium">{tracks.length}曲に分割されました</p>
                <p className="text-sm text-gray-600">下のリストから曲を選択して分割してください</p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500">まだ曲が分割されていません</p>
              </div>
            )}
          </div>
        </div>

        <ProgressIndicator progress={progress} message={progressMessage} isVisible={isProcessing} />

        {tracks.length > 0 && (
          <>
            <TrackList
              tracks={tracks}
              onTrackToggle={handleTrackToggle}
              ffmpeg={ffmpeg}
              audioFile={audioFile}
              onPreviewPlay={onPreviewTrack}
              playingTrackId={playingTrackId}
              loadingTrackId={loadingTrackId}
            />

            {/* 「選択した曲を抽出」ボタンをリストの下に配置 */}
            <div className="mt-4">
              <Button
                onClick={onExtractSelected}
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
            onDownloadAll={onDownloadAll}
          />
        )}
      </>
    </main>
  );
}
