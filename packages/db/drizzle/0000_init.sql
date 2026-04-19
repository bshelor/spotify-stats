CREATE TABLE "artist_snapshots" (
	"artist_id" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"popularity" integer NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "artist_snapshots_artist_id_captured_at_pk" PRIMARY KEY("artist_id","captured_at")
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"href" text NOT NULL,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artist_snapshots" ADD CONSTRAINT "artist_snapshots_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_snap_captured" ON "artist_snapshots" USING btree ("captured_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_snap_captured_rank" ON "artist_snapshots" USING btree ("captured_at","rank");