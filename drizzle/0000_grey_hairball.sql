CREATE TABLE `daily_visits` (
	`day` text PRIMARY KEY NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movies` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`watch_url` text NOT NULL,
	`drive_file_id` text NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `movies_published_created` ON `movies` (`published`,`created_at`);--> statement-breakpoint
CREATE TABLE `visit_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visit_sessions_day` ON `visit_sessions` (`day`);