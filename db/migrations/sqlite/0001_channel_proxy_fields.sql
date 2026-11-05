ALTER TABLE `Channel` ADD `ProxyEnabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyProtocol` text DEFAULT 'http' NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyHost` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyPort` integer DEFAULT 8080 NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyUsername` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyPassword` text DEFAULT '' NOT NULL;