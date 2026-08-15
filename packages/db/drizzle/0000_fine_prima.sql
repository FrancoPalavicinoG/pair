CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"garmin_activity_id" bigint NOT NULL,
	"name" text,
	"sport_type" text,
	"start_time_utc" timestamp with time zone NOT NULL,
	"start_time_local" timestamp NOT NULL,
	"duration_seconds" real,
	"distance_meters" real,
	"calories" real,
	"raw" jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_user_id_garmin_activity_id_unique" UNIQUE("user_id","garmin_activity_id")
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"resting_heart_rate" integer,
	"steps" integer,
	"sleep_seconds" integer,
	"body_battery" integer,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_metrics_user_id_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "garmin_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"credentials_ciphertext" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_refreshed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garmin_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garmin_credentials" ADD CONSTRAINT "garmin_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;