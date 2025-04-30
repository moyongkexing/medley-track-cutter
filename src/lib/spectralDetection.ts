import Meyda from "meyda";

// スペクトル変化検出のための設定
export interface SpectralDetectionOptions {
  // FFTサイズ（デフォルト2048）
  fftSize: number;
  // 分析する周波数の下限（Hz）
  minFrequency: number;
  // 分析する周波数の上限（Hz）
  maxFrequency: number;
  // 検出感度（0.0〜1.0）
  sensitivity: number;
  // 検出するスペクトル変化の最小間隔（秒）
  minSegmentDuration: number;
  // 特徴量の重み付け
  weights: {
    spectralCentroid: number;
    spectralFlatness: number;
    spectralRolloff: number;
    spectralFlux: number;
    rms: number;
    zcr: number;
  };
}

// デフォルト設定
export const defaultSpectralOptions: SpectralDetectionOptions = {
  fftSize: 2048,
  minFrequency: 20,
  maxFrequency: 16000,
  sensitivity: 0.5,
  minSegmentDuration: 20.0, // 20秒以上の間隔でセグメントを検出
  weights: {
    spectralCentroid: 1.0,
    spectralFlatness: 0.8,
    spectralRolloff: 0.7,
    spectralFlux: 1.0,
    rms: 0.6,
    zcr: 0.4,
  },
};

// スペクトル特性（メインの特徴ベクトル）のインターフェース
interface SpectralFeatures {
  time: number;
  spectralCentroid: number;
  spectralFlatness: number;
  spectralRolloff: number;
  spectralFlux: number;
  rms: number;
  zcr: number;
}

/**
 * オーディオバッファからスペクトル特性を抽出する
 */
export const extractSpectralFeatures = (
  audioBuffer: AudioBuffer,
  sampleRate: number,
  options: SpectralDetectionOptions = defaultSpectralOptions,
): SpectralFeatures[] => {
  const audioData = audioBuffer.getChannelData(0); // モノラルに変換
  const hopSize = Math.floor(options.fftSize / 4); // 75%オーバーラップ
  const features: SpectralFeatures[] = [];

  let prevFeatures: any = null;

  // フレームごとに特徴を抽出
  for (let i = 0; i < audioData.length - options.fftSize; i += hopSize) {
    const frame = audioData.slice(i, i + options.fftSize);
    const time = i / sampleRate;

    // Meydaを使用して特徴量を抽出
    const meydaFeatures = Meyda.extract(
      ["spectralCentroid", "spectralFlatness", "spectralRolloff", "rms", "zcr"],
      frame,
    );

    // meydaFeaturesがnullでないことを確認
    if (
      meydaFeatures &&
      typeof meydaFeatures.spectralCentroid !== "undefined" &&
      typeof meydaFeatures.spectralFlatness !== "undefined" &&
      typeof meydaFeatures.spectralRolloff !== "undefined" &&
      typeof meydaFeatures.rms !== "undefined" &&
      typeof meydaFeatures.zcr !== "undefined"
    ) {
      // スペクトルフラックス（前フレームとの差分）を計算
      let spectralFlux = 0;
      if (prevFeatures && typeof prevFeatures.spectralCentroid !== "undefined") {
        spectralFlux =
          Math.abs(meydaFeatures.spectralCentroid - prevFeatures.spectralCentroid) / 10000;
      }

      prevFeatures = meydaFeatures;

      features.push({
        time,
        spectralCentroid: meydaFeatures.spectralCentroid,
        spectralFlatness: meydaFeatures.spectralFlatness,
        spectralRolloff: meydaFeatures.spectralRolloff,
        spectralFlux,
        rms: meydaFeatures.rms,
        zcr: meydaFeatures.zcr,
      });
    }
  }

  return features;
};

/**
 * ノベルティ関数を計算する（変化の大きさを示す関数）
 */
