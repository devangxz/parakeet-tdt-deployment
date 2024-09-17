-- CreateEnum
CREATE TYPE "Status" AS ENUM ('CREATED', 'VERIFIED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CUSTOMER', 'TRANSCRIBER', 'TRANSCRIBER_LEVEL_2_LEGACY', 'PROOFREADER_LEGACY', 'REVIEWER', 'VERIFIER_LEGACY', 'QC', 'CSADMIN', 'OM', 'SUPERADMIN', 'INTERNAL_TEAM_USER', 'DEV_TEAM', 'DEV_ADMINS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'TRANSCRIBED', 'QC_ASSIGNED', 'QC_COMPLETED', 'FORMATTED', 'REVIEWER_ASSIGNED', 'REVIEW_COMPLETED', 'FINALIZER_ASSIGNED', 'FINALIZING_COMPLETED', 'DELIVERED', 'CANCELLED', 'REFUNDED', 'BLOCKED', 'PRE_DELIVERED', 'SUBMITTED_FOR_APPROVAL', 'SUBMITTED_FOR_SCREENING');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('TRANSCRIPTION', 'TRANSCRIPTION_FORMATTING');

-- CreateEnum
CREATE TYPE "ReportMode" AS ENUM ('NONE', 'MANUAL', 'AUTO', 'OM');

-- CreateEnum
CREATE TYPE "ReportOption" AS ENUM ('HIGH_ERROR_RATE', 'INCOMPLETE', 'INCORRECT_PARAGRAPH_BREAKS', 'DOES_NOT_MATCH_AUDIO', 'HIGH_DIFFICULTY', 'NETWORK_ERROR', 'NO_SPOKEN_AUDIO', 'GUIDELINE_VIOLATIONS', 'ONLY_BACKGROUND_CONVERSATION', 'ONLY_MUSIC', 'OTHER', 'AUTO_PWER_ABOVE_THRESHOLD', 'AUTO_DIFF_BELOW_THRESHOLD');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('TRANSCRIPT', 'WITHDRAWAL', 'ADDL_FORMATTING', 'ADDL_PROOFREADING', 'PP_ADD_FUNDS', 'ADD_CREDITS', 'FREE_CREDITS', 'FORMATTING', 'CAPTIONING', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'BILLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('NA', 'PAYPAL', 'CREDITCARD', 'BILLING', 'CREDITS');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('POOR', 'BAD', 'OKAY', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "QcStep" AS ENUM ('SAMPLING', 'DELIVERY', 'REPROOFREAD', 'PENDING_PF');

-- CreateEnum
CREATE TYPE "DelayReason" AS ENUM ('AMBIENT_NOISE', 'NOISY_BACKGROUND', 'DISTANT', 'ACCENT', 'ECHO', 'DISTURBANCE', 'DISTORTIONS', 'QUALITY', 'DICTION', 'SLURRING', 'INAUDIBLE', 'MUFFLED', 'REVERB', 'OTHER', 'DUPLICATE', 'BLANK', 'NON_ENGLISH', 'RE_UPLOAD', 'HIGH_DIFFICULTY');

-- CreateEnum
CREATE TYPE "BlankCheck" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AssignMode" AS ENUM ('MANUAL', 'AUTO');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('SUPER_ADMIN', 'MANAGER', 'INTERNAL_TEAM_USER', 'SUPERVISOR', 'USER', 'TEAM_ADMIN');

-- CreateEnum
CREATE TYPE "TeamMemberStatus" AS ENUM ('NONE', 'INVITED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('NONE', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('GLOBAL', 'USER', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "QCType" AS ENUM ('CONTRACTOR', 'FREELANCER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACCEPTED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'TIMEDOUT', 'SUBMITTED_FOR_APPROVAL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('TR_LEGACY', 'RV_LEGACY', 'PR_LEGACY', 'QC', 'REVIEW', 'FINALIZE');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'COMPLETED', 'DENIED', 'CANCELLED', 'FAILED', 'PROCESSING', 'INITIATED');

-- CreateEnum
CREATE TYPE "InputFileType" AS ENUM ('ASR_OUTPUT', 'QC_OUTPUT', 'LLM_OUTPUT', 'REVIEW_OUTPUT');

-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('DAILY', 'MONTHLY', 'FILE');

-- CreateTable
CREATE TABLE "scb_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "user" TEXT,
    "pass" TEXT,
    "salt" TEXT,
    "assoc_pass" TEXT,
    "lang" TEXT,
    "remember" BOOLEAN,
    "records_per_page" INTEGER NOT NULL DEFAULT 10,
    "firstname" TEXT,
    "lastname" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "postal_code" TEXT,
    "phone_number" TEXT,
    "last_access" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "status" "Status" NOT NULL DEFAULT 'CREATED',
    "plan_id" INTEGER NOT NULL DEFAULT 0,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "referral_code" TEXT,
    "referred_by" TEXT,
    "referral_rate" DOUBLE PRECISION,
    "paypal_id" TEXT,
    "secondary_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "spl_instructions" TEXT,
    "industry" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reset_password_token" TEXT,
    "reset_password_token_expires" TIMESTAMP(3),

    CONSTRAINT "scb_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_customers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "delivery_limit" INTEGER NOT NULL DEFAULT 4,
    "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hd_discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billing" BOOLEAN NOT NULL DEFAULT false,
    "survey" BOOLEAN NOT NULL DEFAULT true,
    "refund_to_credits" BOOLEAN NOT NULL DEFAULT false,
    "use_credits_default" BOOLEAN NOT NULL DEFAULT true,
    "watch" BOOLEAN NOT NULL DEFAULT false,
    "pro_account" INTEGER NOT NULL DEFAULT 0,
    "last_selected_internal_team_user_id" TEXT,
    "custom_plan" BOOLEAN NOT NULL DEFAULT false,
    "del_watch" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_pre_delivery_eligible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_files" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "file_id" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "bit_rate" DOUBLE PRECISION,
    "sample_rate" DOUBLE PRECISION,
    "download_count" SMALLINT NOT NULL DEFAULT 0,
    "filesize" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "full_path" TEXT,
    "deleted_at" TIMESTAMP(3),
    "custom_formatting_details" JSONB,
    "custom_details_changes_count" INTEGER NOT NULL DEFAULT 0,
    "custom_instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_status" "FileStatus" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "scb_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_folders" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "scb_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_invoices" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL DEFAULT 'TRANSCRIPT',
    "user_id" INTEGER NOT NULL,
    "item_number" TEXT,
    "options" TEXT,
    "order_info" TEXT,
    "flex_delivery" BOOLEAN NOT NULL DEFAULT false,
    "addl_proofing" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "custom" INTEGER NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "refund_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'NA',
    "transaction_id" TEXT,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credits_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credits_refunded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid_by" INTEGER,
    "order_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "instructions" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "tat" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "order_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" "Rating",
    "referral_amount" DOUBLE PRECISION,
    "delivery_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_by" INTEGER,
    "delay_reason" "DelayReason",
    "high_difficulty" BOOLEAN DEFAULT false,
    "qc_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate_bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "asr_time_taken" INTEGER,
    "llm_time_taken" INTEGER,
    "pwer" DOUBLE PRECISION,
    "wer" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_type" "OrderType" NOT NULL DEFAULT 'TRANSCRIPTION',
    "report_mode" "ReportMode" NOT NULL DEFAULT 'NONE',
    "report_option" "ReportOption",
    "report_comment" TEXT,
    "comments" TEXT,

    CONSTRAINT "scb_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_default_options" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "options" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_default_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_default_instructions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "instructions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_default_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_invoice_files" (
    "id" SERIAL NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_invoice_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_user_rates" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "manual_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sv_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreed_monthly_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "add_charge_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "audio_time_coding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rush_order" DOUBLE PRECISION NOT NULL,
    "custom_format" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custom_format_option" TEXT,
    "deadline" INTEGER NOT NULL DEFAULT 5,
    "custom_format_qc_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "custom_format_review_rate" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "custom_format_medium_difficulty_review_rate" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "custom_format_high_difficulty_review_rate" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "order_type" "OrderType" NOT NULL DEFAULT 'TRANSCRIPTION',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_user_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_organizations" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_invites" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "invite_key" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_teams" (
    "id" SERIAL NOT NULL,
    "owner" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_team_members" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MANAGER',
    "status" "TeamMemberStatus" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "scb_team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_coupons" (
    "id" SERIAL NOT NULL,
    "coupon_code" TEXT,
    "type" "CouponType" NOT NULL DEFAULT 'USER',
    "user_id" INTEGER,
    "discount_rate" DOUBLE PRECISION DEFAULT 0,
    "valid_days" INTEGER DEFAULT 0,
    "apply_count" INTEGER DEFAULT 0,
    "activated" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_verifiers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "quota" INTEGER DEFAULT 3600,
    "accents" TEXT DEFAULT 'NA',
    "qa_type" "QCType" DEFAULT 'CONTRACTOR',
    "qc_rate" INTEGER NOT NULL DEFAULT 0,
    "cf_rate" INTEGER NOT NULL DEFAULT 0,
    "cf_r_rate" INTEGER NOT NULL DEFAULT 0,
    "qc_disabled" BOOLEAN DEFAULT false,
    "daily_bonus_amount" INTEGER DEFAULT 5,
    "qc_promotion_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "super_qc" BOOLEAN DEFAULT false,
    "watchlist" BOOLEAN DEFAULT false,
    "legal_enabled" BOOLEAN DEFAULT false,
    "cf_review_enabled" BOOLEAN DEFAULT false,
    "cf_bonus_enabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_verifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_job_assignments" (
    "id" SERIAL NOT NULL,
    "transcriber_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'ACCEPTED',
    "accepted_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_ts" TIMESTAMP(3),
    "cancelled_ts" TIMESTAMP(3),
    "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" "JobType" NOT NULL DEFAULT 'QC',
    "input_file" "InputFileType" NOT NULL DEFAULT 'ASR_OUTPUT',

    CONSTRAINT "scb_job_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_customer_notify_prefs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "transcript_order" BOOLEAN NOT NULL DEFAULT true,
    "newsletter" BOOLEAN NOT NULL DEFAULT true,
    "cc_stored" BOOLEAN NOT NULL DEFAULT true,
    "transcript_delivered" BOOLEAN NOT NULL DEFAULT true,
    "transcript_cancelled" BOOLEAN NOT NULL DEFAULT true,
    "transcript_refund" BOOLEAN NOT NULL DEFAULT true,
    "team_member_who_ordered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scb_customer_notify_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_transcriber_notify_prefs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "new_files_avaiilability" BOOLEAN NOT NULL DEFAULT true,
    "file_assignment" BOOLEAN NOT NULL DEFAULT true,
    "file_submission" BOOLEAN NOT NULL DEFAULT true,
    "earnings_credit" BOOLEAN NOT NULL DEFAULT true,
    "withdrawal_request" BOOLEAN NOT NULL DEFAULT true,
    "newsletter" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "scb_transcriber_notify_prefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_withdrawals" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION DEFAULT 0,
    "fee" DOUBLE PRECISION,
    "invoice_id" TEXT,
    "to_paypal_id" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "pp_add_funds_inv" TEXT,

    CONSTRAINT "scb_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_file_accents" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "accent_code" TEXT NOT NULL,

    CONSTRAINT "scb_file_accents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_bonus" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" "BonusType" NOT NULL DEFAULT 'DAILY',
    "file_ids" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_bonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_orders_legacy" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "instructions" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "tat" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to" INTEGER,
    "order_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" "Rating",
    "referral_amount" DOUBLE PRECISION,
    "delivery_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_by" INTEGER,
    "delay_reason" "DelayReason",
    "high_difficulty" BOOLEAN DEFAULT false,
    "qc_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rate_bonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "asr_time_taken" INTEGER,
    "llm_time_taken" INTEGER,
    "pwer" DOUBLE PRECISION,
    "wer" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "order_type" "OrderType" NOT NULL DEFAULT 'TRANSCRIPTION',
    "report_mode" "ReportMode" NOT NULL DEFAULT 'NONE',
    "report_option" "ReportOption",
    "report_comment" TEXT,
    "comments" TEXT,

    CONSTRAINT "scb_orders_legacy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_misc_jobs_attachments" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "original_filename" TEXT,
    "file_extension" TEXT,

    CONSTRAINT "scb_misc_jobs_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_misc_earnings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scb_misc_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scb_frequent_terms" (
    "id" SERIAL NOT NULL,
    "edited" TEXT,
    "auto_generated" TEXT,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "scb_frequent_terms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scb_users_email_key" ON "scb_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "scb_users_reset_password_token_key" ON "scb_users"("reset_password_token");

-- CreateIndex
CREATE INDEX "scb_users_role_idx" ON "scb_users"("role");

-- CreateIndex
CREATE INDEX "scb_users_email_idx" ON "scb_users"("email");

-- CreateIndex
CREATE INDEX "scb_users_user_idx" ON "scb_users"("user");

-- CreateIndex
CREATE UNIQUE INDEX "scb_customers_user_id_key" ON "scb_customers"("user_id");

-- CreateIndex
CREATE INDEX "scb_customers_user_id_idx" ON "scb_customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_files_file_id_key" ON "scb_files"("file_id");

-- CreateIndex
CREATE INDEX "scb_files_user_id_idx" ON "scb_files"("user_id");

-- CreateIndex
CREATE INDEX "scb_files_file_id_idx" ON "scb_files"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_invoices_invoice_id_key" ON "scb_invoices"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_invoices_transaction_id_key" ON "scb_invoices"("transaction_id");

-- CreateIndex
CREATE INDEX "scb_invoices_item_number_idx" ON "scb_invoices"("item_number");

-- CreateIndex
CREATE INDEX "scb_invoices_invoice_id_idx" ON "scb_invoices"("invoice_id");

-- CreateIndex
CREATE INDEX "scb_invoices_user_id_idx" ON "scb_invoices"("user_id");

-- CreateIndex
CREATE INDEX "scb_invoices_status_idx" ON "scb_invoices"("status");

-- CreateIndex
CREATE INDEX "scb_invoices_paid_by_idx" ON "scb_invoices"("paid_by");

-- CreateIndex
CREATE UNIQUE INDEX "scb_orders_file_id_key" ON "scb_orders"("file_id");

-- CreateIndex
CREATE INDEX "scb_orders_user_id_idx" ON "scb_orders"("user_id");

-- CreateIndex
CREATE INDEX "scb_orders_status_idx" ON "scb_orders"("status");

-- CreateIndex
CREATE INDEX "scb_orders_file_id_idx" ON "scb_orders"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_default_options_user_id_key" ON "scb_default_options"("user_id");

-- CreateIndex
CREATE INDEX "scb_default_options_user_id_idx" ON "scb_default_options"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_default_instructions_user_id_key" ON "scb_default_instructions"("user_id");

-- CreateIndex
CREATE INDEX "scb_default_instructions_user_id_idx" ON "scb_default_instructions"("user_id");

-- CreateIndex
CREATE INDEX "scb_invoice_files_invoice_id_idx" ON "scb_invoice_files"("invoice_id");

-- CreateIndex
CREATE INDEX "scb_invoice_files_file_id_idx" ON "scb_invoice_files"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_user_rates_user_id_key" ON "scb_user_rates"("user_id");

-- CreateIndex
CREATE INDEX "scb_user_rates_user_id_idx" ON "scb_user_rates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_organizations_user_id_key" ON "scb_organizations"("user_id");

-- CreateIndex
CREATE INDEX "scb_organizations_user_id_idx" ON "scb_organizations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_invites_invite_key_key" ON "scb_invites"("invite_key");

-- CreateIndex
CREATE INDEX "scb_invites_email_idx" ON "scb_invites"("email");

-- CreateIndex
CREATE INDEX "scb_invites_invite_key_idx" ON "scb_invites"("invite_key");

-- CreateIndex
CREATE INDEX "scb_templates_user_id_idx" ON "scb_templates"("user_id");

-- CreateIndex
CREATE INDEX "scb_templates_name_idx" ON "scb_templates"("name");

-- CreateIndex
CREATE INDEX "scb_teams_owner_idx" ON "scb_teams"("owner");

-- CreateIndex
CREATE UNIQUE INDEX "scb_team_members_user_id_team_id_key" ON "scb_team_members"("user_id", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_coupons_coupon_code_key" ON "scb_coupons"("coupon_code");

-- CreateIndex
CREATE UNIQUE INDEX "scb_verifiers_user_id_key" ON "scb_verifiers"("user_id");

-- CreateIndex
CREATE INDEX "scb_job_assignments_transcriber_id_idx" ON "scb_job_assignments"("transcriber_id");

-- CreateIndex
CREATE INDEX "scb_job_assignments_order_id_idx" ON "scb_job_assignments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_customer_notify_prefs_user_id_key" ON "scb_customer_notify_prefs"("user_id");

-- CreateIndex
CREATE INDEX "scb_customer_notify_prefs_user_id_idx" ON "scb_customer_notify_prefs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_transcriber_notify_prefs_user_id_key" ON "scb_transcriber_notify_prefs"("user_id");

-- CreateIndex
CREATE INDEX "scb_transcriber_notify_prefs_user_id_idx" ON "scb_transcriber_notify_prefs"("user_id");

-- CreateIndex
CREATE INDEX "scb_withdrawals_invoice_id_idx" ON "scb_withdrawals"("invoice_id");

-- CreateIndex
CREATE INDEX "scb_file_accents_user_id_idx" ON "scb_file_accents"("user_id");

-- CreateIndex
CREATE INDEX "scb_file_accents_file_id_idx" ON "scb_file_accents"("file_id");

-- CreateIndex
CREATE INDEX "scb_bonus_user_id_idx" ON "scb_bonus"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_orders_legacy_file_id_key" ON "scb_orders_legacy"("file_id");

-- CreateIndex
CREATE INDEX "scb_orders_legacy_user_id_idx" ON "scb_orders_legacy"("user_id");

-- CreateIndex
CREATE INDEX "scb_orders_legacy_status_idx" ON "scb_orders_legacy"("status");

-- CreateIndex
CREATE INDEX "scb_orders_legacy_file_id_idx" ON "scb_orders_legacy"("file_id");

-- CreateIndex
CREATE INDEX "scb_misc_jobs_attachments_file_id_idx" ON "scb_misc_jobs_attachments"("file_id");

-- CreateIndex
CREATE INDEX "scb_misc_jobs_attachments_filename_idx" ON "scb_misc_jobs_attachments"("filename");

-- CreateIndex
CREATE INDEX "scb_misc_earnings_user_id_idx" ON "scb_misc_earnings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "scb_frequent_terms_user_id_key" ON "scb_frequent_terms"("user_id");

-- AddForeignKey
ALTER TABLE "scb_customers" ADD CONSTRAINT "scb_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_files" ADD CONSTRAINT "scb_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_folders" ADD CONSTRAINT "scb_folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_invoices" ADD CONSTRAINT "scb_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_orders" ADD CONSTRAINT "scb_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_orders" ADD CONSTRAINT "scb_orders_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_default_options" ADD CONSTRAINT "scb_default_options_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_default_instructions" ADD CONSTRAINT "scb_default_instructions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_invoice_files" ADD CONSTRAINT "scb_invoice_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "scb_files"("file_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_user_rates" ADD CONSTRAINT "scb_user_rates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_organizations" ADD CONSTRAINT "scb_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_team_members" ADD CONSTRAINT "scb_team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "scb_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_team_members" ADD CONSTRAINT "scb_team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_coupons" ADD CONSTRAINT "scb_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_verifiers" ADD CONSTRAINT "scb_verifiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_job_assignments" ADD CONSTRAINT "scb_job_assignments_transcriber_id_fkey" FOREIGN KEY ("transcriber_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_job_assignments" ADD CONSTRAINT "scb_job_assignments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "scb_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_customer_notify_prefs" ADD CONSTRAINT "scb_customer_notify_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_transcriber_notify_prefs" ADD CONSTRAINT "scb_transcriber_notify_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_withdrawals" ADD CONSTRAINT "scb_withdrawals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_bonus" ADD CONSTRAINT "scb_bonus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_misc_earnings" ADD CONSTRAINT "scb_misc_earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scb_frequent_terms" ADD CONSTRAINT "scb_frequent_terms_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "scb_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
