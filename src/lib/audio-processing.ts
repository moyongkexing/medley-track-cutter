import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile,  } from "@ffmpeg/util";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { detectMusicBoundaries, createTracksFromBoundaries, analyzeAudioFile, type SpectralDetectionOptions } from "./spectral-detection";

// FFmpegのログを格納する変数
let ffmpegLogs: string = '';

export interface Track {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  selected: boolean;
}

interface SilenceDetectionOptions {
  silenceThreshold: number; // in dB, e.g. -60
  silenceDuration: number;  // in seconds, e.g. 2
}

// 曲の切り替わり検出のためのオプション
export interface TrackDetectionOptions {
  // 無音検出を使用するかどうか
  useSilenceDetection: boolean;
  // 無音検出のオプション
  silenceOptions: SilenceDetectionOptions;
  // スペクトル検出を使用するかどうか
  useSpectralDetection: boolean;
  // スペクトル検出のオプション
  spectralOptions: Partial<SpectralDetectionOptions>;
}

export const createFFmpeg = async (): Promise<FFmpeg> => {
  try {
    const ffmpeg = new FFmpeg();
    
    console.log('FFmpeg loading...');
    
    // イベントリスナーを追加してログを取得
    ffmpeg.on('log', ({ message }) => {
      console.log(`FFmpeg log: ${message}`);
      ffmpegLogs += message + '\n';
    });
    
    // シンプルなロード方法を使用
    await ffmpeg.load();
    
    console.log('FFmpeg loaded successfully');
    return ffmpeg;
  } catch (error) {
    console.error('Error loading FFmpeg:', error);
    throw error;
  }
};

