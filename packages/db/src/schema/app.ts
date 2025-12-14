import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	jsonb,
	pgEnum,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

// ============================================
// ENUM型定義
// ============================================

export const loanStatusEnum = pgEnum("loan_status", ["active", "ended"]);
export const surveyTypeEnum = pgEnum("survey_type", ["30", "60", "90"]);
export const reservationStatusEnum = pgEnum("reservation_status", [
	"confirmed",
	"cancelled",
	"completed",
]);
export const adminRoleEnum = pgEnum("admin_role", ["admin", "staff"]);

// ============================================
// テーブル定義
// ============================================

/**
 * LINEミニアプリユーザー
 * LINE LIFF認証したユーザーの基本情報を保持
 */
export const users = pgTable(
	"users",
	{
		userKey: varchar("user_key", { length: 255 }).primaryKey(),
		name: varchar("name", { length: 100 }).notNull(),
		phone: varchar("phone", { length: 20 }).notNull(),
		email: varchar("email", { length: 255 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_users_phone").on(table.phone),
		index("idx_users_email").on(table.email),
	],
);

/**
 * 店舗マスタ
 */
export const stores = pgTable("stores", {
	storeId: uuid("store_id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	address: varchar("address", { length: 255 }),
	phone: varchar("phone", { length: 20 }),
	businessHours: varchar("business_hours", { length: 100 }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

/**
 * 貸出開始登録用QRトークン
 * 店頭QRコードに埋め込むトークンを管理
 */
export const loanTokens = pgTable(
	"loan_tokens",
	{
		tokenId: uuid("token_id").defaultRandom().primaryKey(),
		storeId: uuid("store_id")
			.notNull()
			.references(() => stores.storeId),
		token: varchar("token", { length: 255 }).notNull().unique(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		usedAt: timestamp("used_at", { withTimezone: true }),
		usedBy: varchar("used_by", { length: 255 }).references(() => users.userKey),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_loan_tokens_store").on(table.storeId),
		index("idx_loan_tokens_expires").on(table.expiresAt),
	],
);

/**
 * 補聴器貸出
 * 90日間の貸出情報を管理
 */
export const loans = pgTable(
	"loans",
	{
		loanId: uuid("loan_id").defaultRandom().primaryKey(),
		userKey: varchar("user_key", { length: 255 })
			.notNull()
			.references(() => users.userKey),
		storeId: uuid("store_id")
			.notNull()
			.references(() => stores.storeId),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		startedAt: timestamp("started_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		endedAt: timestamp("ended_at", { withTimezone: true }),
		status: loanStatusEnum("status").default("active").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_loans_user").on(table.userKey),
		index("idx_loans_store").on(table.storeId),
		index("idx_loans_status").on(table.status),
		index("idx_loans_end_date").on(table.endDate),
	],
);

/**
 * 使用状況アンケート
 * 30/60/90日アンケートの回答を保持
 */
export const surveys = pgTable(
	"surveys",
	{
		surveyId: uuid("survey_id").defaultRandom().primaryKey(),
		loanId: uuid("loan_id")
			.notNull()
			.references(() => loans.loanId),
		type: surveyTypeEnum("type").notNull(),
		answeredAt: timestamp("answered_at", { withTimezone: true }),
		answers: jsonb("answers"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_surveys_loan").on(table.loanId),
		index("idx_surveys_unanswered").on(table.loanId),
	],
);

/**
 * 来店予約
 */
export const reservations = pgTable(
	"reservations",
	{
		reservationId: uuid("reservation_id").defaultRandom().primaryKey(),
		loanId: uuid("loan_id")
			.notNull()
			.references(() => loans.loanId),
		storeId: uuid("store_id")
			.notNull()
			.references(() => stores.storeId),
		reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull(),
		status: reservationStatusEnum("status").default("confirmed").notNull(),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("idx_reservations_loan").on(table.loanId),
		index("idx_reservations_store").on(table.storeId),
		index("idx_reservations_date").on(table.reservedAt),
	],
);

/**
 * 管理者
 * 管理画面の認証情報はSupabase Authで管理し、このテーブルは追加属性を保持
 * 注: admin_idはauth.users(id)を参照するが、Drizzleではauth schemaを直接参照できないため
 * マイグレーションファイルで外部キー制約を追加する
 */
export const adminUsers = pgTable(
	"admin_users",
	{
		adminId: uuid("admin_id").primaryKey(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		name: varchar("name", { length: 100 }).notNull(),
		role: adminRoleEnum("role").default("staff").notNull(),
		storeId: uuid("store_id").references(() => stores.storeId),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("idx_admin_users_store").on(table.storeId)],
);

// ============================================
// リレーション定義
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
	loans: many(loans),
	usedTokens: many(loanTokens),
}));

export const storesRelations = relations(stores, ({ many }) => ({
	loans: many(loans),
	loanTokens: many(loanTokens),
	reservations: many(reservations),
	adminUsers: many(adminUsers),
}));

export const loanTokensRelations = relations(loanTokens, ({ one }) => ({
	store: one(stores, {
		fields: [loanTokens.storeId],
		references: [stores.storeId],
	}),
	usedByUser: one(users, {
		fields: [loanTokens.usedBy],
		references: [users.userKey],
	}),
}));

export const loansRelations = relations(loans, ({ one, many }) => ({
	user: one(users, {
		fields: [loans.userKey],
		references: [users.userKey],
	}),
	store: one(stores, {
		fields: [loans.storeId],
		references: [stores.storeId],
	}),
	surveys: many(surveys),
	reservations: many(reservations),
}));

export const surveysRelations = relations(surveys, ({ one }) => ({
	loan: one(loans, {
		fields: [surveys.loanId],
		references: [loans.loanId],
	}),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
	loan: one(loans, {
		fields: [reservations.loanId],
		references: [loans.loanId],
	}),
	store: one(stores, {
		fields: [reservations.storeId],
		references: [stores.storeId],
	}),
}));

export const adminUsersRelations = relations(adminUsers, ({ one }) => ({
	store: one(stores, {
		fields: [adminUsers.storeId],
		references: [stores.storeId],
	}),
}));
