/**
 * DashboardCollaborator — Dashboard del colaborador.
 * Sprint UX/UI: PageTransition, GlassCard, AnimatedProgressBar,
 * StaggerContainer para cards de estado, motion depth en sección radar.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedProgressBar } from "@/components/ui/animated-progress";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sparkles,
  User,
} from "lucide-react";

const STATUS_CONFIG = {
  completed: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  in_progress: { label: "En progreso", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border", icon: Clock },
};

export default function DashboardCollaborator() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: onboarding } = trpc.onboarding.getSession.useQuery();
  const { data: assessment } = trpc.assessment.getOrCreate.useQuery();
  const { data: learningPlan } = trpc.learning.getMyPlan.useQuery();

  const radarScores = (assessment?.radarScores as RadarScore[]) ?? [];
  const onboardingStatus = onboarding?.status ?? "pending";
  const assessmentStatus = assessment?.status ?? "pending";

  const onboardingCfg = STATUS_CONFIG[onboardingStatus];
  const assessmentCfg = STATUS_CONFIG[assessmentStatus];

  const strengths = radarScores.filter((r) => r.score >= r.expected).sort((a, b) => b.score - a.score).slice(0, 2);
  const gaps = radarScores.filter((r) => r.score < r.expected).sort((a, b) => (a.score - a.expected) - (b.score - b.expected)).slice(0, 2);

  return (
    <PageTransition>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ── Welcome header ── */}
          <motion.div
            className="flex items-start justify-between"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Bienvenido, {user?.name?.split(" ")[0] ?? "Colaborador"} 👋
              </h1>
              <p className="text-muted-foreground mt-1">
                Aquí puedes ver tu progreso en el programa de desarrollo de competencias.
              </p>
            </div>
            <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center">
              <User size={18} className="text-white" />
            </div>
          </motion.div>

          {/* ── Status cards con StaggerContainer ── */}
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Onboarding card */}
            <StaggerItem>
              <GlassCard
                variant={onboardingStatus === "completed" ? "success" : "default"}
                className="p-5 h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
                    <BrainCircuit size={18} className="text-white" />
                  </div>
                  <Badge className={`text-xs ${onboardingCfg.color}`}>
                    <onboardingCfg.icon size={11} className="mr-1" />
                    {onboardingCfg.label}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Onboarding Conversacional</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {onboardingStatus === "completed"
                    ? "Tu perfil de competencias fue registrado exitosamente."
                    : "Completa el onboarding para que el agente AI construya tu perfil de competencias."}
                </p>
                {onboardingStatus !== "completed" && (
                  <Button
                    size="sm"
                    className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                    onClick={() => navigate("/onboarding")}
                  >
                    {onboardingStatus === "in_progress" ? "Continuar" : "Comenzar"}
                    <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                )}
              </GlassCard>
            </StaggerItem>

            {/* Proof of Skills card */}
            <StaggerItem>
              <GlassCard
                variant={assessmentStatus === "completed" ? "success" : "default"}
                className="p-5 h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Target size={18} className="text-purple-600" />
                  </div>
                  <Badge className={`text-xs ${assessmentCfg.color}`}>
                    <assessmentCfg.icon size={11} className="mr-1" />
                    {assessmentCfg.label}
                  </Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Proof of Skills</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {assessmentStatus === "completed"
                    ? `Puntaje general: ${Math.round(assessment?.overallScore ?? 0)}/100`
                    : "Evalúa tus competencias en los 6 Macro Dominios estratégicos."}
                </p>
                <Button
                  size="sm"
                  variant={assessmentStatus === "completed" ? "outline" : "default"}
                  className={`btn-press w-full ${assessmentStatus !== "completed" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                  onClick={() => navigate("/proof-of-skills")}
                >
                  {assessmentStatus === "completed" ? "Ver Resultados" : assessmentStatus === "in_progress" ? "Continuar" : "Comenzar"}
                  <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </GlassCard>
            </StaggerItem>

            {/* Learning Path card */}
            <StaggerItem>
              <GlassCard
                variant={learningPlan?.plan ? "success" : "default"}
                className="p-5 h-full"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Sparkles size={18} className="text-amber-600" />
                  </div>
                  {learningPlan?.plan ? (
                    <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 size={11} className="mr-1" />
                      Activo
                    </Badge>
                  ) : (
                    <Badge className="text-xs bg-muted text-muted-foreground border-border">
                      <Clock size={11} className="mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-foreground mb-1">Ruta de Aprendizaje</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {learningPlan?.plan
                    ? `${learningPlan.plan.domains.flatMap(d => d.actions).filter(a => a.completed).length}/${learningPlan.plan.totalActions} acciones completadas`
                    : assessmentStatus === "completed"
                    ? "Tu evaluación está lista. Genera tu plan personalizado."
                    : "Completa el Proof of Skills para desbloquear tu ruta."}
                </p>
                <Button
                  size="sm"
                  disabled={assessmentStatus !== "completed"}
                  className={`btn-press w-full ${assessmentStatus === "completed" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}`}
                  variant={assessmentStatus !== "completed" ? "outline" : "default"}
                  onClick={() => navigate("/learning-path")}
                >
                  {learningPlan?.plan ? "Ver mi Plan" : "Generar Plan"}
                  <ArrowRight size={14} className="ml-1.5" />
                </Button>
              </GlassCard>
            </StaggerItem>
          </StaggerContainer>

          {/* ── Radar chart — solo si evaluación completada ── */}
          {assessmentStatus === "completed" && radarScores.length > 0 && (
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              {/* Radar */}
              <div className="lg:col-span-2">
                <Card className="card-soft border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 size={15} className="text-primary" />
                      Mi Perfil de Competencias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HexRadarChart scores={radarScores} size={280} />
                    <RadarLegend />
                  </CardContent>
                </Card>
              </div>

              {/* Insights */}
              <div className="space-y-4">
                {/* Fortalezas */}
                <GlassCard variant="success" className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp size={13} className="text-emerald-700" />
                    <span className="text-xs font-semibold text-emerald-700">Mis Fortalezas</span>
                  </div>
                  <div className="space-y-2">
                    {strengths.length > 0 ? strengths.map((r) => (
                      <div key={r.domain} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{r.domain}</span>
                        <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                          {r.score}/100
                        </Badge>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground">Sin fortalezas identificadas aún.</p>
                    )}
                  </div>
                </GlassCard>

                {/* Áreas de mejora */}
                <GlassCard variant="danger" className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingDown size={13} className="text-rose-600" />
                    <span className="text-xs font-semibold text-rose-600">Áreas de Mejora</span>
                  </div>
                  <div className="space-y-2">
                    {gaps.length > 0 ? gaps.map((r) => (
                      <div key={r.domain} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{r.domain}</span>
                        <Badge className="text-xs bg-rose-50 text-rose-600 border-rose-200">
                          {r.score}/100
                        </Badge>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground">¡Superaste todos los niveles esperados!</p>
                    )}
                  </div>
                </GlassCard>

                {/* AI summary */}
                {assessment?.summary && (
                  <GlassCard variant="accent" className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Sparkles size={13} className="text-primary" />
                      <span className="text-xs font-semibold text-primary">Análisis AI</span>
                    </div>
                    <p className="text-xs text-foreground leading-relaxed line-clamp-5">
                      {assessment.summary}
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-primary p-0 h-auto text-xs mt-1"
                      onClick={() => navigate("/proof-of-skills")}
                    >
                      Ver análisis completo →
                    </Button>
                  </GlassCard>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Expectativas por Rol vs. Nivel Actual con AnimatedProgressBar ── */}
          {assessmentStatus === "completed" && radarScores.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card className="card-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target size={15} className="text-primary" />
                    Expectativas por Rol vs. Mi Nivel Actual
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Comparación entre el nivel esperado para tu rol y tu resultado en cada Macro Dominio.
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {radarScores.map((r, idx) => {
                      const gap = r.score - r.expected;
                      const severity =
                        gap >= 10 ? "exceeds" :
                        gap >= -5 ? "on-track" :
                        gap >= -20 ? "moderate" : "critical";
                      const severityConfig = {
                        exceeds: { label: "Supera", color: "emerald" as const, text: "text-emerald-700" },
                        "on-track": { label: "En nivel", color: "primary" as const, text: "text-primary" },
                        moderate: { label: "Brecha moderada", color: "amber" as const, text: "text-amber-700" },
                        critical: { label: "Brecha crítica", color: "rose" as const, text: "text-rose-600" },
                      }[severity];
                      return (
                        <div key={r.domain} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{r.domain}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Esperado: {r.expected}</span>
                              <Badge className={`text-xs border ${severityConfig.text} bg-transparent`}>
                                {severityConfig.label}
                              </Badge>
                              <span className="text-xs font-semibold text-foreground">{r.score}/100</span>
                            </div>
                          </div>
                          <AnimatedProgressBar
                            value={r.score}
                            expected={r.expected}
                            color={severityConfig.color}
                            height={8}
                            delay={idx * 80}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>
      </div>
    </PageTransition>
  );
}
