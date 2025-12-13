# API 設計書

## 概要

本ドキュメントは「90 日間貸出プロジェクト」LINE ミニアプリの API 設計を定義する。

- **実行環境**: Cloudflare Workers
- **形式**: REST API（JSON）
- **認証**: LINE LIFF 認証（ユーザー向け）、Supabase Auth（管理者向け）

---

## 目次

1. [共通仕様](#1-共通仕様)
2. [ユーザー向け API](#2-ユーザー向けapi)
3. [管理者向け API](#3-管理者向けapi)
4. [Webhook](#4-webhook)

---

## 1. 共通仕様

### 1.1 ベース URL

```
ユーザー向け: https://api.example.com/v1
管理者向け:   https://api.example.com/admin/v1
```

### 1.2 認証

#### ユーザー向け API

LIFF から取得したアクセストークンを Authorization ヘッダーに設定する。

```
Authorization: Bearer {LIFF_ACCESS_TOKEN}
```

サーバー側で LINE API を使用してトークンを検証し、`user_key`を取得する。

#### 管理者向け API

Supabase Auth のセッショントークンを使用する。

```
Authorization: Bearer {SUPABASE_ACCESS_TOKEN}
```

### 1.3 リクエスト形式

- Content-Type: `application/json`
- 文字エンコーディング: UTF-8

### 1.4 レスポンス形式

#### 成功時

```json
{
  "success": true,
  "data": { ... }
}
```

#### エラー時

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 1.5 エラーコード一覧

| HTTP ステータス | コード              | 説明                      |
| --------------- | ------------------- | ------------------------- |
| 400             | INVALID_REQUEST     | リクエスト形式が不正      |
| 400             | VALIDATION_ERROR    | バリデーションエラー      |
| 401             | UNAUTHORIZED        | 認証が必要                |
| 401             | TOKEN_EXPIRED       | トークンの有効期限切れ    |
| 403             | FORBIDDEN           | アクセス権限なし          |
| 404             | NOT_FOUND           | リソースが見つからない    |
| 409             | CONFLICT            | 競合（重複登録など）      |
| 409             | LOAN_ALREADY_ACTIVE | 既に進行中の貸出が存在    |
| 409             | TOKEN_ALREADY_USED  | トークンは使用済み        |
| 410             | TOKEN_EXPIRED       | QR トークンの有効期限切れ |
| 422             | PROFILE_REQUIRED    | 基本情報登録が必要        |
| 500             | INTERNAL_ERROR      | サーバー内部エラー        |

### 1.6 日時形式

- リクエスト/レスポンスともに ISO 8601 形式
- タイムゾーン: UTC（`Z`サフィックス）
- 例: `2025-01-15T09:00:00Z`

---

## 2. ユーザー向け API

### 2.1 ユーザー情報

#### GET /users/me

現在のユーザー情報を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": {
    "user_key": "U1234567890abcdef",
    "name": "山田太郎",
    "phone": "090-1234-5678",
    "email": "yamada@example.com",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

未登録の場合は 404 を返す。

---

#### POST /users/me

ユーザー基本情報を登録する。

**リクエスト**

```json
{
  "name": "山田太郎",
  "phone": "090-1234-5678",
  "email": "yamada@example.com"
}
```

| フィールド | 型     | 必須 | 説明                 |
| ---------- | ------ | ---- | -------------------- |
| name       | string | Yes  | 氏名（100 文字以内） |
| phone      | string | Yes  | 電話番号             |
| email      | string | No   | メールアドレス       |

**レスポンス**

```json
{
  "success": true,
  "data": {
    "user_key": "U1234567890abcdef",
    "name": "山田太郎",
    "phone": "090-1234-5678",
    "email": "yamada@example.com",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

#### PUT /users/me

ユーザー基本情報を更新する。

**リクエスト**

```json
{
  "name": "山田太郎",
  "phone": "090-1234-5678",
  "email": "yamada@example.com"
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "user_key": "U1234567890abcdef",
    "name": "山田太郎",
    "phone": "090-1234-5678",
    "email": "yamada@example.com",
    "updated_at": "2025-01-15T00:00:00Z"
  }
}
```

---

### 2.2 貸出

#### GET /loans/current

現在進行中の貸出情報を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": {
    "loan_id": "550e8400-e29b-41d4-a716-446655440000",
    "store": {
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "渋谷店"
    },
    "start_date": "2025-01-01",
    "end_date": "2025-04-01",
    "remaining_days": 75,
    "status": "active",
    "surveys": {
      "day30": { "available": false, "answered": false, "available_from": "2025-01-31" },
      "day60": { "available": false, "answered": false, "available_from": "2025-03-02" },
      "day90": { "available": false, "answered": false, "available_from": "2025-04-01" }
    },
    "next_reservation": {
      "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
      "store_name": "渋谷店",
      "reserved_at": "2025-01-20T10:00:00Z"
    }
  }
}
```

貸出がない場合:

```json
{
  "success": true,
  "data": null
}
```

---

#### POST /loans/start

貸出を開始する（QR トークン経由）。

**リクエスト**

```json
{
  "token": "abc123xyz789"
}
```

| フィールド | 型     | 必須 | 説明                            |
| ---------- | ------ | ---- | ------------------------------- |
| token      | string | Yes  | QR コードから読み取ったトークン |

**レスポンス**

```json
{
  "success": true,
  "data": {
    "loan_id": "550e8400-e29b-41d4-a716-446655440000",
    "store": {
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "渋谷店"
    },
    "start_date": "2025-01-15",
    "end_date": "2025-04-15"
  }
}
```

**エラーケース**

| コード              | 条件                   |
| ------------------- | ---------------------- |
| PROFILE_REQUIRED    | 基本情報未登録         |
| LOAN_ALREADY_ACTIVE | 既に進行中の貸出が存在 |
| TOKEN_EXPIRED       | トークン有効期限切れ   |
| TOKEN_ALREADY_USED  | トークン使用済み       |
| NOT_FOUND           | トークンが存在しない   |

---

#### GET /loans/history

過去の貸出履歴を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": [
    {
      "loan_id": "550e8400-e29b-41d4-a716-446655440000",
      "store_name": "渋谷店",
      "start_date": "2024-10-01",
      "end_date": "2024-12-30",
      "status": "ended"
    }
  ]
}
```

---

### 2.3 アンケート

#### GET /surveys

現在の貸出に関連するアンケート一覧を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": [
    {
      "survey_id": "880e8400-e29b-41d4-a716-446655440000",
      "type": "30",
      "available": true,
      "answered": false,
      "available_from": "2025-01-31",
      "available_until": "2025-02-07"
    },
    {
      "survey_id": "990e8400-e29b-41d4-a716-446655440000",
      "type": "60",
      "available": false,
      "answered": false,
      "available_from": "2025-03-02"
    }
  ]
}
```

---

#### GET /surveys/:surveyId

アンケート詳細を取得する（回答済みの場合は回答内容も含む）。

**レスポンス（未回答）**

```json
{
  "success": true,
  "data": {
    "survey_id": "880e8400-e29b-41d4-a716-446655440000",
    "type": "30",
    "questions": [
      {
        "key": "q1_daily_use",
        "question": "補聴器を毎日装着していますか？",
        "type": "single_choice",
        "options": ["yes", "sometimes", "rarely"],
        "required": true
      },
      {
        "key": "q2_hours",
        "question": "1日あたりの平均装着時間を教えてください",
        "type": "single_choice",
        "options": ["8_plus", "4_to_8", "under_4"],
        "required": true
      },
      {
        "key": "q3_satisfaction",
        "question": "音の聞こえ方に満足していますか？",
        "type": "rating",
        "min": 1,
        "max": 5,
        "required": true
      },
      {
        "key": "q5_concerns",
        "question": "困っていることがあればお聞かせください",
        "type": "text",
        "required": false
      }
    ],
    "answered": false
  }
}
```

**レスポンス（回答済み）**

```json
{
  "success": true,
  "data": {
    "survey_id": "880e8400-e29b-41d4-a716-446655440000",
    "type": "30",
    "answered": true,
    "answered_at": "2025-02-01T10:30:00Z",
    "answers": {
      "q1_daily_use": "yes",
      "q2_hours": "8_plus",
      "q3_satisfaction": 4,
      "q5_concerns": ""
    }
  }
}
```

---

#### POST /surveys/:surveyId/answer

アンケートに回答する。

**リクエスト**

```json
{
  "answers": {
    "q1_daily_use": "yes",
    "q2_hours": "8_plus",
    "q3_satisfaction": 4,
    "q4_discomfort": "none",
    "q5_concerns": "特にありません"
  }
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "survey_id": "880e8400-e29b-41d4-a716-446655440000",
    "answered_at": "2025-02-01T10:30:00Z"
  }
}
```

---

### 2.4 予約

#### GET /stores

予約可能な店舗一覧を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": [
    {
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "渋谷店",
      "address": "東京都渋谷区道玄坂1-1-1",
      "phone": "03-1234-5678",
      "business_hours": "10:00-19:00"
    },
    {
      "store_id": "661e8400-e29b-41d4-a716-446655440000",
      "name": "新宿店",
      "address": "東京都新宿区新宿3-1-1",
      "phone": "03-2345-6789",
      "business_hours": "10:00-20:00"
    }
  ]
}
```

---

#### GET /stores/:storeId/slots

指定店舗の予約可能枠を取得する。

**クエリパラメータ**

| パラメータ | 型     | 必須 | 説明                    |
| ---------- | ------ | ---- | ----------------------- |
| date       | string | Yes  | 日付（YYYY-MM-DD 形式） |

**リクエスト例**

```
GET /stores/660e8400-e29b-41d4-a716-446655440000/slots?date=2025-01-20
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "date": "2025-01-20",
    "slots": [
      { "time": "10:00", "available": true },
      { "time": "10:30", "available": true },
      { "time": "11:00", "available": false },
      { "time": "11:30", "available": true }
    ]
  }
}
```

---

#### GET /reservations

自分の予約一覧を取得する。

**クエリパラメータ**

| パラメータ | 型     | 必須 | 説明                                          |
| ---------- | ------ | ---- | --------------------------------------------- |
| status     | string | No   | フィルタ（confirmed / cancelled / completed） |

**レスポンス**

```json
{
  "success": true,
  "data": [
    {
      "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
      "store": {
        "store_id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "渋谷店",
        "address": "東京都渋谷区道玄坂1-1-1"
      },
      "reserved_at": "2025-01-20T10:00:00Z",
      "status": "confirmed",
      "created_at": "2025-01-15T12:00:00Z"
    }
  ]
}
```

---

#### POST /reservations

予約を作成する。

**リクエスト**

```json
{
  "store_id": "660e8400-e29b-41d4-a716-446655440000",
  "reserved_at": "2025-01-20T10:00:00Z"
}
```

| フィールド  | 型     | 必須 | 説明                 |
| ----------- | ------ | ---- | -------------------- |
| store_id    | string | Yes  | 店舗 ID（UUID）      |
| reserved_at | string | Yes  | 予約日時（ISO 8601） |

**レスポンス**

```json
{
  "success": true,
  "data": {
    "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
    "store": {
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "渋谷店"
    },
    "reserved_at": "2025-01-20T10:00:00Z",
    "status": "confirmed"
  }
}
```

---

#### PUT /reservations/:reservationId

予約を変更する。

**リクエスト**

```json
{
  "store_id": "661e8400-e29b-41d4-a716-446655440000",
  "reserved_at": "2025-01-21T14:00:00Z"
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
    "store": {
      "store_id": "661e8400-e29b-41d4-a716-446655440000",
      "name": "新宿店"
    },
    "reserved_at": "2025-01-21T14:00:00Z",
    "status": "confirmed"
  }
}
```

---

#### DELETE /reservations/:reservationId

予約をキャンセルする。

**レスポンス**

```json
{
  "success": true,
  "data": {
    "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "cancelled_at": "2025-01-16T09:00:00Z"
  }
}
```

---

## 3. 管理者向け API

### 3.1 認証

#### POST /admin/v1/auth/login

管理者ログイン（Supabase Auth 経由）。

**リクエスト**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "v1.xxx...",
    "expires_in": 3600,
    "admin": {
      "admin_id": "aa0e8400-e29b-41d4-a716-446655440000",
      "email": "admin@example.com",
      "name": "管理者",
      "role": "admin"
    }
  }
}
```

