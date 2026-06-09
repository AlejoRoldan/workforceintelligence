ALTER TABLE `competency_assessments` MODIFY COLUMN `questions` json;--> statement-breakpoint
ALTER TABLE `competency_assessments` MODIFY COLUMN `answers` json;--> statement-breakpoint
ALTER TABLE `competency_assessments` MODIFY COLUMN `radarScores` json;--> statement-breakpoint
ALTER TABLE `onboarding_sessions` MODIFY COLUMN `messages` json;--> statement-breakpoint
ALTER TABLE `onboarding_sessions` MODIFY COLUMN `competencyProfile` json;