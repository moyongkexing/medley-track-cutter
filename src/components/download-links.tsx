import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download } from "lucide-react";
import { Track, createTrackFilename } from "@/lib/audio-processing";
import { formatTime } from "@/lib/utils";

interface DownloadLinksProps {
  tracks: Track[];
  trackUrls: string[];
  originalFilename: string;
  onDownloadAll: () => void;
}

export function DownloadLinks({ 
  tracks, 
  trackUrls, 
  originalFilename,
  onDownloadAll 
}: DownloadLinksProps) {
  if (trackUrls.length === 0) return null;

  const selectedTracks = tracks.filter(track => track.selected);
  
  // 編集中のファイル名を管理する状態
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedFilenames, setEditedFilenames] = useState<{[key: number]: string}>({});
  
  // ファイル名編集開始処理
  const startEditing = (index: number, defaultName: string) => {
    setEditingIndex(index);
    if (!editedFilenames[index]) {
      setEditedFilenames(prev => ({
        ...prev,
        [index]: defaultName
      }));
    }
  };

  // ファイル名変更処理
  const handleFilenameChange = (index: number, value: string) => {
    setEditedFilenames(prev => ({
      ...prev,
      [index]: value
    }));
  };

  // 編集完了処理
  const finishEditing = () => {
    // 空の文字列の場合はデフォルト名を使用
    if (editingIndex !== null && (!editedFilenames[editingIndex] || editedFilenames[editingIndex].trim() === "")) {
      // 元のファイル名を復元
      const track = selectedTracks[editingIndex];
      const originalName = createTrackFilename(track, originalFilename);
      
      setEditedFilenames(prev => ({
        ...prev,
        [editingIndex]: originalName
      }));
    }
    
    setEditingIndex(null);
  };
  
  return (
    <div className="border rounded-md p-4 my-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">ダウンロード</h2>
        <Button 
          onClick={onDownloadAll} 
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          <Download className="h-5 w-5" />
          全てダウンロード (ZIP)
        </Button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {trackUrls.map((url, index) => {
          const track = selectedTracks[index];
          const filename = createTrackFilename(track, originalFilename);
          const duration = track.endTime - track.startTime;
          
          return (
            <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
              <div className="flex-1">
                {editingIndex === index ? (
                  <Input
                    value={editedFilenames[index] || ""}
                    placeholder={filename}
                    onChange={(e) => handleFilenameChange(index, e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                    autoFocus
                    className="font-medium w-full"
                  />
                ) : (
                  <div 
                    className="font-medium cursor-pointer hover:text-primary hover:border hover:border-gray-300 hover:rounded" 
                    onClick={() => startEditing(index, filename)}
                    title="クリックしてファイル名を編集"
                  >
                    {editedFilenames[index] || filename}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  トラック {track.id + 1} • {formatTime(duration)}
                </div>
              </div>
              <a
                href={url}
                download={editedFilenames[index] || filename}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                ダウンロード
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}