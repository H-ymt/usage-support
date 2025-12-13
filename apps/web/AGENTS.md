# AI エージェント向けドキュメント (Web アプリケーション)

## アプリケーション概要

補聴器 90 日間貸出プログラムの LINE ミニアプリフロントエンド。
TanStack Start を使用した React SSR アプリケーションで、ユーザー向けの UI を提供します。

## 技術スタック (Web 固有)

- **フレームワーク**: TanStack Start (React SSR)
- **スタイリング**: TailwindCSS + shadcn/ui
- **API クライアント**: tRPC Client
- **認証**: Better-Auth Client + LINE LIFF SDK
- **状態管理**: TanStack Router の状態管理機能
- **フォーム管理**: TanStack Form (推奨)

## ディレクトリ構造

```
apps/web/
├── app/
│   ├── routes/          # ルート定義 (TanStack Router)
│   │   ├── __root.tsx   # ルートレイアウト
│   │   ├── index.tsx    # トップページ (/)
│   │   ├── dashboard/   # ダッシュボード (/dashboard)
│   │   ├── profile/     # プロフィール (/profile)
│   │   ├── survey/      # アンケート (/survey)
│   │   ├── reservation/ # 予約 (/reservation)
│   │   └── admin/       # 管理画面 (/admin)
│   ├── components/      # React コンポーネント
│   │   ├── ui/          # shadcn/ui コンポーネント
│   │   └── features/    # 機能別コンポーネント
│   ├── hooks/           # カスタム React Hooks
│   ├── utils/           # ユーティリティ関数
│   └── lib/             # ライブラリ設定
│       ├── trpc.ts      # tRPC クライアント設定
│       └── liff.ts      # LINE LIFF SDK 設定
├── public/              # 静的ファイル
└── app.config.ts        # TanStack Start 設定
```

## 重要な設計方針 (Web 固有)

### 1. サーバーサイドレンダリング (SSR)

- TanStack Start は SSR をデフォルトでサポート
- 初回ロード時のパフォーマンスと SEO を考慮
- `createFileRoute` でルートコンポーネントを定義
- `loader` 関数でサーバーサイドのデータ取得を実装

### 2. クライアント側の業務ロジック制限

**重要**: フロントエンドでは業務ロジックを実装しない

- 日付計算 (残日数、終了日など) は表示のみ。計算はサーバー側で実施
- 状態遷移の判定はサーバー API の結果を信頼
- バリデーションは UX 向上のため実施するが、最終的な検証はサーバー側

### 3. LINE LIFF 認証

```typescript
// LIFF 初期化の例
import liff from '@line/liff';

// LIFF SDK の初期化
await liff.init({ liffId: 'YOUR_LIFF_ID' });

// ログイン状態の確認
if (!liff.isLoggedIn()) {
  liff.login();
}

// アクセストークンの取得 (API 呼び出し時に使用)
const accessToken = liff.getAccessToken();
```

### 4. tRPC クライアントの使用

```typescript
import { trpc } from '~/lib/trpc';

// ルートコンポーネント内での使用例
export const Route = createFileRoute('/dashboard')({
  loader: async () => {
    // サーバーサイドでのデータ取得
    const data = await trpc.loan.getMyLoanStatus.query();
    return { loanStatus: data };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { loanStatus } = Route.useLoaderData();
  // クライアントサイドでのデータ取得 (リアルタイム更新など)
  const { data, refetch } = trpc.loan.getMyLoanStatus.useQuery();

  return <div>{/* UI */}</div>;
}
```

### 5. shadcn/ui コンポーネントの活用

- UI コンポーネントは `app/components/ui/` に配置
- `pnpm dlx shadcn@latest add <component>` でコンポーネントを追加
- カスタマイズが必要な場合は直接ファイルを編集可能

### 6. レスポンシブデザイン

- モバイルファーストで設計 (LINE アプリ内で使用)
- TailwindCSS のブレークポイントを活用 (`sm:`, `md:`, `lg:`)
- タッチ操作を考慮した UI (ボタンサイズ、タップ領域など)

## 開発時の注意事項 (Web 固有)

### 環境変数

`.env` ファイルに以下を設定:

