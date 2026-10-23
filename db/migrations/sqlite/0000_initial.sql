CREATE TABLE `Channel` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ChannelName` text NOT NULL,
	`ChannelType` integer DEFAULT 0 NOT NULL,
	`ChannelUrl` text NOT NULL,
	`ChannelProxyUrl` text,
	`UserId` integer NOT NULL,
	`ChannelConfig` text
);
--> statement-breakpoint
CREATE TABLE `ChannelMessageHistory` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ChannelId` integer NOT NULL,
	`MessageId` integer NOT NULL,
	`Status` integer DEFAULT 0 NOT NULL,
	`Success` integer DEFAULT false NOT NULL,
	`Result` text
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`MessageType` integer DEFAULT 0 NOT NULL,
	`Content` text NOT NULL,
	`Comment` text NOT NULL,
	`RecordTime` text NOT NULL,
	`RoomId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `RoomWithChannel` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`RoomId` integer NOT NULL,
	`ChannelId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Room` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`RoomName` text NOT NULL,
	`RoomCode` text NOT NULL,
	`RoomKey` text,
	`UserId` integer NOT NULL,
	`CreateDate` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `StringTemplate` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`TemplateName` text NOT NULL,
	`TemplateCode` text NOT NULL,
	`StringTemplateObject` text NOT NULL,
	`UserId` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `User` (
	`Id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`Username` text NOT NULL,
	`Password` text NOT NULL,
	`RoleType` integer DEFAULT 0 NOT NULL,
	`LastForgetTime` text,
	`LastLoginTime` text
);
