CREATE TABLE `competency_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`questions` json DEFAULT ('[]'),
	`answers` json DEFAULT ('[]'),
	`radarScores` json DEFAULT ('[]'),
	`overallScore` float,
	`summary` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competency_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `onboarding_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`messages` json DEFAULT ('[]'),
	`competencyProfile` json DEFAULT ('{}'),
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `onboarding_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `jobTitle` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `department` varchar(128);