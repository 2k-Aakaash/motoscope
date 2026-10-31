CREATE TABLE "sessions" (
	"id" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pk_sessions" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "fk_sessions_users_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_sessions_user_id" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_sessions_expires_at" ON "sessions" USING btree ("expires_at");