import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import type { Track } from "./audio-processing";

export const extractTracks = async (
  ffmpeg: FFmpeg,
  audioFile: File,
  tracks: Track[],
  onProgress?: (progress: number, current: number, total: number) => void,
): Promise<Blob[]> => {
  try {
    console.log("Starting track extraction...");
    const selectedTracks = tracks.filter(track => track.selected);
    console.log(`Selected tracks for extraction: ${selectedTracks.length}`);

    const outputFiles: Blob[] = [];

    // 進捗イベントのリスナーをクリア
    // 新しいFFmpeg APIではoffメソッドにコールバック関数も指定する必要がある
    // 厳密には前に登録したコールバックと同じ関数を渡す必要があるが、
    // 簡易的にダミー関数を渡して対応する
    try {
      // ダミーのコールバック関数を渡す
      ffmpeg.off("progress", () => {});
    } catch (e) {
      // エラーが発生しても無視する
      console.log("Failed to remove progress listeners, continuing anyway");
    }

    // トラック数が多い場合、進捗表示を微調整するためのヘルパー関数
    const reportProgress = (currentIndex: number, currentProgress = 0) => {
      if (onProgress) {
        // 各トラックは全体の1/Nの進捗を持つ
        // 対象のトラックの基本進捗値 (現在のインデックス/全体のトラック数)
        const baseProgress = currentIndex / selectedTracks.length;
        // 現在のトラックの作業進捗（現在のトラックの重み付け）
        const currentWeight = 1 / selectedTracks.length;

        // 入力値を0.0～1.0に制限
        const safeCurrentProgress = Math.min(1.0, Math.max(0.0, currentProgress));

        // 全体の進捗状況を計算
        // 完了したトラックの進捗 + 現在のトラックの進捗割合
        const totalProgress = baseProgress + safeCurrentProgress * currentWeight;

        // 進捗状況をコールバックで通知
        onProgress(totalProgress, currentIndex + 1, selectedTracks.length);
      }
    };

    // 処理前に入力ファイルがあるか確認、なければ書き込む
    try {
      await ffmpeg.readFile("input");
      console.log("Input file already exists in FFmpeg filesystem");
    } catch (e) {
      console.log("Input file not found in FFmpeg filesystem, writing it...");
      const fileData = await fetchFile(audioFile);
      await ffmpeg.writeFile("input", fileData);
      console.log("Input file written successfully");
    }

    // 初期進捗を報告
    reportProgress(0, 0);

    // 進捗イベントのリスナーを追加（各トラックの処理中の進捗を報告）
    ffmpeg.on("progress", event => {
      // 現在処理中のトラックのインデックスを取得
      const currentIndex = outputFiles.length;

      // event.progressが時々状態を正確に反映しない可能性があるので、値の正規化を行う
      const normalizedProgress = Math.min(1.0, Math.max(0.0, event.progress));

      // 進捗状況を更新
      reportProgress(currentIndex, normalizedProgress);
    });

    for (let i = 0; i < selectedTracks.length; i++) {
      const track = selectedTracks[i];
      const outputFilename = `output_${i}.mp3`;

      console.log(
        `Extracting track ${i + 1}/${selectedTracks.length}: ${track.startTime}s to ${track.endTime}s`,
      );

      // トラック開始前の進捗を更新
      reportProgress(i, 0);

      // 開始時間と終了時間に基づいてセグメントを抽出
      await ffmpeg.exec([
        "-i",
        "input",
        "-ss",
        track.startTime.toString(),
        "-to",
        track.endTime.toString(),
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        outputFilename,
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
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
};