---

### 3.2 ユーザー管理

#### GET /admin/v1/users

ユーザー一覧を取得する。

**クエリパラメータ**

| パラメータ | 型     | 必須 | 説明                                   |
| ---------- | ------ | ---- | -------------------------------------- |
| q          | string | No   | 検索キーワード（氏名/電話/メール）     |
| page       | number | No   | ページ番号（デフォルト: 1）            |
| limit      | number | No   | 1 ページあたりの件数（デフォルト: 20） |

**レスポンス**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_key": "U1234567890abcdef",
        "name": "山田太郎",
        "phone": "090-1234-5678",
        "email": "yamada@example.com",
        "current_loan": {
          "status": "active",
          "remaining_days": 45
        },
        "created_at": "2025-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

---

#### GET /admin/v1/users/:userKey

ユーザー詳細を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": {
    "user_key": "U1234567890abcdef",
    "name": "山田太郎",
    "phone": "090-1234-5678",
    "email": "yamada@example.com",
    "created_at": "2025-01-01T00:00:00Z",
    "loans": [
      {
        "loan_id": "550e8400-e29b-41d4-a716-446655440000",
        "store_name": "渋谷店",
        "start_date": "2025-01-01",
        "end_date": "2025-04-01",
        "status": "active",
        "surveys": [
          { "type": "30", "answered": true, "answered_at": "2025-01-31T10:00:00Z" },
          { "type": "60", "answered": false },
          { "type": "90", "answered": false }
        ]
      }
    ],
    "reservations": [
      {
        "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
        "store_name": "渋谷店",
        "reserved_at": "2025-01-20T10:00:00Z",
        "status": "completed"
      }
    ]
  }
}
```

---

### 3.3 店舗管理

#### GET /admin/v1/stores

店舗一覧を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": [
    {
      "store_id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "渋谷店",
      "address": "東京都渋谷区道玄坂1-1-1",
      "phone": "03-1234-5678",
      "business_hours": "10:00-19:00",
      "is_active": true,
      "active_loans_count": 25
    }
  ]
}
```