export const calculateNoveltyFunction = (
  features: SpectralFeatures[],
  options: SpectralDetectionOptions = defaultSpectralOptions,
): { time: number; novelty: number }[] => {
  const noveltyFunction: { time: number; novelty: number }[] = [];
  const { weights } = options;

  // スケーリングを行うための正規化
  let maxCentroid = 0;
  let maxFlatness = 0;
  let maxRolloff = 0;
  let maxFlux = 0;
  let maxRms = 0;
  let maxZcr = 0;

  for (const feature of features) {
    maxCentroid = Math.max(maxCentroid, feature.spectralCentroid);
    maxFlatness = Math.max(maxFlatness, feature.spectralFlatness);
    maxRolloff = Math.max(maxRolloff, feature.spectralRolloff);
    maxFlux = Math.max(maxFlux, feature.spectralFlux);
    maxRms = Math.max(maxRms, feature.rms);
    maxZcr = Math.max(maxZcr, feature.zcr);
  }

  // 微分に基づくノベルティを計算
  for (let i = 2; i < features.length - 2; i++) {
    const feature = features[i];

    // 前後の特徴を取得（前後2フレームでの差分を計算）
    const prevFeature = features[i - 2];
    const nextFeature = features[i + 2];

    // 各特徴量の変化率を計算（正規化して重み付け）
    const centroidChange =
      (weights.spectralCentroid *
        Math.abs(nextFeature.spectralCentroid - prevFeature.spectralCentroid)) /
      (maxCentroid || 1);

    const flatnessChange =
      (weights.spectralFlatness *
        Math.abs(nextFeature.spectralFlatness - prevFeature.spectralFlatness)) /
      (maxFlatness || 1);

    const rolloffChange =
      (weights.spectralRolloff *
        Math.abs(nextFeature.spectralRolloff - prevFeature.spectralRolloff)) /
      (maxRolloff || 1);

    const fluxChange =
      (weights.spectralFlux * Math.abs(nextFeature.spectralFlux - prevFeature.spectralFlux)) /
      (maxFlux || 1);

    const rmsChange = (weights.rms * Math.abs(nextFeature.rms - prevFeature.rms)) / (maxRms || 1);

    const zcrChange = (weights.zcr * Math.abs(nextFeature.zcr - prevFeature.zcr)) / (maxZcr || 1);

    // すべての変化を組み合わせてノベルティ値を計算
    const novelty =
      centroidChange + flatnessChange + rolloffChange + fluxChange + rmsChange + zcrChange;

    noveltyFunction.push({
      time: feature.time,
      novelty,
    });
  }

  return noveltyFunction;
};

/**
 * ピーク検出（閾値を超えるノベルティのピークを見つける）
 */
export const findNoveltyPeaks = (
  noveltyFunction: { time: number; novelty: number }[],
  options: SpectralDetectionOptions = defaultSpectralOptions,
): number[] => {
  const { sensitivity, minSegmentDuration } = options;

  // ノベルティの平均と標準偏差を計算
  const values = noveltyFunction.map(n => n.novelty);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // 閾値 = 平均 + 感度 * 標準偏差
  // 感度を2乗することで、高感度時により高い閾値を設定（多すぎる検出を防ぐ）
  const threshold = mean + sensitivity * sensitivity * 2 * stdDev;

  // 連続したフレームで閾値を超えた場合、最大値のみをピークとして扱う
  const peaks: number[] = [];
  let lastPeakTime = Number.NEGATIVE_INFINITY;

  // 局所的なピークを見つけるためのウィンドウサイズを増やす
  const windowSize = 5; // 前後5サンプルを見る

  for (let i = windowSize; i < noveltyFunction.length - windowSize; i++) {
    const curr = noveltyFunction[i];

    // より広いウィンドウでのピーク検出
    let isPeak = curr.novelty > threshold;

    // 前後のサンプルよりも大きい値かを確認
    for (let j = 1; j <= windowSize && isPeak; j++) {
      if (
        curr.novelty <= noveltyFunction[i - j].novelty ||
        curr.novelty <= noveltyFunction[i + j].novelty
      ) {
        isPeak = false;
        break;
      }
    }

    if (isPeak) {
      // 前のピークから最小セグメント時間以上経過しているか確認
      if (curr.time - lastPeakTime >= minSegmentDuration) {
        peaks.push(curr.time);
        lastPeakTime = curr.time;
      }
    }
  }

  // ピークが検出されない場合や少なすぎる場合は、もう少し感度を下げて再試行
  if (peaks.length < 2 && sensitivity > 0.3) {
    // 感度を下げて再帰的に呼び出し
    const lowerSensitivity = { ...options };
    lowerSensitivity.sensitivity = sensitivity * 0.7;
    return findNoveltyPeaks(noveltyFunction, lowerSensitivity);
  }

  return peaks;
};

