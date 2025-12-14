CREATE TYPE "public"."admin_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('active', 'ended');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."survey_type" AS ENUM('30', '60', '90');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"admin_id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" "admin_role" DEFAULT 'staff' NOT NULL,
	"store_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "loan_tokens" (
	"token_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"used_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"loan_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_key" varchar(255) NOT NULL,
	"store_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"reservation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"reserved_at" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'confirmed' NOT NULL,
	"cancelled_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"store_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" varchar(255),
	"phone" varchar(20),
	"business_hours" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"survey_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"type" "survey_type" NOT NULL,
	"answered_at" timestamp with time zone,
	"answers" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_key" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_tokens" ADD CONSTRAINT "loan_tokens_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_tokens" ADD CONSTRAINT "loan_tokens_used_by_users_user_key_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("user_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_key_users_user_key_fk" FOREIGN KEY ("user_key") REFERENCES "public"."users"("user_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_loan_id_loans_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("loan_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_store_id_stores_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("store_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_loan_id_loans_loan_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("loan_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_users_store" ON "admin_users" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_loan_tokens_store" ON "loan_tokens" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_loan_tokens_expires" ON "loan_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_loans_user" ON "loans" USING btree ("user_key");--> statement-breakpoint
CREATE INDEX "idx_loans_store" ON "loans" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_loans_status" ON "loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_loans_end_date" ON "loans" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_reservations_loan" ON "reservations" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_store" ON "reservations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_date" ON "reservations" USING btree ("reserved_at");--> statement-breakpoint
CREATE INDEX "idx_surveys_loan" ON "surveys" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_surveys_unanswered" ON "surveys" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");