---

### 3.4 QR トークン管理

#### GET /admin/v1/stores/:storeId/tokens

店舗の QR トークン一覧を取得する。

**レスポンス**

```json
{
  "success": true,
  "data": [
    {
      "token_id": "tt0e8400-e29b-41d4-a716-446655440000",
      "token": "abc123xyz789",
      "expires_at": "2025-01-16T00:00:00Z",
      "is_expired": false,
      "used_at": null,
      "used_by": null,
      "created_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

---

#### POST /admin/v1/stores/:storeId/tokens

新しい QR トークンを発行する。

**リクエスト**

```json
{
  "expires_in_hours": 24
}
```

| フィールド       | 型     | 必須 | 説明                       |
| ---------------- | ------ | ---- | -------------------------- |
| expires_in_hours | number | No   | 有効時間（デフォルト: 24） |

**レスポンス**

```json
{
  "success": true,
  "data": {
    "token_id": "tt0e8400-e29b-41d4-a716-446655440000",
    "token": "abc123xyz789",
    "expires_at": "2025-01-16T00:00:00Z",
    "qr_code_url": "https://api.example.com/qr/abc123xyz789.png"
  }
}
```

---

### 3.5 予約管理

#### GET /admin/v1/reservations

予約一覧を取得する。

**クエリパラメータ**

| パラメータ | 型     | 必須 | 説明                         |
| ---------- | ------ | ---- | ---------------------------- |
| store_id   | string | No   | 店舗でフィルタ               |
| date       | string | No   | 日付でフィルタ（YYYY-MM-DD） |
| status     | string | No   | ステータスでフィルタ         |
| page       | number | No   | ページ番号                   |
| limit      | number | No   | 件数                         |

**レスポンス**

```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
        "user": {
          "user_key": "U1234567890abcdef",
          "name": "山田太郎",
          "phone": "090-1234-5678"
        },
        "store": {
          "store_id": "660e8400-e29b-41d4-a716-446655440000",
          "name": "渋谷店"
        },
        "reserved_at": "2025-01-20T10:00:00Z",
        "status": "confirmed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "total_pages": 3
    }
  }
}
```

---

#### PUT /admin/v1/reservations/:reservationId/complete

予約を完了にする。

**レスポンス**

```json
{
  "success": true,
  "data": {
    "reservation_id": "770e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "completed_at": "2025-01-20T10:30:00Z"
  }
}
```

---

## 4. Webhook

### 4.1 LINE Messaging API Webhook

LINE Messaging API からの Webhook を受け取る。

**エンドポイント**

```
POST /webhook/line
```

**用途**

- 友だち追加時の初期処理
- メッセージ受信時の対応（将来拡張）

---

## 補足

### レート制限

| 対象             | 制限                       |
| ---------------- | -------------------------- |
| ユーザー向け API | 100 リクエスト/分/ユーザー |
| 管理者向け API   | 300 リクエスト/分/管理者   |

### CORS 設定

```
Access-Control-Allow-Origin: https://liff.line.me
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```
