import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import { useLocation } from "wouter";
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

  const radarScores = (assessment?.radarScores as RadarScore[]) ?? [];
  const onboardingStatus = onboarding?.status ?? "pending";
  const assessmentStatus = assessment?.status ?? "pending";

  const onboardingCfg = STATUS_CONFIG[onboardingStatus];
  const assessmentCfg = STATUS_CONFIG[assessmentStatus];

  const strengths = radarScores.filter((r) => r.score >= r.expected).sort((a, b) => b.score - a.score).slice(0, 2);
  const gaps = radarScores.filter((r) => r.score < r.expected).sort((a, b) => (a.score - a.expected) - (b.score - b.expected)).slice(0, 2);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome header */}
        <div className="flex items-start justify-between">
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
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Onboarding card */}
          <Card className="card-soft border-border">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg brand-gradient flex items-center justify-center">
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
            </CardContent>
          </Card>

          {/* Proof of Skills card */}
          <Card className="card-soft border-border">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
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
            </CardContent>
          </Card>
        </div>

        {/* Radar chart — only if assessment completed */}
        {assessmentStatus === "completed" && radarScores.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              {/* Strengths */}
              <Card className="card-soft border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-emerald-700">
                    <TrendingUp size={13} />
                    Mis Fortalezas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
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
                </CardContent>
              </Card>

              {/* Gaps */}
              <Card className="card-soft border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs flex items-center gap-1.5 text-rose-600">
                    <TrendingDown size={13} />
                    Áreas de Mejora
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {gaps.length > 0 ? gaps.map((r) => (
                    <div key={r.domain} className="flex items-center justify-between">
                      <span className="text-xs text-foreground">{r.domain}</span>
                      <div className="flex items-center gap-1">
                        <Badge className="text-xs bg-rose-50 text-rose-600 border-rose-200">
                          {r.score}/100
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground">¡Superaste todos los niveles esperados!</p>
                  )}
                </CardContent>
              </Card>

              {/* AI summary */}
              {assessment?.summary && (
                <Card className="card-soft border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5 text-primary">
                      <Sparkles size={13} />
                      Análisis AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
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
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Role expectations gap table — Sprint 2: shows expected vs actual per domain */}
        {assessmentStatus === "completed" && radarScores.length > 0 && (
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
              <div className="space-y-3">
                {radarScores.map((r) => {
                  const gap = r.score - r.expected;
                  const pct = Math.round((r.score / 100) * 100);
                  const expPct = Math.round((r.expected / 100) * 100);
                  const severity =
                    gap >= 10 ? "exceeds" :
                    gap >= -5 ? "on-track" :
                    gap >= -20 ? "moderate" : "critical";
                  const severityConfig = {
                    exceeds: { label: "Supera", bar: "bg-emerald-500", text: "text-emerald-700" },
                    "on-track": { label: "En nivel", bar: "bg-primary", text: "text-primary" },
                    moderate: { label: "Brecha moderada", bar: "bg-amber-500", text: "text-amber-700" },
                    critical: { label: "Brecha crítica", bar: "bg-rose-500", text: "text-rose-600" },
                  }[severity];
                  return (
                    <div key={r.domain} className="space-y-1">
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
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        {/* Expected marker */}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-foreground/30 z-10"
                          style={{ left: `${expPct}%` }}
                        />
                        {/* Actual score bar */}
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${severityConfig.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                La línea vertical indica el nivel esperado para tu rol. La barra de color muestra tu nivel actual.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Empty state if nothing done */}
        {onboardingStatus === "pending" && assessmentStatus === "pending" && (
          <Card className="card-soft border-dashed border-2 border-border">
            <CardContent className="py-12 text-center">
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center mx-auto mb-4">
                <BrainCircuit size={24} className="text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Comienza tu journey de desarrollo</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                El primer paso es completar el onboarding conversacional para que el agente AI
                construya tu perfil de competencias.
              </p>
              <Button
                className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/onboarding")}
              >
                Iniciar Onboarding
                <ArrowRight size={15} className="ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
