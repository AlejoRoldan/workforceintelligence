CREATE TABLE `competency_domains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`competencyLayer` enum('Organizacionales','Liderazgo','Funcionales','Estratégicas Futuras') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`displayOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `competency_domains_id` PRIMARY KEY(`id`),
	CONSTRAINT `competency_domains_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `competency_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assessmentId` int NOT NULL,
	`domainId` int NOT NULL,
	`questionId` varchar(32) NOT NULL,
	`evidence` json,
	`confidence` float NOT NULL,
	`rationale` text,
	`score` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competency_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_skill_expectations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleName` varchar(128) NOT NULL,
	`domainId` int NOT NULL,
	`expectedScore` int NOT NULL,
	`weight` float NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `role_skill_expectations_id` PRIMARY KEY(`id`)
);
