# AI エージェント向けドキュメント (Server アプリケーション)

## アプリケーション概要

補聴器 90 日間貸出プログラムのバックエンド API サーバー。
Hono + tRPC を使用し、Cloudflare Workers 上で動作する高速な API を提供します。

## 技術スタック (Server 固有)

- **フレームワーク**: Hono (軽量 Web フレームワーク)
- **API**: tRPC (型安全な RPC)
- **ランタイム**: Cloudflare Workers
- **データベース**: PostgreSQL (Supabase) + Drizzle ORM
- **認証**: Better-Auth
- **バリデーション**: Zod

## ディレクトリ構造

```
apps/server/
├── src/
│   ├── index.ts          # エントリーポイント (Hono アプリ)
│   ├── trpc.ts           # tRPC サーバー設定
│   ├── middleware/       # ミドルウェア
│   │   ├── cors.ts       # CORS 設定
│   │   └── auth.ts       # 認証ミドルウェア
│   └── utils/            # ユーティリティ関数
│       ├── date.ts       # 日付処理 (JST)
│       └── qr.ts         # QR コード生成
├── wrangler.toml         # Cloudflare Workers 設定
└── package.json
```

## 重要な設計方針 (Server 固有)

### 1. ビジネスロジックの実装場所

**すべての業務ルールはこのサーバーで実装**

- 貸出開始日の決定 (必ず当日)
- 終了日の計算 (開始日 + 90 日)
- 残日数の計算
- 状態遷移の判定 (アンケートタイミング、返却期限など)
- データの整合性チェック

クライアントから送信されるデータは必ず検証し、サーバー側の時刻を正とします。

### 2. 日付・時刻処理の原則

```typescript
// 必ず JST (Asia/Tokyo) で処理
import { TZDate } from "@date-fns/tz";

// 現在の JST 日時を取得
const now = new TZDate(new Date(), "Asia/Tokyo");

// 日付のみを取得 (時刻を無視)
const today = new TZDate(now.getFullYear(), now.getMonth(), now.getDate(), "Asia/Tokyo");

// 90 日後の計算
import { addDays } from "date-fns";
const endDate = addDays(startDate, 90);
```

**重要**:

- データベースには `TIMESTAMPTZ` 型で保存
- `DATE` 型はタイムゾーンなしで保存 (日付のみ)
- クライアントに返す際は ISO 8601 形式 (タイムゾーン付き)

### 3. tRPC ルーターの実装

```typescript
// @packages/api/src/routers/loan.ts の例
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const loanRouter = router({
  // 貸出状態の取得 (認証必須)
  getMyLoanStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    // データベースから取得
    const loan = await ctx.db.query.loans.findFirst({
      where: (loans, { eq }) => eq(loans.userId, userId),
    });

    if (!loan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "貸出情報が見つかりません",
      });
    }

    // 残日数を計算 (サーバー側で実施)
    const now = new TZDate(new Date(), "Asia/Tokyo");
    const remainingDays = differenceInDays(loan.endDate, now);

    return {
      ...loan,
      remainingDays,
      isExpired: remainingDays < 0,
    };
  }),

  // 貸出開始登録 (QR コードスキャン時)
  startLoan: protectedProcedure
    .input(
      z.object({
        qrCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // QR コードの検証
      const qrData = await verifyQRCode(input.qrCode);

      // 開始日は必ず今日 (クライアントからの入力を信用しない)
      const today = new TZDate(new Date(), "Asia/Tokyo");
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // 終了日を計算 (開始日 + 90 日)
      const endDate = addDays(startDate, 90);

      // データベースに保存
      const loan = await ctx.db.insert(loans).values({
        userId: ctx.user.id,
        storeId: qrData.storeId,
        startDate,
        endDate,
        status: "active",
      });

      return loan;
    }),
});
```

### 4. 認証とセキュリティ

#### ユーザー認証 (LINE LIFF)

```typescript
// Better-Auth の設定例
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    // Drizzle の設定
  },
  socialProviders: {
    line: {
      clientId: env.LINE_CHANNEL_ID,
      clientSecret: env.LINE_CHANNEL_SECRET,
    },
  },
});
```

#### 管理者認証 (メール/パスワード)

```typescript
// 管理者専用のプロシージャ
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "管理者権限が必要です",
    });
  }
  return next();
});

export const adminRouter = router({
  listUsers: adminProcedure
    .input(
      z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      // 管理者のみアクセス可能
      const users = await ctx.db.query.users.findMany({
        limit: input.limit,
        offset: (input.page - 1) * input.limit,
      });
      return users;
    }),
});
```

### 5. データベース操作

#### Drizzle ORM の使用

```typescript
import { db } from "@packages/db";
import { loans, users } from "@packages/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// データの取得
const loan = await db.query.loans.findFirst({
  where: eq(loans.id, loanId),
  with: {
    user: true, // リレーション先を含める
    store: true,
  },
});

// データの挿入
await db.insert(loans).values({
  userId: "user-123",
  storeId: "store-456",
  startDate: new Date(),
  endDate: addDays(new Date(), 90),
});

// データの更新
await db.update(loans).set({ status: "completed" }).where(eq(loans.id, loanId));

// データの削除
await db.delete(loans).where(eq(loans.id, loanId));
```

#### トランザクション

```typescript
// 複数の操作をアトミックに実行
await db.transaction(async (tx) => {
  // 貸出情報を更新
  await tx.update(loans).set({ status: "completed" }).where(eq(loans.id, loanId));

  // アンケート結果を保存
  await tx.insert(surveys).values({
    loanId,
    answers: surveyData,
  });
});
```

### 6. エラーハンドリング

