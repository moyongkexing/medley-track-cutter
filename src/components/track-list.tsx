import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Track } from "@/lib/audio-processing";
import { formatTime } from "@/lib/utils";
import { Loader2, Pause, Play } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";

interface TrackListProps {
  tracks: Track[];
  onTrackToggle: (trackId: number, selected: boolean) => void;
  onPreviewPlay?: (trackId: number) => Promise<string | undefined>;
  audioFile?: File | null;
  ffmpeg?: any;
}

export function TrackList({
  tracks,
  onTrackToggle,
  onPreviewPlay,
  audioFile,
  ffmpeg,
}: TrackListProps) {
  // 全選ボタンの状態を管理する状態変数
  const [allSelected, setAllSelected] = useState(false);
  // 現在再生中のトラックIDを管理
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);
  // 現在ロード中のトラックIDを管理
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null);
  // 音声再生のためのaudio要素への参照
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 全選/全解除の処理
  const handleSelectAll = () => {
    const newSelectedState = !allSelected;
    setAllSelected(newSelectedState);

    // 全てのトラックに対して選択状態を適用
    tracks.forEach(track => {
      onTrackToggle(track.id, newSelectedState);
    });
  };

  // プレビュー再生用の処理
  const handlePreviewToggle = async (trackId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // イベントの伝播を停止

    if (!audioFile || !ffmpeg) {
      console.warn("オーディオファイルまたはFFmpegが利用できません");
      return;
    }

    // 現在再生中のトラックがクリックされた場合は停止
    if (playingTrackId === trackId) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingTrackId(null);
      return;
    }

    // 既に他のトラックが再生中の場合は停止
    if (playingTrackId !== null && audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
    }

    try {
      // ロード中状態をセット
      setLoadingTrackId(trackId);

      if (onPreviewPlay) {
        // トラックのプレビューURLを取得
        const url = await onPreviewPlay(trackId);

        // URLが取得できた場合のみ処理
        if (url) {
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
          audio.play().catch(err => {
            console.error("再生エラー:", err);
            setLoadingTrackId(null);
          });
        } else {
          setLoadingTrackId(null);
        }
      } else {
        setLoadingTrackId(null);
      }
    } catch (error) {
      console.error(`プレビュー再生エラー:`, error);
      setPlayingTrackId(null);
      setLoadingTrackId(null);
    }
  };
  return (
    <div className="border rounded-md p-4 my-4">
      <h2 className="text-xl font-bold mb-4">分割された曲 ({tracks.length})</h2>

      <div className="flex items-center border-b pb-2 mb-2 font-semibold">
        <div className="w-16 text-center">
          <Button variant="outline" size="sm" onClick={handleSelectAll} className="text-xs">
            {allSelected ? "全解除" : "全選択"}
          </Button>
        </div>
        <div className="w-10 text-center">番号</div>
        <div className="w-1/4">開始</div>
        <div className="w-1/4">終了</div>
        <div className="w-1/4">長さ</div>
        <div className="w-8 text-center">再生</div>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {tracks.map(track => {
          const duration = track.endTime - track.startTime;

          return (
            <div
              key={track.id}
              className="flex items-center py-2 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => onTrackToggle(track.id, !track.selected)}
            >
              <div className="w-12 text-center" onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={track.selected}
                  onCheckedChange={checked => onTrackToggle(track.id, checked === true)}
                />
              </div>
              <div className="w-10 text-center">{track.id + 1}</div>
              <div className="w-1/4">{formatTime(track.startTime)}</div>
              <div className="w-1/4">{formatTime(track.endTime)}</div>
              <div className="w-1/4">{formatTime(duration)}</div>
              <div className="w-8 text-center" onClick={e => e.stopPropagation()}>
                <Button
                  variant={playingTrackId === track.id ? "default" : "outline"}
                  size="sm"
                  onClick={e => audioFile && ffmpeg && handlePreviewToggle(track.id, e)}
                  disabled={!audioFile || !ffmpeg}
                  className={`p-1 h-8 w-8 rounded-full flex items-center justify-center ${playingTrackId === track.id ? "bg-blue-500 hover:bg-blue-600" : ""}`}
                >
                  {loadingTrackId === track.id ? (
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                  ) : playingTrackId === track.id ? (
                    <Pause size={14} className="text-white" />
                  ) : (
                    <Play size={14} className="text-blue-500 ml-0.5" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
