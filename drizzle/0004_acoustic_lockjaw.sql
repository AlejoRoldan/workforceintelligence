CREATE TABLE `learning_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assessmentId` int NOT NULL,
	`status` enum('generating','ready','in_progress','completed') NOT NULL DEFAULT 'generating',
	`planJson` json,
	`generatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `learning_plans_id` PRIMARY KEY(`id`)
);
