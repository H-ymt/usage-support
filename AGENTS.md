# AI エージェント向けドキュメント

## プロジェクト概要

補聴器の 90 日間貸出プログラムを管理する LINE ミニアプリシステム。
店頭での貸出開始登録から 90 日間の進捗管理、アンケート回収、来店予約までを一貫してサポートします。

## 技術スタック

- **フロントエンド**: TanStack Start (React SSR) + TailwindCSS + shadcn/ui
- **バックエンド**: Hono + tRPC (Cloudflare Workers 上で実行)
- **データベース**: PostgreSQL (Supabase)
- **ORM**: Drizzle
- **認証**: Better-Auth (ユーザー: LINE LIFF 認証, 管理者: メール/パスワード)
- **モノレポ管理**: Turborepo + pnpm workspaces
- **コード品質**: Biome (lint + format)

## プロジェクト構造

```
usage-support/
├── apps/
│   ├── web/         # フロントエンド (TanStack Start)
│   └── server/      # バックエンド API (Hono + Workers)
├── packages/
│   ├── api/         # tRPC API定義・ビジネスロジック層
│   ├── auth/        # Better-Auth設定
│   ├── db/          # Drizzleスキーマ・DB接続
│   └── config/      # 共通TypeScript設定
└── docs/
    ├── requirements/ # 要件定義書
    └── design/       # 設計書
```

### アーキテクチャの重要な原則

1. **業務ルールはすべてサーバー側 (Cloudflare Workers) で実施**

   - 貸出開始日の確定、90 日計算、状態遷移などの重要な業務判定はフロントエンドで行わない
   - クライアントから送信される日時・日付は信用せず、サーバー側の時刻 (JST) を正とする

2. **モノレポ構成の依存関係**

   - `apps/web` → `packages/api`, `packages/auth`
   - `apps/server` → `packages/api`, `packages/auth`, `packages/db`
   - `packages/api` → `packages/auth`, `packages/db`
   - 各パッケージは独立して開発可能

3. **tRPC による型安全な API**
   - `packages/api` で定義した tRPC ルーターがフロントエンドとバックエンドで共有される
   - `protectedProcedure` を使用して認証済みユーザーのみアクセス可能なエンドポイントを定義

## よく使うコマンド

### 開発

```bash
# 全体の開発サーバー起動 (web + server 同時起動)
pnpm run dev

# webのみ起動 (http://localhost:3001)
pnpm run dev:web

# serverのみ起動 (http://localhost:3000)
pnpm run dev:server
```

### データベース

```bash
# スキーマをDBにプッシュ (開発時)
pnpm run db:push

# マイグレーションファイル生成
pnpm run db:generate

# マイグレーション実行
pnpm run db:migrate

# Drizzle Studio起動 (DB管理UI)
pnpm run db:studio
```

#### Supabase CLI (ローカル開発環境)

```bash
# ローカルSupabaseスタック起動 (PostgreSQL, Auth, Storage, etc.)
pnpm run supabase:start

# ローカルSupabaseスタック停止
pnpm run supabase:stop

# ローカルSupabaseステータス確認
pnpm run supabase:status

# ローカルDBリセット (マイグレーション再実行)
pnpm run supabase:reset

# TypeScript型定義生成 (ローカルDBスキーマから)
pnpm run supabase:types
```

**ローカル Supabase 接続情報** (起動後に表示されます):

- API URL: `http://127.0.0.1:54321`
- DB URL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio URL: `http://127.0.0.1:54323`
- Inbucket URL: `http://127.0.0.1:54324` (メールテスト)

### コード品質

```bash
# Biomeでフォーマット + lint実行 (自動修正)
pnpm run check

# Biomeでlintのみ実行
pnpm run lint

# Biomeでフォーマットのみ実行
pnpm run format

# 型チェック
pnpm run check-types
```

### ビルド

```bash
# 全アプリケーションのビルド
pnpm run build
```

### デプロイ (Cloudflare Workers)

```bash
# serverの開発環境デプロイ
cd apps/server && pnpm run dev

# serverの本番デプロイ
cd apps/server && pnpm run deploy

# serverの削除
cd apps/server && pnpm run destroy
```

## 重要な設計方針

### 貸出開始登録の「当日固定」ルール

- 貸出開始日は必ず登録当日に固定され、過去や未来の日付を指定できない
- 店頭 QR コードから登録する際、サーバー側で自動的に当日の日付を設定する
- 終了日は開始日 + 90 日として自動計算される
- このルールにより、店舗スタッフの入力ミスや認識ズレを技術的に防止

