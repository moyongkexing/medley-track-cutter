// biome-ignore lint/style/useImportType: <explanation>
import { NextRequest, NextResponse } from "next/server";

// YouTube APIリクエストをプロキシするハンドラー
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { url, method = "GET", headers: customHeaders = {}, body: requestBody } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "有効なURLが必要です" }, { status: 400 });
    }

    // URLが有効かチェック
    try {
      new URL(url);
    } catch (urlError) {
      console.error("Invalid URL:", url);
      return NextResponse.json({ error: "無効なURL形式です" }, { status: 400 });
    }

    console.log(`Proxying request to: ${url}`);
    console.log(`Method: ${method}`);

    // 標準ヘッダーとカスタムヘッダーをマージ
    const mergedHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      accept: "*/*",
      origin: "https://www.youtube.com",
      referer: "https://www.youtube.com",
      DNT: "?1",
      ...customHeaders,
    };

    console.log("Headers:", mergedHeaders);

    // リクエストボディの処理
    let processedBody = undefined;

    if (requestBody) {
      if (typeof requestBody === "string") {
        // 文字列の場合はそのまま使用
        processedBody = requestBody;
      } else if (typeof requestBody === "object") {
        // オブジェクトの場合はJSON文字列に変換
        processedBody = JSON.stringify(requestBody);
      }
    }

    // タイムアウト設定を追加
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒タイムアウト（長めに設定）

    try {
      // YouTubeへのリクエストを実行
      const response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: processedBody,
        signal: controller.signal,
        // 重要なオプション: 暗号化されたURLのダウンロードに必要
        credentials: "include",
      });

      clearTimeout(timeoutId);

      // レスポンスをバッファとして取得
      const responseBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "application/octet-stream";

      console.log(`Response status: ${response.status}`);
      console.log(`Content-Type: ${contentType}`);

      // レスポンスを返す
      return new NextResponse(responseBuffer, {
        status: response.status,
        headers: {
          "Content-Type": contentType,
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Fetch error in proxy:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "プロキシリクエストに失敗しました" }, { status: 500 });
  }
}
