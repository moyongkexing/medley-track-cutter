import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Track } from "@/lib/audioProcessing";
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
  playingTrackId?: number | null;
  loadingTrackId?: number | null;
}

export function TrackList({
  tracks,
  onTrackToggle,
  onPreviewPlay,
  audioFile,
  ffmpeg,
  playingTrackId: externalPlayingTrackId,
  loadingTrackId: externalLoadingTrackId,
}: TrackListProps) {
  // 全選ボタンの状態を管理する状態変数
  const [allSelected, setAllSelected] = useState(false);
  // 音声再生のためのaudio要素への参照
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 内部状態または外部から提供される状態を使用
  const playingTrackId = externalPlayingTrackId !== undefined ? externalPlayingTrackId : null;
  const loadingTrackId = externalLoadingTrackId !== undefined ? externalLoadingTrackId : null;

  // 全選/全解除の処理
  const handleSelectAll = () => {
    const newSelectedState = !allSelected;
    setAllSelected(newSelectedState);

    // 全てのトラックに対して選択状態を適用
    for (const track of tracks) {
      onTrackToggle(track.id, newSelectedState);
    }
  };

  // プレビュー再生用の処理
  const handlePreviewToggle = async (trackId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // イベントの伝播を停止

    if (!audioFile || !ffmpeg || !onPreviewPlay) {
      console.warn("オーディオファイルまたはFFmpegが利用できません");
      return;
    }

    // プレビュー再生ハンドラを呼び出す
    await onPreviewPlay(trackId);
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
