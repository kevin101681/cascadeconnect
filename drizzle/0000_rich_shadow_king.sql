CREATE TYPE "public"."appointment_type" AS ENUM('repair', 'inspection', 'phone_call', 'other');--> statement-breakpoint
CREATE TYPE "public"."appointment_visibility" AS ENUM('internal_only', 'shared_with_homeowner');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('SUBMITTED', 'REVIEWING', 'SCHEDULING', 'SCHEDULED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'HOMEOWNER', 'BUILDER');--> statement-breakpoint
CREATE TABLE "appointment_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"homeowner_id" uuid,
	"visibility" "appointment_visibility" DEFAULT 'shared_with_homeowner',
	"type" "appointment_type" DEFAULT 'other',
	"created_by_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "builder_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vapi_call_id" text NOT NULL,
	"homeowner_id" uuid,
	"homeowner_name" text,
	"phone_number" text,
	"property_address" text,
	"issue_description" text,
	"is_urgent" boolean DEFAULT false,
	"transcript" text,
	"recording_url" text,
	"is_verified" boolean DEFAULT false,
	"address_match_similarity" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "calls_vapi_call_id_unique" UNIQUE("vapi_call_id")
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" uuid,
	"homeowner_name" text,
	"homeowner_email" text,
	"builder_name" text,
	"job_name" text,
	"address" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"claim_number" text,
	"status" "claim_status" DEFAULT 'SUBMITTED',
	"classification" text DEFAULT 'Unclassified',
	"contractor_id" uuid,
	"contractor_name" text,
	"contractor_email" text,
	"date_submitted" timestamp DEFAULT now(),
	"date_evaluated" timestamp,
	"internal_notes" text,
	"non_warranty_explanation" text,
	"ai_summary" text,
	"attachments" json DEFAULT '[]'::json,
	"proposed_dates" json DEFAULT '[]'::json
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_name" text NOT NULL,
	"contact_name" text,
	"email" text NOT NULL,
	"phone" text,
	"specialty" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" uuid,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'FILE',
	"uploaded_by" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"metadata" json,
	"sendgrid_message_id" text,
	"opened_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homeowners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"phone" text,
	"password" text,
	"buyer_2_email" text,
	"buyer_2_phone" text,
	"street" text,
	"city" text,
	"state" text,
	"zip" text,
	"address" text NOT NULL,
	"builder" text,
	"builder_group_id" uuid,
	"job_name" text,
	"agent_name" text,
	"agent_phone" text,
	"agent_email" text,
	"closing_date" timestamp,
	"preferred_walk_through_date" timestamp,
	"enrollment_comments" text,
	"report_app_user_id" text,
	"report_app_linked" boolean DEFAULT false,
	"report_app_linked_at" timestamp,
	"sms_opt_in" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "homeowners_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "message_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"homeowner_id" uuid,
	"participants" json DEFAULT '[]'::json,
	"is_read" boolean DEFAULT false,
	"last_message_at" timestamp DEFAULT now(),
	"messages" json DEFAULT '[]'::json
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"body" text NOT NULL,
	"twilio_sid" text,
	"status" text DEFAULT 'sent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" uuid NOT NULL,
	"phone_number" text NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assigned_to_id" text,
	"assigned_by_id" text,
	"is_completed" boolean DEFAULT false,
	"date_assigned" timestamp DEFAULT now(),
	"due_date" timestamp,
	"related_claim_ids" json DEFAULT '[]'::json,
	"content" text,
	"claim_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'ADMIN',
	"password" text,
	"internal_role" text,
	"builder_group_id" uuid,
	"email_notify_claim_submitted" boolean DEFAULT true,
	"email_notify_homeowner_accepts_appointment" boolean DEFAULT true,
	"email_notify_sub_accepts_appointment" boolean DEFAULT true,
	"email_notify_homeowner_reschedule_request" boolean DEFAULT true,
	"email_notify_task_assigned" boolean DEFAULT true,
	"email_notify_homeowner_enrollment" boolean DEFAULT true,
	"notify_claims" boolean DEFAULT true,
	"notify_tasks" boolean DEFAULT true,
	"notify_appointments" boolean DEFAULT true,
	"push_notify_claim_submitted" boolean DEFAULT false,
	"push_notify_homeowner_accepts_appointment" boolean DEFAULT false,
	"push_notify_sub_accepts_appointment" boolean DEFAULT false,
	"push_notify_homeowner_reschedule_request" boolean DEFAULT false,
	"push_notify_task_assigned" boolean DEFAULT false,
	"push_notify_homeowner_message" boolean DEFAULT false,
	"push_notify_homeowner_enrollment" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "appointment_guests" ADD CONSTRAINT "appointment_guests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_contractor_id_contractors_id_fk" FOREIGN KEY ("contractor_id") REFERENCES "public"."contractors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homeowners" ADD CONSTRAINT "homeowners_builder_group_id_builder_groups_id_fk" FOREIGN KEY ("builder_group_id") REFERENCES "public"."builder_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_thread_id_sms_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."sms_threads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_threads" ADD CONSTRAINT "sms_threads_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_builder_group_id_builder_groups_id_fk" FOREIGN KEY ("builder_group_id") REFERENCES "public"."builder_groups"("id") ON DELETE no action ON UPDATE no action;