### タイムゾーン管理

- すべての日時処理は JST (Asia/Tokyo) を基準とする
- データベースには `TIMESTAMPTZ` (タイムゾーン付き) を使用
- `DATE` 型はタイムゾーンなし (日付のみ)

### 認証フロー

- **ユーザー**: LINE LIFF 認証 → `user_key` (チャネル固有のユーザー識別子) で DB 管理
- **管理者**: Supabase Auth (メール/パスワード) → `admin_id` で DB 管理

### データアクセス制御

- Supabase RLS (Row Level Security) ポリシーを使用
- ユーザーは自分のデータのみアクセス可能
- 管理者は service_role キー経由で全データにアクセス可能

## 環境変数

### apps/web/.env

```
SERVER_URL=http://localhost:3000  # API サーバーのURL
```

### apps/server/.env

```
DATABASE_URL=postgresql://...  # PostgreSQL接続文字列
CORS_ORIGIN=http://localhost:3001  # フロントエンドのURL
BETTER_AUTH_SECRET=...  # Better-Auth用のシークレット
BETTER_AUTH_URL=http://localhost:3000  # 認証エンドポイントのベースURL
```

## 主要な機能要件

1. **ユーザー基本情報登録**: 氏名・電話番号・メールアドレス
2. **貸出開始登録**: 店頭 QR コード読み取り → 当日から 90 日間の貸出開始
3. **ダッシュボード**: 残日数・返却予定日・次回アンケート・予約情報の表示
4. **使用状況アンケート**: 30 日・60 日・90 日のタイミングで実施
5. **来店予約**: 店舗選択・日時選択・予約確定・変更・キャンセル
6. **通知**: LINE メッセージでのリマインド (任意)
7. **管理画面**: ユーザー検索・詳細閲覧・QR コード管理

## 開発時の注意事項

### コードスタイル

- Biome の設定に従う (自動フォーマット・lint が有効)
- コミット前に `pnpm run check` を実行 (Husky で pre-commit hook が設定済み)

### データベーススキーマの変更

**Drizzle によるスキーマ管理** (推奨):

1. `packages/db/src/schema/` でスキーマを修正
2. `pnpm run db:generate` でマイグレーションファイル生成
3. `pnpm run db:push` または `pnpm run db:migrate` で DB 反映

**Supabase CLI との統合**:

- ローカル開発では `pnpm run supabase:start` で Supabase スタックを起動
- Drizzle で生成したマイグレーションはリモート Supabase DB に反映
- ローカル Supabase DB からの型生成: `pnpm run supabase:types`
- ローカル DB リセット: `pnpm run supabase:reset`

**開発フロー例**:

1. ローカル Supabase 起動: `pnpm run supabase:start`
2. スキーマ修正: `packages/db/src/schema/*.ts`
3. マイグレーション生成: `pnpm run db:generate`
4. ローカル DB に反映: `pnpm run db:push` (DATABASE_URL をローカル Supabase に向ける)
5. 型定義生成: `pnpm run supabase:types`

### API エンドポイントの追加

1. `packages/api/src/routers/` に新しいルーターを作成または既存ルーターに追加
2. `packages/api/src/routers/index.ts` でルーターをマージ
3. フロントエンド側では自動的に型付きクライアントが利用可能

## 設計作業ルール

設計作業を依頼された場合は、以下のルールに従ってファイルを作成すること：

- ファイル名: `YYYYMMDD_HHMM_{日本語の作業内容}.md`
- 保存場所: `docs/` 以下
- フォーマット: Markdown

例: `docs/20250815_1430_ユーザー認証システム設計.md`

## 参考ドキュメント

- [要件定義書](./docs/requirements/要件定義書.md)
- [データベース設計書](./docs/design/データベース設計書.md)
- [API 設計書](./docs/design/API設計書.md)

## GitHub 操作ルール

- ユーザーから PR を出して、と言われたときは、現在の作業のフィーチャーブランチを切りコミットを行ってから PR を出すようにする
- ユーザーから commit して、と言われたときは、必ず `git status`や`git diff`を行い、変更内容を確認してから適切な粒度でコミットを行うようにする
- コミットメッセージは conventional commit 形式でコミットメッセージを作成し、日本語で作成するようにする
- 重要: ユーザーから明示的な指示があるまでコミットしないこと
- develop や main への直接 push は禁止です
- PR 作成時は `gh pr create` コマンドに `--base` オプションを付けず、デフォルトのベースブランチを使用してください