```typescript
import { TRPCError } from "@trpc/server";

// 適切なエラーコードを使用
throw new TRPCError({
  code: "NOT_FOUND", // 404
  message: "リソースが見つかりません",
});

throw new TRPCError({
  code: "UNAUTHORIZED", // 401
  message: "認証が必要です",
});

throw new TRPCError({
  code: "FORBIDDEN", // 403
  message: "アクセス権限がありません",
});

throw new TRPCError({
  code: "BAD_REQUEST", // 400
  message: "無効なリクエストです",
});

throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR", // 500
  message: "サーバーエラーが発生しました",
});
```

### 7. バリデーション

Zod を使用した入力検証:

```typescript
import { z } from "zod";

// スキーマ定義
const createReservationSchema = z.object({
  storeId: z.string().uuid(),
  dateTime: z.string().datetime(), // ISO 8601
  notes: z.string().max(500).optional(),
});

// プロシージャでの使用
export const reservationRouter = router({
  create: protectedProcedure.input(createReservationSchema).mutation(async ({ ctx, input }) => {
    // input は型安全に検証済み
    const reservation = await ctx.db.insert(reservations).values({
      userId: ctx.user.id,
      storeId: input.storeId,
      dateTime: new Date(input.dateTime),
      notes: input.notes,
    });
    return reservation;
  }),
});
```

## 開発時の注意事項 (Server 固有)

### 環境変数

`.env` ファイル (ローカル開発時):

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
CORS_ORIGIN=http://localhost:3001
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000
LINE_CHANNEL_ID=...
LINE_CHANNEL_SECRET=...
```

`wrangler.toml` (Cloudflare Workers):

```toml
name = "usage-support-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
CORS_ORIGIN = "http://localhost:3001"
BETTER_AUTH_URL = "http://localhost:3000"

# シークレットは wrangler secret put コマンドで設定
# wrangler secret put DATABASE_URL
# wrangler secret put BETTER_AUTH_SECRET
# wrangler secret put LINE_CHANNEL_SECRET
```

### ローカル開発

```bash
# このディレクトリで開発サーバーを起動
pnpm run dev

# Cloudflare Workers エミュレータが起動
# http://localhost:3000 でアクセス可能
```

### デプロイ

```bash
# 開発環境へデプロイ
pnpm run dev

# 本番環境へデプロイ
pnpm run deploy

# デプロイされた Workers を削除
pnpm run destroy
```

### データベースマイグレーション

```bash
# スキーマをDBにプッシュ (開発時)
pnpm run db:push

# マイグレーションファイル生成
pnpm run db:generate

# マイグレーション実行
pnpm run db:migrate
```

## パフォーマンス最適化

### 1. クエリの最適化

```typescript
// 必要なフィールドのみ選択
const user = await db
  .select({
    id: users.id,
    name: users.name,
    email: users.email,
  })
  .from(users)
  .where(eq(users.id, userId));

// リレーションの効率的な取得
const loan = await db.query.loans.findFirst({
  where: eq(loans.id, loanId),
  with: {
    user: {
      columns: {
        id: true,
        name: true,
        // パスワードなど不要なフィールドは除外
      },
    },
  },
});
```

### 2. キャッシング

Cloudflare Workers の KV または R2 を活用:

```typescript
// KV への保存
await env.KV.put(`user:${userId}`, JSON.stringify(userData), {
  expirationTtl: 3600, // 1時間
});

// KV からの取得
const cached = await env.KV.get(`user:${userId}`);
if (cached) {
  return JSON.parse(cached);
}
```

### 3. バッチ処理

```typescript
// 複数のクエリをまとめて実行
const [loans, surveys, reservations] = await Promise.all([
  db.query.loans.findMany({ where: eq(loans.userId, userId) }),
  db.query.surveys.findMany({ where: eq(surveys.userId, userId) }),
  db.query.reservations.findMany({ where: eq(reservations.userId, userId) }),
]);
```

## テスト

### ユニットテスト (Vitest)

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { calculateRemainingDays } from "./date";

describe("calculateRemainingDays", () => {
  it("should calculate remaining days correctly", () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-04-01"); // 90日後
    const now = new Date("2024-02-01");

    const remaining = calculateRemainingDays(endDate, now);
    expect(remaining).toBe(60);
  });
});
```

### 統合テスト

```typescript
import { describe, it, expect } from "vitest";
import { appRouter } from "./trpc";

describe("loanRouter", () => {
  it("should get loan status", async () => {
    const caller = appRouter.createCaller({
      user: { id: "user-123" },
      db,
    });

    const result = await caller.loan.getMyLoanStatus();
    expect(result).toHaveProperty("remainingDays");
  });
});
```

## セキュリティチェックリスト

- [ ] すべての入力を Zod で検証
- [ ] 認証が必要なエンドポイントは `protectedProcedure` を使用
- [ ] 管理者専用エンドポイントは `adminProcedure` を使用
- [ ] SQL インジェクション対策 (Drizzle ORM が自動対応)
- [ ] CORS 設定を適切に設定
- [ ] 環境変数に機密情報を保存 (コードにハードコードしない)
- [ ] レート制限の実装 (Cloudflare の機能を活用)
- [ ] ログに機密情報を出力しない

## ロギング

```typescript
// 構造化ログ
console.log(
  JSON.stringify({
    level: "info",
    message: "Loan created",
    loanId: loan.id,
    userId: ctx.user.id,
    timestamp: new Date().toISOString(),
  })
);

// エラーログ
console.error(
  JSON.stringify({
    level: "error",
    message: "Failed to create loan",
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  })
);
```

## 参考リンク

- [Hono ドキュメント](https://hono.dev/)
- [tRPC ドキュメント](https://trpc.io/)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
- [Better-Auth ドキュメント](https://better-auth.com/)
- [プロジェクトルートの AGENTS.md](../../AGENTS.md)
