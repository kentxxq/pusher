ALTER TABLE `Channel` ADD `ProxyEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyProtocol` varchar(5) DEFAULT 'http' NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyHost` varchar(200) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyPort` int DEFAULT 8080 NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyUsername` varchar(200) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `Channel` ADD `ProxyPassword` varchar(200) DEFAULT '' NOT NULL;