```
SERVER_URL=http://localhost:3000  # API サーバーの URL
VITE_LIFF_ID=...                  # LINE LIFF ID
```

### ローカル開発

```bash
# このディレクトリで開発サーバーを起動
pnpm run dev

# ブラウザで http://localhost:3001 にアクセス
```

### ビルド

```bash
# 本番ビルド
pnpm run build

# ビルド結果のプレビュー
pnpm run start
```

### コンポーネント作成のベストプラクティス

1. **機能別にコンポーネントを整理**
   ```
   app/components/features/
   ├── loan/           # 貸出関連
   ├── survey/         # アンケート関連
   ├── reservation/    # 予約関連
   └── admin/          # 管理機能関連
   ```

2. **再利用可能なコンポーネントは ui/ に配置**
   - shadcn/ui のコンポーネントをベースに拡張
   - プロジェクト固有の UI コンポーネントも ui/ に配置可能

3. **ビジネスロジックは Hooks に分離**
   ```typescript
   // app/hooks/useLoanStatus.ts
   export function useLoanStatus() {
     const { data, isLoading } = trpc.loan.getMyLoanStatus.useQuery();

     // 表示用の計算のみ (サーバーから取得したデータを整形)
     const remainingDays = data?.remainingDays ?? 0;
     const isExpiringSoon = remainingDays <= 7;

     return { data, isLoading, remainingDays, isExpiringSoon };
   }
   ```

### エラーハンドリング

- tRPC のエラーは `TRPCClientError` として throw される
- `ErrorBoundary` を使用してエラーをキャッチ
- ユーザーフレンドリーなエラーメッセージを表示

```typescript
import { ErrorBoundary } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  errorComponent: ({ error }) => {
    return (
      <div>
        <h1>エラーが発生しました</h1>
        <p>{error.message}</p>
      </div>
    );
  },
});
```

### 型安全性

- tRPC により API のレスポンス型が自動的に推論される
- `@packages/api` で定義した型を直接インポート可能
- TypeScript の厳密モードを有効化 (`strict: true`)

## ルーティング

TanStack Router のファイルベースルーティングを使用:

```
app/routes/
├── __root.tsx              → /
├── index.tsx               → /
├── dashboard/
│   └── index.tsx           → /dashboard
├── profile/
│   └── index.tsx           → /profile
├── survey/
│   ├── index.tsx           → /survey
│   └── $surveyId.tsx       → /survey/:surveyId
├── reservation/
│   ├── index.tsx           → /reservation
│   ├── new.tsx             → /reservation/new
│   └── $reservationId.tsx  → /reservation/:reservationId
└── admin/
    ├── index.tsx           → /admin
    ├── users/
    │   └── index.tsx       → /admin/users
    └── qr-codes/
        └── index.tsx       → /admin/qr-codes
```

## 認証フロー (ユーザー側)

1. LINE LIFF SDK で認証状態を確認
2. 未認証の場合は `liff.login()` でログイン画面へ
3. 認証後、アクセストークンを取得
4. tRPC クライアントのヘッダーにトークンを設定
5. 保護されたルートへアクセス可能

## UI/UX ガイドライン

### デザインシステム

- TailwindCSS の標準色を使用
- shadcn/ui のコンポーネントを活用
- 一貫性のある余白 (`spacing`) とタイポグラフィを維持

### アクセシビリティ

- セマンティック HTML を使用
- キーボードナビゲーションをサポート
- ARIA 属性を適切に設定
- コントラスト比を確保 (WCAG 2.1 AA レベル)

### パフォーマンス

- 画像の最適化 (`next/image` 相当の機能を活用)
- コード分割 (ルート単位で自動分割)
- 遅延ローディング (React.lazy, Suspense)

## 参考リンク

- [TanStack Start ドキュメント](https://tanstack.com/start)
- [TanStack Router ドキュメント](https://tanstack.com/router)
- [shadcn/ui ドキュメント](https://ui.shadcn.com/)
- [LINE LIFF SDK ドキュメント](https://developers.line.biz/ja/docs/liff/)
- [プロジェクトルートの AGENTS.md](../../AGENTS.md)
