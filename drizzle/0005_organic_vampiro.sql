CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('onboarding_completed','assessment_completed','learning_plan_ready','profile_updated') NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`relatedUserId` int,
	`read` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
