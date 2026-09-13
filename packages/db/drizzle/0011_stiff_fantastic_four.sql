CREATE TABLE "user_profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"height_cm" integer,
	"weight_grams" integer,
	"available_training_days" text[],
	"preferred_long_training_days" text[],
	"synced_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sport_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"sport" text NOT NULL,
	"hr_zone_1_floor" integer,
	"hr_zone_2_floor" integer,
	"hr_zone_3_floor" integer,
	"hr_zone_4_floor" integer,
	"hr_zone_5_floor" integer,
	"resting_heart_rate" integer,
	"max_heart_rate" integer,
	"lactate_threshold_heart_rate" integer,
	"ftp_watts" integer,
	"synced_at" timestamp with time zone,
	CONSTRAINT "sport_zones_user_id_sport_unique" UNIQUE("user_id","sport")
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_zones" ADD CONSTRAINT "sport_zones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;