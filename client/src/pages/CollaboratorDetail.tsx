/**
 * CollaboratorDetail — Vista de detalle de un colaborador para el Administrador P&C.
 * Sprint UX/UI: PageTransition, GlassCard, AnimatedProgressBar, motion depth en secciones.
 */
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedProgressBar } from "@/components/ui/animated-progress";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  User,
  CheckCircle2,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
  BookOpen,
  Sparkles,
  Clock,
  AlertTriangle,
  Download,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  completed: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { label: "En progreso", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border" },
};

type Props = { userId: number };

export default function CollaboratorDetail({ userId }: Props) {
  const [, navigate] = useLocation();
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const { data, isLoading, error } = trpc.admin.getCollaboratorDetail.useQuery({ userId });

  async function handleExportPdf() {
    setIsPdfLoading(true);
    try {
      const res = await fetch(`/api/export/collaborator-pdf/${userId}`);
      if (!res.ok) throw new Error("Error generando PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${(data?.user?.name ?? "colaborador").toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPdfLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="text-rose-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No se pudo cargar el colaborador</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/dashboard/admin")}>
            <ArrowLeft size={14} className="mr-1.5" /> Volver
          </Button>
        </div>
      </div>
    );
  }

  const { user, onboarding, assessment } = data;
  const { data: learningData } = trpc.admin.getCollaboratorPlan.useQuery({ userId });
  const radarScores = (assessment?.radarScores ?? []) as RadarScore[];
  const onbCfg = STATUS_BADGE[onboarding?.status ?? "pending"]!;
  const asmCfg = STATUS_BADGE[assessment?.status ?? "pending"]!;

  return (
    <PageTransition>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ── Header ── */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button variant="outline" size="sm" className="btn-press" onClick={() => navigate("/dashboard/admin")}>
              <ArrowLeft size={14} className="mr-1.5" /> Volver
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="btn-press ml-auto"
              onClick={handleExportPdf}
              disabled={isPdfLoading}
            >
              {isPdfLoading ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Download size={14} className="mr-1.5" />
              )}
              {isPdfLoading ? "Generando..." : "Exportar PDF"}
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-white text-lg font-bold">
                  {(user.name ?? "?")[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{user.name ?? "Sin nombre"}</h1>
                <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
              </div>
            </div>
          </motion.div>

          {/* ── Info cards con StaggerContainer ── */}
          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StaggerItem>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User size={14} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Cargo</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{user.jobTitle ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{user.department ?? "Sin área"}</p>
              </GlassCard>
            </StaggerItem>

            <StaggerItem>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-emerald-600" />
                  <span className="text-xs font-medium text-muted-foreground">Onboarding</span>
                </div>
                <Badge className={`text-xs ${onbCfg.color}`}>{onbCfg.label}</Badge>
                {onboarding?.messageCount != null && (
                  <p className="text-xs text-muted-foreground mt-1">{onboarding.messageCount} mensajes</p>
                )}
              </GlassCard>
            </StaggerItem>

            <StaggerItem>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-purple-600" />
                  <span className="text-xs font-medium text-muted-foreground">Evaluación</span>
                </div>
                <Badge className={`text-xs ${asmCfg.color}`}>{asmCfg.label}</Badge>
                {assessment?.questionCount != null && (
                  <p className="text-xs text-muted-foreground mt-1">{assessment.questionCount} preguntas</p>
                )}
              </GlassCard>
            </StaggerItem>

            <StaggerItem>
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={14} className="text-amber-600" />
                  <span className="text-xs font-medium text-muted-foreground">Puntaje</span>
                </div>
                {assessment?.overallScore != null ? (
                  <p className={`text-2xl font-bold ${
                    assessment.overallScore >= 70 ? "text-emerald-600"
                    : assessment.overallScore >= 50 ? "text-amber-600"
                    : "text-rose-500"
                  }`}>
                    {Math.round(assessment.overallScore)}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin evaluar</p>
                )}
              </GlassCard>
            </StaggerItem>
          </StaggerContainer>

          {/* ── Radar + Domain breakdown con AnimatedProgressBar ── */}
          {radarScores.length > 0 && (
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="lg:col-span-2">
                <Card className="card-soft border-border h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 size={15} className="text-primary" />
                      Perfil de Competencias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HexRadarChart scores={radarScores} size={260} />
                    <RadarLegend />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-3">
                <Card className="card-soft border-border h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Brechas por Macro Dominio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {radarScores.map((r, idx) => {
                      const gap = r.score - r.expected;
                      const barColor =
                        gap >= 10 ? "emerald" :
                        gap >= -5 ? "primary" :
                        gap >= -20 ? "amber" : "rose";
                      return (
                        <div key={r.domain}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-foreground">{r.domain}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Esp: {r.expected}</span>
                              <span className="font-semibold">{r.score}/100</span>
                              <span className={`flex items-center gap-0.5 font-semibold ${gap > 0 ? "text-emerald-600" : gap < 0 ? "text-rose-500" : "text-muted-foreground"}`}>
                                {gap > 0 ? <TrendingUp size={11} /> : gap < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                                {gap >= 0 ? "+" : ""}{gap}
                              </span>
                            </div>
                          </div>
                          <AnimatedProgressBar
                            value={r.score}
                            expected={r.expected}
                            color={barColor as "primary" | "emerald" | "amber" | "rose"}
                            height={8}
                            delay={idx * 80}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* ── AI Summary ── */}
          {assessment?.summary && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <GlassCard variant="accent" className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={15} className="text-primary" />
                  <span className="text-sm font-semibold text-primary">Resumen AI de la Evaluación</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{assessment.summary}</p>
              </GlassCard>
            </motion.div>
          )}

          {/* ── Onboarding profile ── */}
          {onboarding?.profile && Object.keys(onboarding.profile).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card className="card-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare size={15} className="text-primary" />
                    Perfil Extraído del Onboarding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(onboarding.profile).map(([domain, score]) => (
                      <div key={domain} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{domain}</p>
                        <p className="text-lg font-bold text-primary">{score}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Learning Plan ── */}
          {learningData && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="card-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen size={15} className="text-primary" />
                    Ruta de Aprendizaje
                    <Badge
                      className={`text-xs ml-1 ${
                        learningData.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : learningData.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {learningData.status === "completed" ? "Completada"
                        : learningData.status === "in_progress" ? "En progreso"
                        : learningData.status === "ready" ? "Lista" : "Generando"}
                    </Badge>
                  </CardTitle>
                  {learningData.plan && (
                    <p className="text-xs text-muted-foreground mt-1">{learningData.plan.executiveSummary}</p>
                  )}
                </CardHeader>
                {learningData.plan && (
                  <CardContent className="space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                        <p className="text-lg font-bold text-foreground">{learningData.plan.totalActions}</p>
                        <p className="text-xs text-muted-foreground">Acciones</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                        <p className="text-lg font-bold text-foreground">{learningData.plan.estimatedTotalHours}h</p>
                        <p className="text-xs text-muted-foreground">Estimadas</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                        <p className="text-lg font-bold text-rose-500">
                          {learningData.plan.domains.filter(d => d.priority === "critical").length}
                        </p>
                        <p className="text-xs text-muted-foreground">Críticos</p>
                      </div>
                    </div>

                    {/* Domains con AnimatedProgressBar */}
                    <div className="space-y-3">
                      {learningData.plan.domains.map((domain, idx) => {
                        const completedActions = domain.actions.filter(a => a.completed).length;
                        const progress = domain.actions.length > 0
                          ? Math.round((completedActions / domain.actions.length) * 100)
                          : 0;
                        const barColor =
                          domain.priority === "critical" ? "rose" :
                          domain.priority === "moderate" ? "amber" : "emerald";
                        return (
                          <div key={domain.domain} className="p-3 rounded-lg border border-border bg-background">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {domain.priority === "critical" && <AlertTriangle size={13} className="text-rose-500" />}
                                {domain.priority === "moderate" && <Target size={13} className="text-amber-500" />}
                                {domain.priority === "on-track" && <CheckCircle2 size={13} className="text-emerald-500" />}
                                <span className="text-sm font-medium text-foreground">{domain.domain}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">{completedActions}/{domain.actions.length}</span>
                                <span className={`font-semibold ${
                                  domain.priority === "critical" ? "text-rose-500"
                                  : domain.priority === "moderate" ? "text-amber-600"
                                  : "text-emerald-600"
                                }`}>
                                  {domain.priority === "critical" ? "Crítico"
                                    : domain.priority === "moderate" ? "Moderado" : "En ruta"}
                                </span>
                              </div>
                            </div>
                            <AnimatedProgressBar
                              value={progress}
                              color={barColor as "rose" | "amber" | "emerald"}
                              height={6}
                              delay={idx * 60}
                            />
                            <p className="text-xs text-muted-foreground mt-2">{domain.rationale}</p>
                          </div>
                        );
                      })}
                    </div>

                    {learningData.generatedAt && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles size={11} className="text-primary" />
                        Plan generado el {new Date(learningData.generatedAt).toLocaleDateString("es-PY")}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            </motion.div>
          )}

          {/* ── Timeline de actividad ── */}
          {(data.timeline && data.timeline.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <Card className="card-soft border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock size={15} className="text-primary" />
                    Historial de Actividad
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative pl-5 space-y-4">
                    <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                    {data.timeline.map((event, idx) => (
                      event && (
                        <div key={idx} className="relative flex items-start gap-3">
                          <div className={`absolute -left-3 mt-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${
                            event.status === "completed" ? "bg-emerald-500"
                            : event.status === "in_progress" ? "bg-amber-400"
                            : "bg-muted-foreground"
                          }`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{event.label}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar size={10} />
                              {new Date(event.date).toLocaleDateString("es-PY", {
                                year: "numeric", month: "long", day: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ── Fechas clave al pie ── */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pb-4">
            {onboarding?.startedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar size={12} />
                <span>Onboarding iniciado: {new Date(onboarding.startedAt).toLocaleDateString("es-PY")}</span>
              </div>
            )}
            {onboarding?.completedAt && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Onboarding completado: {new Date(onboarding.completedAt).toLocaleDateString("es-PY")}</span>
              </div>
            )}
            {assessment?.startedAt && (
              <div className="flex items-center gap-1.5">
                <Target size={12} className="text-purple-600" />
                <span>Evaluación iniciada: {new Date(assessment.startedAt).toLocaleDateString("es-PY")}</span>
              </div>
            )}
            {assessment?.completedAt && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Evaluación completada: {new Date(assessment.completedAt).toLocaleDateString("es-PY")}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </PageTransition>
  );
}
