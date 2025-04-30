import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";

interface AudioUploaderProps {
  onFileSelected: (file: File) => void;
  accept?: string;
}

export function AudioUploader({
  onFileSelected,
  accept = "audio/mp3,audio/wav",
}: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      onFileSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // Check if file type is acceptable
      if (accept.includes(file.type)) {
        setFileName(file.name);
        onFileSelected(file);
      }
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-md p-6 text-center ${
        isDragging ? "border-primary bg-primary/5" : "border-gray-300"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        <Upload className="h-10 w-10 text-gray-400" />

        <div className="text-lg font-medium">
          {fileName ? (
            <span className="text-primary">{fileName}</span>
          ) : (
            <>
              <span>ファイルをドラッグ＆ドロップするか、</span>
              <Button variant="link" onClick={handleButtonClick} className="px-1">
                ファイルを選択
              </Button>
            </>
          )}
        </div>

        <p className="text-sm text-gray-500">
          対応形式: MP3, WAV (最大サイズ: 50MB)。
          <br />
          メドレー曲などのオーディオファイルをアップロードしてください。
        </p>

        {fileName && (
          <Button onClick={handleButtonClick} size="sm">
            ファイルを変更
          </Button>
        )}
      </div>
    </div>
  );
}
