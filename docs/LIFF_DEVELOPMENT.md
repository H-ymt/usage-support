# LINE LIFF 開発ガイド

## 概要

このドキュメントは、LINE LIFF (LINE Front-end Framework) を使用した開発のベストプラクティスとTipsをまとめたものです。

## 開発環境のセットアップ

### 1. ngrokのセットアップ

LINE LIFFアプリはHTTPS環境が必須です。ローカル開発ではngrokを使用します。

```bash
# ngrokアカウント作成: https://dashboard.ngrok.com/signup
# authtokenを設定
ngrok config add-authtoken YOUR_AUTHTOKEN

# 開発サーバー + ngrok を起動
pnpm run dev:liff
```

### 2. 環境変数の設定

ngrok起動後、表示されるURLを環境変数に設定:

```bash
# apps/web/.env
VITE_SERVER_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app
VITE_LIFF_ID=your-liff-id

# apps/server/.env
BETTER_AUTH_URL=https://xxxx-xx-xx-xx-xx.ngrok-free.app
CORS_ORIGIN=https://yyyy-yy-yy-yy-yy.ngrok-free.app
LINE_CHANNEL_ID=your-channel-id
LINE_CHANNEL_SECRET=your-channel-secret
```

### 3. LINE Developersでの設定

1. [LINE Developers Console](https://developers.line.biz/) にアクセス
2. プロバイダーを作成（未作成の場合）
3. Messaging APIチャネルまたはLINEログインチャネルを作成
4. LIFF アプリを追加:
   - **Endpoint URL**: `https://your-web-url.ngrok-free.app`
   - **Scope**: `profile`, `openid` (最低限)
   - **Bot link feature**: On/Off (お好みで)

## ngrokの注意点

### 無料プランの制限

- **URL が毎回変わる**: ngrok再起動のたびにURLが変更されます
  - → LINE Developersの設定を毎回更新する必要があります
  - → 環境変数も毎回更新が必要です
- **セッション制限**: 無料プランは同時に2つまでのトンネルのみ
- **帯域幅制限**: 月間データ転送量に制限あり

### 有料プラン（推奨）

ngrok Proプラン以上では以下が利用可能:
- **固定ドメイン**: URLが変わらないため設定変更不要
- **カスタムドメイン**: ブランドに合わせたドメイン使用可能
- **複数トンネル**: 同時に複数のトンネルを起動可能

固定ドメインを使用する場合、`ngrok.yml`を以下のように設定:

```yaml
version: "3"

tunnels:
  web:
    proto: http
    addr: 3001
    domain: your-custom-domain.ngrok-free.app  # 固定ドメイン
    inspect: true
    bind_tls: true

  server:
    proto: http
    addr: 3000
    domain: your-api-domain.ngrok-free.app  # 固定ドメイン
    inspect: true
    bind_tls: true
```

## 開発フロー

### 通常のフロー

1. **Supabase起動** (初回のみ)
   ```bash
   pnpm run supabase:start
   ```

2. **LIFF開発サーバー起動**
   ```bash
   pnpm run dev:liff
   ```

3. **ngrok URLを確認**
   - ターミナルに表示されるURLをコピー
   - 環境変数に設定（無料プランの場合は毎回）

4. **LINE Developersで設定更新**（無料プランの場合は毎回）
   - LIFF Endpoint URLを最新のngrok URLに更新

5. **ブラウザまたはLINEアプリでアクセス**
   - Web版: `https://liff.line.me/{LIFF_ID}`
   - LINE内ブラウザ: LIFFアプリのURL

### デバッグ方法

#### ブラウザ開発者ツール

LINE アプリ内でもChrome DevToolsが使用可能:
1. LINEアプリ内でLIFFを開く
2. Safariの場合: 設定 > Safari > 詳細 > Webインスペクタ
3. Chromeの場合: `chrome://inspect` にアクセス

#### ngrok Inspector

ngrokの管理画面で通信をモニタリング:
```
http://localhost:4040
```

ここで以下を確認可能:
- リクエスト/レスポンスの詳細
- ヘッダー情報
- タイミング情報

## LIFF SDK の使用

### 初期化

```typescript
import liff from '@line/liff';

// LIFF初期化
await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });

// ログイン状態確認
if (!liff.isLoggedIn()) {
  liff.login();
}

// ユーザー情報取得
const profile = await liff.getProfile();
console.log(profile);
```

### ユーザー情報の取得

```typescript
// プロフィール取得
const profile = await liff.getProfile();
// {
//   userId: 'U1234567890abcdef1234567890abcdef',
//   displayName: '山田太郎',
//   pictureUrl: 'https://...',
//   statusMessage: 'Hello!'
// }

// アクセストークン取得（サーバー認証用）
const accessToken = liff.getAccessToken();
```

### 環境判定

```typescript
// LINEアプリ内かどうか
const isInClient = liff.isInClient();

// OS判定
const os = liff.getOS(); // 'web', 'ios', 'android'

// デバイス判定
const isApiAvailable = liff.isApiAvailable('shareTargetPicker');
```

## よくあるエラーと対処法

### 1. LIFF IDが無効

```
Error: Invalid LIFF ID
```

**対処法**:
- `apps/web/.env` の `VITE_LIFF_ID` を確認
- LINE Developers ConsoleでLIFF IDをコピーし直す

### 2. CORS エラー

```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**対処法**:
- `apps/server/.env` の `CORS_ORIGIN` にフロントエンドのngrok URLを設定
- サーバーを再起動

### 3. 401 Unauthorized

```
Error: Unauthorized
```

**対処法**:
- LIFFアクセストークンの有効期限切れ
- `liff.login()` を再実行してログインし直す

### 4. ngrok URL変更によるエラー

無料プランでngrokを再起動した場合、以下を更新:
1. LINE DevelopersのLIFF Endpoint URL
2. `apps/web/.env` の `VITE_SERVER_URL`
3. `apps/server/.env` の `BETTER_AUTH_URL` と `CORS_ORIGIN`
4. 開発サーバーを再起動

## ベストプラクティス

### 1. 環境変数の管理

本番環境とngrok環境で異なる設定ファイルを使用:

```bash
# 開発用（ngrok）
apps/web/.env.local
apps/server/.env.local

# 本番用
apps/web/.env.production
apps/server/.env.production
```

### 2. エラーハンドリング

LIFF初期化時のエラーハンドリングを必ず実装:

```typescript
try {
  await liff.init({ liffId: import.meta.env.VITE_LIFF_ID });
} catch (error) {
  console.error('LIFF initialization failed', error);
  // エラー画面を表示
}
```

### 3. ログアウト処理

```typescript
// セッションクリア + LINEログアウト
liff.logout();
window.location.reload();
```

### 4. テスト環境

本番環境とは別に、テスト用のLIFFアプリを作成することを推奨:
- 開発用LIFF ID
- 本番用LIFF ID

## 参考リンク

- [LINE LIFF Documentation](https://developers.line.biz/ja/docs/liff/)
- [LIFF SDK Reference](https://developers.line.biz/ja/reference/liff/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Better-Auth Documentation](https://www.better-auth.com/docs)
