/**
 * 環境変数から動的に基本URLを構築する
 * - 開発環境: http://localhost:3001
 * - 本番環境: デプロイされたURL
 */
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || (
  typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://localhost:3001'
);

/**
 * プロキシAPIエンドポイント
 */
export const PROXY_API_URL = `${BASE_URL}/api/proxy`;
