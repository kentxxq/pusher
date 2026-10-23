CREATE TABLE `Channel` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`ChannelName` varchar(200) NOT NULL,
	`ChannelType` int NOT NULL DEFAULT 0,
	`ChannelUrl` varchar(200) NOT NULL,
	`ChannelProxyUrl` varchar(200),
	`UserId` int NOT NULL,
	`ChannelConfig` text,
	CONSTRAINT `Channel_Id` PRIMARY KEY(`Id`)
);
--> statement-breakpoint
CREATE TABLE `ChannelMessageHistory` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`ChannelId` int NOT NULL,
	`MessageId` int NOT NULL,
	`Status` int NOT NULL DEFAULT 0,
	`Success` boolean NOT NULL DEFAULT false,
	`Result` varchar(200),
	CONSTRAINT `ChannelMessageHistory_Id` PRIMARY KEY(`Id`)
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`MessageType` int NOT NULL DEFAULT 0,
	`Content` varchar(2000) NOT NULL,
	`Comment` varchar(200) NOT NULL,
	`RecordTime` datetime(3) NOT NULL,
	`RoomId` int NOT NULL,
	CONSTRAINT `Message_Id` PRIMARY KEY(`Id`)
);
--> statement-breakpoint
CREATE TABLE `RoomWithChannel` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`RoomId` int NOT NULL,
	`ChannelId` int NOT NULL,
	CONSTRAINT `RoomWithChannel_Id` PRIMARY KEY(`Id`)
);
--> statement-breakpoint
CREATE TABLE `Room` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`RoomName` varchar(200) NOT NULL,
	`RoomCode` varchar(200) NOT NULL,
	`RoomKey` varchar(200),
	`UserId` int NOT NULL,
	`CreateDate` datetime(3) NOT NULL,
	CONSTRAINT `Room_Id` PRIMARY KEY(`Id`)
);
--> statement-breakpoint
CREATE TABLE `StringTemplate` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`TemplateName` varchar(200) NOT NULL,
	`TemplateCode` varchar(200) NOT NULL,
	`StringTemplateObject` text NOT NULL,
	`UserId` int NOT NULL,
	CONSTRAINT `StringTemplate_Id` PRIMARY KEY(`Id`)
);
--> statement-breakpoint
CREATE TABLE `User` (
	`Id` int AUTO_INCREMENT NOT NULL,
	`Username` varchar(200) NOT NULL,
	`Password` varchar(200) NOT NULL,
	`RoleType` int NOT NULL DEFAULT 0,
	`LastForgetTime` datetime(3),
	`LastLoginTime` datetime(3),
	CONSTRAINT `User_Id` PRIMARY KEY(`Id`)
);
