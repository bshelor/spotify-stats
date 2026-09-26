CREATE TABLE "artist_external_ids" (
	"artist_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"href" text,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "artist_external_ids_provider_external_id_pk" PRIMARY KEY("provider","external_id")
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"artist_count" integer,
	"snapshot_count" integer,
	"error" text
);
--> statement-breakpoint
DROP INDEX "idx_snap_captured";--> statement-breakpoint
DROP INDEX "idx_snap_captured_rank";--> statement-breakpoint
ALTER TABLE "artist_snapshots" ADD COLUMN "provider" text DEFAULT 'spotify' NOT NULL;--> statement-breakpoint
ALTER TABLE "artist_snapshots" ADD COLUMN "ingest_run_id" text;--> statement-breakpoint
ALTER TABLE "artist_snapshots" DROP CONSTRAINT "artist_snapshots_artist_id_captured_at_pk";--> statement-breakpoint
ALTER TABLE "artist_snapshots" ADD CONSTRAINT "artist_snapshots_artist_id_provider_captured_at_pk" PRIMARY KEY("artist_id","provider","captured_at");--> statement-breakpoint
ALTER TABLE "artist_external_ids" ADD CONSTRAINT "artist_external_ids_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "artist_external_ids" ("artist_id", "provider", "external_id", "href", "first_seen_at", "last_seen_at")
SELECT "id", 'spotify', "id", "href", "first_seen_at", "last_seen_at"
FROM "artists"
ON CONFLICT ("provider", "external_id") DO NOTHING;--> statement-breakpoint
CREATE INDEX "idx_artist_external_ids_artist" ON "artist_external_ids" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "idx_ingest_runs_provider_captured" ON "ingest_runs" USING btree ("provider","captured_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ingest_runs_status" ON "ingest_runs" USING btree ("status");--> statement-breakpoint
ALTER TABLE "artist_snapshots" ADD CONSTRAINT "artist_snapshots_ingest_run_id_ingest_runs_id_fk" FOREIGN KEY ("ingest_run_id") REFERENCES "public"."ingest_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_snap_ingest_run" ON "artist_snapshots" USING btree ("ingest_run_id");--> statement-breakpoint
CREATE INDEX "idx_snap_captured" ON "artist_snapshots" USING btree ("provider","captured_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_snap_captured_rank" ON "artist_snapshots" USING btree ("provider","captured_at","rank");
