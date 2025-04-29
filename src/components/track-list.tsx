
import React, { useState } from "react";
import type { Track } from "@/lib/audio-processing";
import { formatTime } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface TrackListProps {
  tracks: Track[];
  onTrackToggle: (trackId: number, selected: boolean) => void;
}

export function TrackList({ tracks, onTrackToggle }: TrackListProps) {
  // 全選ボタンの状態を管理する状態変数
  const [allSelected, setAllSelected] = useState(false);
  
  // 全選/全解除の処理
  const handleSelectAll = () => {
    const newSelectedState = !allSelected;
    setAllSelected(newSelectedState);
    
    // 全てのトラックに対して選択状態を適用
    tracks.forEach(track => {
      onTrackToggle(track.id, newSelectedState);
    });
  };
  return (
    <div className="border rounded-md p-4 my-4">
      <h2 className="text-xl font-bold mb-4">分割された曲 ({tracks.length})</h2>
      
      <div className="flex items-center justify-between border-b pb-2 mb-2 font-semibold">
        <div className="w-20 text-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSelectAll} 
          className="text-xs"
        >
          {allSelected ? "全解除" : "全選択"}
        </Button>
      </div>
        <div className="w-12 text-center">番号</div>
        <div className="flex-1">開始</div>
        <div className="flex-1">終了</div>
        <div className="flex-1">長さ</div>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {tracks.map((track) => {
          const duration = track.endTime - track.startTime;
          
          return (
            <div 
              key={track.id} 
              className="flex items-center justify-between py-2 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => onTrackToggle(track.id, !track.selected)}
            >
              <div className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={track.selected}
                  onCheckedChange={(checked) => 
                    onTrackToggle(track.id, checked === true)
                  }
                />
              </div>
              <div className="w-12 text-center">{track.id + 1}</div>
              <div className="flex-1">{formatTime(track.startTime)}</div>
              <div className="flex-1">{formatTime(track.endTime)}</div>
              <div className="flex-1">{formatTime(duration)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}