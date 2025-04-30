const fs = require("node:fs");
const path = require("node:path");

// FFmpegのコアファイルのパス
const ffmpegCorePath = path.join(__dirname, "node_modules", "@ffmpeg", "core", "dist", "umd");

// publicディレクトリのパス
const publicPath = path.join(__dirname, "public");

// コピーするファイル
const filesToCopy = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

// v0.12以降ではworkerの構造が変わったため、コピーする必要がなくなりました
// workerはBLOB URLでロードされるようになったので、この部分はコメントアウト
/*
// FFmpeg workerファイルのパス
const ffmpegPath = path.join(
  __dirname,
  'node_modules',
  '@ffmpeg',
  'ffmpeg',
  'dist',
  'umd'
);

// workerファイル
const workerFile = 'ffmpeg-worker.js';
*/

// ファイルをコピーする関数
function copyFile(src, dest) {
  try {
    const data = fs.readFileSync(src);
    fs.writeFileSync(dest, data);
    console.log(`Copied: ${src} -> ${dest}`);
  } catch (err) {
    console.error(`Error copying ${src}: ${err.message}`);
  }
}

// FFmpegのコアファイルをコピー
for (const file of filesToCopy) {
  const src = path.join(ffmpegCorePath, file);
  const dest = path.join(publicPath, file);
  copyFile(src, dest);
}

// v0.12以降ではworkerのコピーが必要なくなりました
/*
// Workerファイルをコピー
const workerSrc = path.join(ffmpegPath, workerFile);
const workerDest = path.join(publicPath, workerFile);
copyFile(workerSrc, workerDest);
*/

console.log("FFmpeg setup completed!");