/**
 * オーディオバッファから曲の切り替わりを検出する
 * @param audioBuffer オーディオバッファ
 * @param sampleRate サンプリングレート（Hz）
 * @param options スペクトル検出オプション
 * @returns 検出された境界時間（秒）
 */
export const detectMusicBoundaries = (
  audioBuffer: AudioBuffer,
  sampleRate: number,
  options: Partial<SpectralDetectionOptions> = {},
): number[] => {
  // オプションをデフォルト値とマージ
  const mergedOptions: SpectralDetectionOptions = {
    ...defaultSpectralOptions,
    ...options,
    weights: {
      ...defaultSpectralOptions.weights,
      ...(options.weights || {}),
    },
  };

  // 1. 特徴量を抽出
  const features = extractSpectralFeatures(audioBuffer, sampleRate, mergedOptions);

  // 2. ノベルティ関数を計算
  const noveltyFunction = calculateNoveltyFunction(features, mergedOptions);

  // 3. ピーク検出
  const boundaries = findNoveltyPeaks(noveltyFunction, mergedOptions);

  // 4. 最初に0秒を追加（必ず最初のトラックを含める）
  if (boundaries.length === 0 || boundaries[0] > 0.1) {
    boundaries.unshift(0);
  }

  return boundaries;
};

/**
 * 検出された境界時間からトラックのリストを生成する
 */
export const createTracksFromBoundaries = (
  boundaries: number[],
  duration: number,
  defaultSelected = true,
): {
  id: number;
  startTime: number;
  endTime: number;
  selected: boolean;
}[] => {
  const tracks = [];

  // 各境界点からトラックを生成
  for (let i = 0; i < boundaries.length; i++) {
    const startTime = boundaries[i];
    const endTime = i < boundaries.length - 1 ? boundaries[i + 1] : duration;

    // 最後の境界からファイルの終わりまでをトラックとして追加
    if (endTime > startTime) {
      tracks.push({
        id: i,
        startTime,
        endTime,
        selected: defaultSelected,
      });
    }
  }

  // 最後の境界からファイルの終わりまでのトラックを追加
  if (boundaries.length > 0 && boundaries[boundaries.length - 1] < duration) {
    tracks.push({
      id: boundaries.length,
      startTime: boundaries[boundaries.length - 1],
      endTime: duration,
      selected: defaultSelected,
    });
  }

  return tracks;
};

// オーディオファイルをアップロードしてFFmpeg処理前に分析するための関数
export const analyzeAudioFile = async (
  file: File,
  options: Partial<SpectralDetectionOptions> = {},
): Promise<{
  boundaries: number[];
  tracks: {
    id: number;
    startTime: number;
    endTime: number;
    selected: boolean;
  }[];
}> => {
  return new Promise((resolve, reject) => {
    // FileReaderを使用してファイルを読み込む
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        // AudioContextを作成
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // ArrayBufferをデコード
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // 境界を検出
        const boundaries = detectMusicBoundaries(audioBuffer, audioContext.sampleRate, options);

        // トラックを生成
        const tracks = createTracksFromBoundaries(boundaries, audioBuffer.duration);

        // AudioContextを閉じる
        audioContext.close();

        resolve({ boundaries, tracks });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
