/**
 * notifications.service.ts
 * Business logic for creating in-app notifications.
 * Dispatches events to all admin users when collaborators complete key milestones.
 */
import { getAllUsers } from "../repositories/user.repository";
import { createNotification } from "../repositories/notifications.repository";

/** Notify all admins when a collaborator completes onboarding */
export async function notifyOnboardingCompleted(
  collaboratorId: number,
  collaboratorName: string
): Promise<void> {
  const admins = await getAllUsers();
  const adminUsers = admins.filter((u) => u.role === "admin");

  await Promise.allSettled(
    adminUsers.map((admin) =>
      createNotification({
        userId: admin.id,
        type: "onboarding_completed",
        title: "Onboarding completado",
        message: `${collaboratorName} completó su proceso de onboarding conversacional.`,
        relatedUserId: collaboratorId,
        read: false,
      })
    )
  );
}

/** Notify all admins when a collaborator completes their competency assessment */
export async function notifyAssessmentCompleted(
  collaboratorId: number,
  collaboratorName: string,
  overallScore: number
): Promise<void> {
  const admins = await getAllUsers();
  const adminUsers = admins.filter((u) => u.role === "admin");

  await Promise.allSettled(
    adminUsers.map((admin) =>
      createNotification({
        userId: admin.id,
        type: "assessment_completed",
        title: "Evaluación de competencias completada",
        message: `${collaboratorName} completó su Proof of Skills con un puntaje de ${Math.round(overallScore)}/100.`,
        relatedUserId: collaboratorId,
        read: false,
      })
    )
  );
}

/** Notify all admins when a learning plan is generated */
export async function notifyLearningPlanReady(
  collaboratorId: number,
  collaboratorName: string
): Promise<void> {
  const admins = await getAllUsers();
  const adminUsers = admins.filter((u) => u.role === "admin");

  await Promise.allSettled(
    adminUsers.map((admin) =>
      createNotification({
        userId: admin.id,
        type: "learning_plan_ready",
        title: "Ruta de aprendizaje generada",
        message: `La ruta de aprendizaje personalizada de ${collaboratorName} está lista para revisión.`,
        relatedUserId: collaboratorId,
        read: false,
      })
    )
  );
}
