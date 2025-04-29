import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { parseIndicesInput } from "@/lib/utils";
import { defaultTrackDetectionOptions, type TrackDetectionOptions } from "@/lib/audio-processing";

interface ExtractionControlsProps {
  onDetectTracks: (options: TrackDetectionOptions) => void;
  onTrackIndicesChange: (indices: number[]) => void;
  isProcessing: boolean;
  hasTracksDetected: boolean;
  hasAudioFile: boolean;
}

export function ExtractionControls({
  onDetectTracks,
  onTrackIndicesChange,
  isProcessing,
  hasTracksDetected,
  hasAudioFile,
}: ExtractionControlsProps) {
  const [trackOptions, setTrackOptions] = useState<TrackDetectionOptions>({
    ...defaultTrackDetectionOptions
  });
  const [trackIndices, setTrackIndices] = useState("");

  const handleSilenceThresholdChange = (value: number[]) => {
    setTrackOptions(prev => ({
      ...prev,
      silenceOptions: {
        ...prev.silenceOptions,
        silenceThreshold: value[0]
      }
    }));
  };

  const handleSilenceDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!Number.isNaN(value) && value > 0) {
      setTrackOptions(prev => ({
        ...prev,
        silenceOptions: {
          ...prev.silenceOptions,
          silenceDuration: value
        }
      }));
    }
  };
  
  const handleSpectrumSensitivityChange = (value: number[]) => {
    setTrackOptions(prev => ({
      ...prev,
      spectralOptions: {
        ...prev.spectralOptions,
        sensitivity: value[0]
      }
    }));
  };
  
  const handleMinSegmentDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!Number.isNaN(value) && value > 0) {
      setTrackOptions(prev => ({
        ...prev,
        spectralOptions: {
          ...prev.spectralOptions,
          minSegmentDuration: value
        }
      }));
    }
  };
  
  // ラジオボタンの値に基づいて分割方法を設定
  const handleUseSilenceDetectionChange = (checked: boolean) => {
    setTrackOptions(prev => ({
      ...prev,
      useSilenceDetection: checked,
      useSpectralDetection: !checked
    }));
  };
  
  const handleUseSpectralDetectionChange = (checked: boolean) => {
    setTrackOptions(prev => ({
      ...prev,
      useSpectralDetection: checked,
      useSilenceDetection: !checked
    }));
  };

  const handleIndicesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setTrackIndices(input);
    onTrackIndicesChange(parseIndicesInput(input));
  };

  return (
    <div className="space-y-4 my-4">
      {/* レイアウトシフトを防止するため、固定高さのコンテナを使用 */}
      <div className="min-h-[24rem]">
      <div className="space-y-4">
        <RadioGroup 
          defaultValue="spectral"
          value={trackOptions.useSpectralDetection ? "spectral" : (trackOptions.useSilenceDetection ? "silence" : "")}
          onValueChange={(value) => {
            if (value === "spectral") {
              handleUseSpectralDetectionChange(true);
            } else if (value === "silence") {
              handleUseSilenceDetectionChange(true);
            }
          }}
          className="space-y-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="spectral" id="use-spectral" disabled={isProcessing || !hasAudioFile} />
            <Label htmlFor="use-spectral" className="font-medium">曲の特徴を分析して分割</Label>
            <p className="text-xs text-gray-500 ml-2">（無音がなくても曲の切り替わりを分割可能）</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="silence" id="use-silence" disabled={isProcessing || !hasAudioFile} />
            <Label htmlFor="use-silence" className="font-medium">無音区間で分割</Label>
            <p className="text-xs text-gray-500 ml-2">（従来の分割方法）</p>
          </div>
        </RadioGroup>
        
        {trackOptions.useSpectralDetection && (
          <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4 mt-4">
            <div>
              <Label htmlFor="spectrum-sensitivity">分割感度: {trackOptions.spectralOptions.sensitivity?.toFixed(1)}</Label>
              <Slider
                id="spectrum-sensitivity"
                min={0.1}
                max={1.0}
                step={0.1}
                value={[trackOptions.spectralOptions.sensitivity || 0.5]}
                onValueChange={handleSpectrumSensitivityChange}
                className="my-2"
                disabled={isProcessing || !hasAudioFile}
              />
              <p className="text-xs text-gray-500">高いほど小さな変化も検出しますが、過剰検出する可能性があります。</p>
            </div>

            <div>
              <Label htmlFor="min-segment-duration">最小セグメント長 (秒)</Label>
              <Input
                id="min-segment-duration"
                type="number"
                min="0.5"
                step="0.5"
                value={trackOptions.spectralOptions.minSegmentDuration || 1.0}
                onChange={handleMinSegmentDurationChange}
                className="my-2"
                disabled={isProcessing || !hasAudioFile}
              />
              <p className="text-xs text-gray-500">この秒数以上の間隔が必要です（あまり短くすると過剩検出します）。</p>
            </div>
          </div>
        )}
        
        {trackOptions.useSilenceDetection && (
          <div className="ml-6 space-y-4 border-l-2 border-gray-200 pl-4 mt-4">
            <div>
              <Label htmlFor="silence-threshold">無音レベル閾値: {trackOptions.silenceOptions.silenceThreshold} dB</Label>
              <Slider
                id="silence-threshold"
                min={-80}
                max={-20}
                step={1}
                value={[trackOptions.silenceOptions.silenceThreshold]}
                onValueChange={handleSilenceThresholdChange}
                className="my-2"
                disabled={isProcessing || !hasAudioFile}
              />
              <p className="text-xs text-gray-500">低いほど（-80に近いほど）より小さな音まで音として検出します。</p>
            </div>

            <div>
              <Label htmlFor="silence-duration">無音継続時間 (秒)</Label>
              <Input
                id="silence-duration"
                type="number"
                min="0.5"
                step="0.5"
                value={trackOptions.silenceOptions.silenceDuration}
                onChange={handleSilenceDurationChange}
                className="my-2"
                disabled={isProcessing || !hasAudioFile}
              />
              <p className="text-xs text-gray-500">この秒数以上の無音区間を曲の区切りとして検出します。</p>
            </div>
          </div>
        )}

        <Button
        onClick={() => onDetectTracks(trackOptions)}
        disabled={isProcessing || !hasAudioFile || (!trackOptions.useSilenceDetection && !trackOptions.useSpectralDetection)}
        className="w-full mt-4"
        >
        {isProcessing ? "処理中..." : "曲を分割する"}
        </Button>
      </div>

      </div>
      {/* 抽出ボタンはコンテナの外に配置（セクションの下部に表示されるように） */}
    </div>
  );
}