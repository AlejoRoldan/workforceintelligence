CREATE TABLE `assessment_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`overallScore` float NOT NULL,
	`radarScores` json,
	`summary` text,
	`completedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`email` varchar(320),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`invitedBy` int NOT NULL,
	`note` text,
	`usedAt` timestamp,
	`usedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitations_token_unique` UNIQUE(`token`)
);