export const detectSilences = async (
  ffmpeg: FFmpeg,
  audioFile: File,
  options: SilenceDetectionOptions,
  onProgress?: (progress: number) => void
): Promise<{ start: number; end: number; }[]> => {
  try {
    console.log('Writing file to FFmpeg filesystem...');
    
    // ファイルをFFmpegのファイルシステムに書き込む
    const fileData = await fetchFile(audioFile);
    await ffmpeg.writeFile("input", fileData);
    
    console.log('File written successfully. Running silence detection...');
    
    const silenceThresholdDbParam = options.silenceThreshold.toString();
    const silenceDurationParam = options.silenceDuration.toString();
    
    // 進捗イベントのハンドラを一度削除してから登録し直す
    ffmpeg.off('progress');
    if (onProgress) {
      ffmpeg.on('progress', (progress) => {
        console.log(`FFmpeg progress: ${progress.progress * 100}%`);
        onProgress(progress.progress);
      });
    }
    
    // 現在のログをクリアして新しいもののみ取得するため
    ffmpegLogs = '';
    
    // 無音区間を検出するフィルタを使用
    console.log(`Executing FFmpeg with silencedetect=n=${silenceThresholdDbParam}dB:d=${silenceDurationParam}`);
    await ffmpeg.exec([
      "-i", "input",
      "-af", `silencedetect=n=${silenceThresholdDbParam}dB:d=${silenceDurationParam}`,
      "-f", "null", "-"
    ]);
    
    // ログ出力を解析して無音区間の結果を取得
    console.log('Silence detection complete. Processing logs...');
    console.log('FFmpeg logs:', ffmpegLogs.substring(0, 500) + '...');
    
    try {
      // ログを直接使用
      const logStr = ffmpegLogs;
      
      // ログから無音区間の開始/終了位置を抽出
      const silences: { start: number; end: number }[] = [];
      const silenceStartRegex = /silence_start: (\d+(\.\d+)?)/g;
      const silenceEndRegex = /silence_end: (\d+(\.\d+)?)/g;
      
      let match;
      let startTimes: number[] = [];
      let endTimes: number[] = [];
      
      console.log('Parsing silence detection logs...');
      console.log('Log content preview:', logStr.substring(0, 500));
      
      while ((match = silenceStartRegex.exec(logStr)) !== null) {
        startTimes.push(parseFloat(match[1]));
      }
      
      while ((match = silenceEndRegex.exec(logStr)) !== null) {
        endTimes.push(parseFloat(match[1]));
      }
      
      console.log(`Found ${startTimes.length} silence start times and ${endTimes.length} silence end times`);
      
      // 無音区間セグメントを作成
      for (let i = 0; i < Math.min(startTimes.length, endTimes.length); i++) {
        silences.push({
          start: startTimes[i],
          end: endTimes[i]
        });
      }
      
      console.log(`Created ${silences.length} silence segments`);
      return silences;
    } catch (error) {
      console.error('Error parsing FFmpeg logs:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      // ログが読めない場合は空の配列を返す
      return [];
    }
  } catch (error) {
    console.error('Error detecting silences:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const getAudioDuration = async (ffmpeg: FFmpeg, audioFile: File): Promise<number> => {
  try {
    console.log('Getting audio duration...');
    // この時点でinputファイルは既に書き込まれているはずなので、再度書き込まない
    
    // 現在のログをクリア
    ffmpegLogs = '';
    
    // ffprobeのような機能を使ってデュレーションを取得
    console.log('Executing FFmpeg to get duration info...');
    await ffmpeg.exec([
      "-i", "input",
      "-f", "null", "-"
    ]);
    
    // コンソールに直接ログを出力して確認
    console.log('FFmpeg logs:', ffmpegLogs.substring(0, 500) + '...');
    
    // FFmpegのログからデュレーションを解析
    console.log('Parsing duration from logs...');
    
    try {
      // ログを直接使用
      const logStr = ffmpegLogs;
      
      console.log('Log preview for duration:', logStr.substring(0, 500));
      
      const durationRegex = /Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/;
      const match = logStr.match(durationRegex);
      
      if (match) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseFloat(match[3]);
        
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        console.log(`Extracted duration: ${totalSeconds} seconds (${hours}h:${minutes}m:${seconds}s)`);
        return totalSeconds;
      }
      
      throw new Error("Could not determine audio duration from logs");
    } catch (error) {
      console.error('Error parsing duration from logs:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error("Failed to get audio duration");
    }
  } catch (error) {
    console.error('Error getting audio duration:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const detectTracks = async (
  ffmpeg: FFmpeg,
  audioFile: File,
  options: TrackDetectionOptions | SilenceDetectionOptions,
  onProgress?: (progress: number) => void
): Promise<Track[]> => {
  try {
    console.log('Starting track detection...');
    
    // オプションの形式を確認
    const isTrackDetectionOptions = 'useSilenceDetection' in options;
    
    // 新しい形式のオプション（TrackDetectionOptions）であれば、それを使用
    // 旧形式（SilenceDetectionOptions）であれば、それを無音検出オプションとして使用
    const trackOptions: TrackDetectionOptions = isTrackDetectionOptions
      ? options as TrackDetectionOptions
      : {
          useSilenceDetection: true,
          silenceOptions: options as SilenceDetectionOptions,
          useSpectralDetection: false,
          spectralOptions: {}
        };
    
    // ファイルをFFmpegファイルシステムに書き込む
    const fileData = await fetchFile(audioFile);
    await ffmpeg.writeFile("input", fileData);
    console.log('File written to FFmpeg filesystem');
    
    // トラック数が多い場合、進捗表示を微調整するためのヘルパー関数
    const reportProgress = (currentIndex: number, currentProgress = 0) => {
      if (onProgress) {
        // 各トラックは全体の1/Nの進捗を持つ
        // 対象のトラックの基本進捗値 (現在のインデックス/全体のトラック数)
        const baseProgress = currentIndex / selectedTracks.length;
        // 現在のトラックの作業進捗（現在のトラックの重み付け）
        const currentWeight = 1 / selectedTracks.length;
        // 全体の進捗状況を計算 - currentProgressを0.0～1.0に制限
        const safeCurrentProgress = Math.min(1.0, Math.max(0.0, currentProgress));
        const totalProgress = baseProgress + (safeCurrentProgress * currentWeight);

        onProgress(totalProgress, currentIndex + 1, selectedTracks.length);
      }
    };
    
    // 進捗イベントのリスナーを追加
    const outputFiles: Blob[] = [];
    
    ffmpeg.on('progress', (event) => {
      const currentTrackIndex = outputFiles.length;
      reportProgress(currentTrackIndex, event.progress);
    });
    
    // 曲のデュレーションを取得
    const duration = await getAudioDuration(ffmpeg, audioFile);
    console.log(`Audio duration: ${duration} seconds`);
    
    // 検出方法に応じて処理を分岐
    if (trackOptions.useSpectralDetection) {
      // スペクトル分析を使用した曲の切り替わり検出
      console.log('Using spectral detection for track boundaries');
      
      try {
        // スペクトル分析を実行
        const { tracks } = await analyzeAudioFile(audioFile, trackOptions.spectralOptions);
        console.log(`Detected ${tracks.length} tracks using spectral analysis`);
        
        if (onProgress) {
          onProgress(1.0); // 完了
        }
        
        return tracks;
      } catch (error) {
        console.error('Spectral detection failed:', error);
        console.log('Falling back to silence detection...');
        // スペクトル検出に失敗した場合、無音検出にフォールバック
      }
    }
    
    // 無音検出を使用（スペクトル検出を使用しない場合、またはスペクトル検出が失敗した場合）
    if (trackOptions.useSilenceDetection) {
      console.log('Using silence detection for track boundaries');
      const silenceOptions = isTrackDetectionOptions
        ? trackOptions.silenceOptions
        : options as SilenceDetectionOptions;
      
      const silences = await detectSilences(ffmpeg, audioFile, silenceOptions, onProgress);
      console.log(`Detected ${silences.length} silence segments`);
      
      // 無音区間からトラックを生成
      const tracks: Track[] = [];
      
      // 最初のトラック（最初から最初の無音まで）
      if (silences.length > 0 && silences[0].start > 0) {
        tracks.push({
          id: 0,
          startTime: 0,
          endTime: silences[0].start,
          selected: false
        });
        console.log(`Added first track: 0 to ${silences[0].start}s`);
      } else if (silences.length === 0) {
        // 無音が検出されなかった場合、全体を1つのトラックとして扱う
        tracks.push({
          id: 0,
          startTime: 0,
          endTime: duration,
          selected: false
        });
        console.log(`No silences detected. Added single track: 0 to ${duration}s`);
        
        return tracks;
      }
      
      // 中間トラック
      for (let i = 0; i < silences.length - 1; i++) {
        tracks.push({
          id: tracks.length,
          startTime: silences[i].end,
          endTime: silences[i + 1].start,
          selected: false
        });
        console.log(`Added middle track ${tracks.length}: ${silences[i].end}s to ${silences[i + 1].start}s`);
      }
      
      // 最後のトラック（最後の無音から終わりまで）
      if (silences.length > 0) {
        const lastSilence = silences[silences.length - 1];
        
        if (lastSilence.end < duration) {
          tracks.push({
            id: tracks.length,
            startTime: lastSilence.end,
            endTime: duration,
            selected: false
          });
          console.log(`Added last track: ${lastSilence.end}s to ${duration}s`);
        }
      }
      
      console.log(`Total tracks detected: ${tracks.length}`);
      return tracks;
    }
    
    // 何も検出できなかった場合、全体を1つのトラックとして扱う
    console.log('No detection method worked. Treating the whole file as a single track');
    return [{
      id: 0,
      startTime: 0,
      endTime: duration,
      selected: false
    }];
  } catch (error) {
    console.error("Error detecting tracks:", error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

// デフォルトのトラック分割オプション
export const defaultTrackDetectionOptions: TrackDetectionOptions = {
  useSilenceDetection: true,
  silenceOptions: {
    silenceThreshold: -40, // dB
    silenceDuration: 1.5   // seconds
  },
  useSpectralDetection: true,
  spectralOptions: {
    sensitivity: 0.5,  // スペクトル変化の検出感度（0.0～1.0）
    minSegmentDuration: 20.0  // 最小セグメント長（秒）
  }
};

export const extractTracks = async (
  ffmpeg: FFmpeg,
  audioFile: File,
  tracks: Track[],
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<Blob[]> => {
  try {
    console.log('Starting track extraction...');
    const selectedTracks = tracks.filter(track => track.selected);
    console.log(`Selected tracks for extraction: ${selectedTracks.length}`);
    
    const outputFiles: Blob[] = [];
    
    // 進捗イベントのリスナーをクリア
    ffmpeg.off('progress');
    
    // トラック数が多い場合、進捗表示を微調整するためのヘルパー関数
    const reportProgress = (currentIndex: number, currentProgress = 0) => {
      if (onProgress) {
        // 各トラックは全体の1/Nの進捗を持つ
        // 対象のトラックの基本進捗値
        const baseProgress = currentIndex / selectedTracks.length;
        // 現在のトラックの作業進捗（現在のトラックの重み付け）
        const currentWeight = 1 / selectedTracks.length;
        // 全体の進捗状況を計算
        const totalProgress = baseProgress + (currentProgress * currentWeight);

        onProgress(totalProgress, currentIndex + 1, selectedTracks.length);
      }
    };
    
    // 処理前に入力ファイルがあるか確認、なければ書き込む
    try {
      await ffmpeg.readFile('input');
      console.log('Input file already exists in FFmpeg filesystem');
    } catch (e) {
      console.log('Input file not found in FFmpeg filesystem, writing it...');
      const fileData = await fetchFile(audioFile);
      await ffmpeg.writeFile("input", fileData);
      console.log('Input file written successfully');
    }
    
    // 初期進捗を報告
    reportProgress(0, 0);
    
    // 進捗イベントのリスナーを追加（各トラックの処理中の進捗を報告）
    ffmpeg.on('progress', (event) => {
      const currentIndex = outputFiles.length;
      reportProgress(currentIndex, event.progress);
    });
    
    for (let i = 0; i < selectedTracks.length; i++) {
      const track = selectedTracks[i];
      const outputFilename = `output_${i}.mp3`;
      
      console.log(`Extracting track ${i+1}/${selectedTracks.length}: ${track.startTime}s to ${track.endTime}s`);
      
      // トラック開始前の進捗を更新
      reportProgress(i, 0);
      
      // 開始時間と終了時間に基づいてセグメントを抽出
      await ffmpeg.exec([
        "-i", "input",
        "-ss", track.startTime.toString(),
        "-to", track.endTime.toString(),
        "-c:a", "libmp3lame",
        "-q:a", "2",
        outputFilename
      ]);
      
      console.log(`Reading output file: ${outputFilename}`);
      // 出力ファイルを読み込む
      const data = await ffmpeg.readFile(outputFilename);
      const blob = new Blob([data], { type: "audio/mp3" });
      outputFiles.push(blob);
      
      // トラック完了の進捗を更新
      reportProgress(i + 1, 0);
      
      // メモリを節約するために出力ファイルを削除
      await ffmpeg.deleteFile(outputFilename);
      console.log(`Deleted temporary file: ${outputFilename}`);
    }
    
    console.log(`All ${outputFiles.length} tracks extracted successfully`);
    return outputFiles;
  } catch (error) {
    console.error("Error extracting tracks:", error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const createTrackFilename = (track: Track, originalFilename: string): string => {
  const baseFilename = originalFilename.split(".").slice(0, -1).join(".");
  const startTime = formatTime(track.startTime);
  const endTime = formatTime(track.endTime);
  
  return `${baseFilename}_${startTime}-${endTime}.mp3`;
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const downloadTracksAsZip = async (
  tracks: Track[],
  trackBlobs: Blob[],
  originalFilename: string
): Promise<void> => {
  const selectedTracks = tracks.filter(track => track.selected);
  
  // Create a new ZIP file
  const zip = new JSZip();
  
  // Add each track to the ZIP
  for (let i = 0; i < trackBlobs.length; i++) {
    const track = selectedTracks[i];
    const filename = createTrackFilename(track, originalFilename);
    zip.file(filename, trackBlobs[i]);
  }
  
  // Generate the ZIP file
  const zipBlob = await zip.generateAsync({ type: "blob" });
  
  // Download the ZIP file
  const baseFilename = originalFilename.split(".").slice(0, -1).join(".");
  saveAs(zipBlob, `${baseFilename}_tracks.zip`);
};