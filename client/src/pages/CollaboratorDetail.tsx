/**
 * CollaboratorDetail — Vista de detalle de un colaborador para el Administrador P&C.
 * Muestra perfil, estado de onboarding, radar de competencias, brechas y evidencias.
 */
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
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
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  completed: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { label: "En progreso", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border" },
};

type Props = { userId: number };

export default function CollaboratorDetail({ userId }: Props) {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.admin.getCollaboratorDetail.useQuery({ userId });

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="btn-press" onClick={() => navigate("/dashboard/admin")}>
            <ArrowLeft size={14} className="mr-1.5" /> Volver
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
        </div>

        {/* Info cards row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-soft border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Cargo</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{user.jobTitle ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{user.department ?? "Sin área"}</p>
            </CardContent>
          </Card>

          <Card className="card-soft border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-emerald-600" />
                <span className="text-xs font-medium text-muted-foreground">Onboarding</span>
              </div>
              <Badge className={`text-xs ${onbCfg.color}`}>{onbCfg.label}</Badge>
              {onboarding?.messageCount != null && (
                <p className="text-xs text-muted-foreground mt-1">{onboarding.messageCount} mensajes</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft border-border">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-purple-600" />
                <span className="text-xs font-medium text-muted-foreground">Evaluación</span>
              </div>
              <Badge className={`text-xs ${asmCfg.color}`}>{asmCfg.label}</Badge>
              {assessment?.questionCount != null && (
                <p className="text-xs text-muted-foreground mt-1">{assessment.questionCount} preguntas</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft border-border">
            <CardContent className="pt-4">
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
            </CardContent>
          </Card>
        </div>

        {/* Radar + Domain breakdown */}
        {radarScores.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
                <CardContent className="space-y-4">
                  {radarScores.map((r) => {
                    const gap = r.score - r.expected;
                    return (
                      <div key={r.domain}>
                        <div className="flex items-center justify-between mb-1.5">
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
                        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                          <div className="absolute top-0 left-0 h-full rounded-full bg-primary/25" style={{ width: `${r.expected}%` }} />
                          <div className={`absolute top-0 left-0 h-full rounded-full transition-all ${r.score >= r.expected ? "bg-primary" : "bg-rose-400"}`} style={{ width: `${r.score}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* AI Summary */}
        {assessment?.summary && (
          <Card className="card-soft border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary">Resumen AI de la Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{assessment.summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Onboarding profile */}
        {onboarding?.profile && Object.keys(onboarding.profile).length > 0 && (
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
        )}

        {/* Learning Plan section */}
        {learningData && (
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

                {/* Domains */}
                <div className="space-y-3">
                  {learningData.plan.domains.map((domain) => {
                    const completedActions = domain.actions.filter(a => a.completed).length;
                    const progress = domain.actions.length > 0
                      ? Math.round((completedActions / domain.actions.length) * 100)
                      : 0;
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
                        <Progress value={progress} className="h-1.5 mb-2" />
                        <p className="text-xs text-muted-foreground">{domain.rationale}</p>
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
        )}

        {/* Timeline de actividad */}
        {(data.timeline && data.timeline.length > 0) && (
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
        )}

        {/* Fechas clave al pie */}
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
  );
}
