# MedleyTrackCutter

アップロードしたmp3ファイルを無音区間で分割します。また、それぞれを個別にダウンロードすることができます。

![Image](https://github.com/user-attachments/assets/2773c100-afb9-4787-9dc3-5c525d03dfcb)

## 特徴

- ブラウザ上で動作し、サーバーへのアップロードが不要（WebAssemblyを使用）
- MP3/WAV形式の音楽ファイルに対応
- 無音区間を検出して曲を自動分割（無音レベル閾値、無音継続時間などパラメータのカスタマイズも可能）
- ZIPでまとめてダウンロード

## 技術スタック

- React + Next.js
- TypeScript
- Tailwind CSS + shadcn/ui
- FFmpeg (WebAssembly)
- Biome (リンター)

## 開発環境のセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/moyongkexing/medley-track-cutter.git
cd medley-track-cutter

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

## ビルド方法

```bash
# 本番用ビルド
npm run build

# ビルド結果を確認
npm run start
```

## 使い方

### 音声ファイルからの曲抽出

1. MP3またはWAVファイルをアップロード
2. 必要に応じて無音検出パラメータを調整
   - 無音レベル閾値: -80dB (非常に敏感) 〜 -20dB (鈍感)
   - 無音継続時間: 曲間と判断する無音の最小秒数
3. 「曲を検出」ボタンをクリック
4. 検出された曲の一覧から必要な曲を選択
5. 「選択した曲を抽出」ボタンをクリック
6. 個別にダウンロードするか、「全てダウンロード」でZIPファイルを取得


## ライセンス

MIT License
