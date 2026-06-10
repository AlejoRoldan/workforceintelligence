/**
 * LearningPath — Personalized AI-generated development plan.
 * Shows domain-by-domain actions, resources, progress tracking and overall stats.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Wrench,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LearningPlan, LearningDomainPlan, LearningAction, MacroDomain } from "../../../drizzle/schema";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  critical: { label: "Crítico", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  moderate: { label: "Moderado", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "on-track": { label: "En nivel", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
} as const;

const ACTION_PRIORITY_CONFIG = {
  high: { label: "Alta", color: "text-red-600" },
  medium: { label: "Media", color: "text-amber-600" },
  low: { label: "Baja", color: "text-slate-500" },
} as const;

const RESOURCE_ICONS: Record<LearningAction["resourceType"], React.ReactNode> = {
  course: <GraduationCap className="w-4 h-4" />,
  book: <BookOpen className="w-4 h-4" />,
  practice: <Wrench className="w-4 h-4" />,
  mentoring: <Users className="w-4 h-4" />,
  project: <Target className="w-4 h-4" />,
};

const RESOURCE_LABELS: Record<LearningAction["resourceType"], string> = {
  course: "Curso",
  book: "Libro",
  practice: "Práctica",
  mentoring: "Mentoría",
  project: "Proyecto",
};

const DOMAIN_COLORS: Record<MacroDomain, string> = {
  "Digital & GenAI": "from-violet-500 to-purple-600",
  "Liderazgo Moderno": "from-emerald-500 to-teal-600",
  "Operación Ágil": "from-blue-500 to-cyan-600",
  "Customer Experience": "from-orange-500 to-amber-600",
  "Data-driven": "from-indigo-500 to-blue-600",
  "Innovación": "from-pink-500 to-rose-600",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionCard({
  action,
  planId,
  domainName,
  onToggle,
}: {
  action: LearningAction;
  planId: number;
  domainName: string;
  onToggle: (actionId: string, completed: boolean) => void;
}) {
  const priorityCfg = ACTION_PRIORITY_CONFIG[action.priority];

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border transition-all duration-200 ${
        action.completed
          ? "bg-emerald-50 border-emerald-200 opacity-80"
          : "bg-white border-slate-200 hover:border-[#17B890]/40 hover:shadow-sm"
      }`}
    >
      <button
        onClick={() => onToggle(action.id, !action.completed)}
        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
        aria-label={action.completed ? "Marcar como pendiente" : "Marcar como completada"}
      >
        {action.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300 hover:text-[#17B890]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${action.completed ? "line-through text-slate-400" : "text-slate-800"}`}>
            {action.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs font-medium ${priorityCfg.color}`}>
              {priorityCfg.label}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.description}</p>

        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {RESOURCE_ICONS[action.resourceType]}
            {RESOURCE_LABELS[action.resourceType]}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {action.estimatedHours}h
          </span>
          {action.resourceUrl && (
            <a
              href={action.resourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#17B890] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Ver recurso
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DomainCard({
  domainPlan,
  planId,
  onActionToggle,
}: {
  domainPlan: LearningDomainPlan;
  planId: number;
  onActionToggle: (domainName: string, actionId: string, completed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const priorityCfg = PRIORITY_CONFIG[domainPlan.priority];
  const gradientClass = DOMAIN_COLORS[domainPlan.domain] ?? "from-slate-500 to-slate-600";

  const completedActions = domainPlan.actions.filter((a) => a.completed).length;
  const totalActions = domainPlan.actions.length;
  const progress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <Card className="overflow-hidden shadow-sm border-slate-200">
      <div className={`h-1.5 bg-gradient-to-r ${gradientClass}`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold text-slate-800">
                {domainPlan.domain}
              </CardTitle>
              <Badge variant="outline" className={`text-xs px-2 py-0.5 ${priorityCfg.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot} mr-1.5 inline-block`} />
                {priorityCfg.label}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-slate-500">
                Actual: <strong className="text-slate-700">{domainPlan.currentScore}</strong>/100
              </span>
              <span className="text-xs text-slate-500">
                Esperado: <strong className="text-slate-700">{domainPlan.expectedScore}</strong>/100
              </span>
              <span className="text-xs font-medium text-red-600">
                Brecha: +{domainPlan.gap}
              </span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-500 mb-1">{completedActions}/{totalActions} acciones</p>
            <div className="w-24">
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed italic">
          <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
          {domainPlan.rationale}
        </p>
      </CardHeader>

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors border-t border-slate-100"
      >
        <span>{expanded ? "Ocultar acciones" : `Ver ${totalActions} acciones`}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4">
          <div className="space-y-2 mt-1">
            {domainPlan.actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                planId={planId}
                domainName={domainPlan.domain}
                onToggle={(actionId, completed) => onActionToggle(domainPlan.domain, actionId, completed)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LearningPath() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: planData, isLoading, error } = trpc.learning.getMyPlan.useQuery();

  const generateMutation = trpc.learning.generate.useMutation({
    onSuccess: () => {
      utils.learning.getMyPlan.invalidate();
      toast.success("¡Tu ruta de aprendizaje está lista!");
    },
    onError: (err) => {
      toast.error(err.message ?? "Error al generar el plan");
    },
  });

  const toggleActionMutation = trpc.learning.updateActionStatus.useMutation({
    onSuccess: () => {
      utils.learning.getMyPlan.invalidate();
    },
    onError: () => {
      toast.error("No se pudo actualizar la acción");
    },
  });

  const handleActionToggle = (domainName: string, actionId: string, completed: boolean) => {
    if (!planData?.id) return;
    toggleActionMutation.mutate({ planId: planData.id, domainName, actionId, completed });
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── No plan yet ──
  if (!planData || !planData.plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 bg-[#17B890]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[#17B890]" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Tu Ruta de Aprendizaje</h1>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Basado en los resultados de tu Proof of Skills, la IA generará un plan de desarrollo
          personalizado con acciones concretas para cada dominio donde tengas brechas.
        </p>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error.message}
          </div>
        )}

        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="bg-[#17B890] hover:bg-[#14a07e] text-white px-6 py-2.5 rounded-xl font-medium transition-all active:scale-95"
          size="lg"
        >
          {generateMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generando tu plan...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generar mi Ruta de Aprendizaje
            </>
          )}
        </Button>

        <p className="text-xs text-slate-400 mt-3">
          El proceso toma aproximadamente 15-30 segundos
        </p>

        <Button
          variant="ghost"
          onClick={() => navigate("/proof-of-skills")}
          className="mt-4 text-slate-500"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a mis resultados
        </Button>
      </div>
    );
  }

  const plan = planData.plan as LearningPlan;
  const allActions = plan.domains.flatMap((d) => d.actions);
  const completedActions = allActions.filter((a) => a.completed).length;
  const overallProgress = allActions.length > 0
    ? Math.round((completedActions / allActions.length) * 100)
    : 0;

  const criticalDomains = plan.domains.filter((d) => d.priority === "critical").length;
  const moderateDomains = plan.domains.filter((d) => d.priority === "moderate").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Mi Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-800">Mi Ruta de Aprendizaje</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Plan personalizado para {user?.name ?? "ti"} · {plan.jobTitle}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="text-slate-500 border-slate-200 hover:border-[#17B890] hover:text-[#17B890] transition-colors"
        >
          {generateMutation.isPending ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span className="ml-1.5 hidden sm:inline">Regenerar</span>
        </Button>
      </div>

      {/* Executive Summary Card */}
      <Card className="border-[#17B890]/30 bg-gradient-to-br from-[#17B890]/5 to-white shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#17B890]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-[#17B890]" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Resumen Ejecutivo</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{plan.executiveSummary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{overallProgress}%</p>
            <p className="text-xs text-slate-500 mt-0.5">Progreso general</p>
            <Progress value={overallProgress} className="h-1 mt-2" />
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{completedActions}/{allActions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Acciones completadas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{criticalDomains}</p>
            <p className="text-xs text-slate-500 mt-0.5">Dominios críticos</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{plan.estimatedTotalHours}h</p>
            <p className="text-xs text-slate-500 mt-0.5">Horas estimadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Priority alert */}
      {criticalDomains > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Prioridad alta:</strong> Tienes {criticalDomains} dominio{criticalDomains > 1 ? "s" : ""} con brecha crítica.
            Comienza por <strong>{plan.topPriorityDomain}</strong>.
          </span>
        </div>
      )}

      <Separator />

      {/* Domain Plans */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#17B890]" />
          Plan por Dominio
          <Badge variant="outline" className="text-xs ml-1">
            {plan.domains.length} dominio{plan.domains.length !== 1 ? "s" : ""}
          </Badge>
        </h2>

        <div className="space-y-4">
          {/* Sort: critical first, then moderate */}
          {[...plan.domains]
            .sort((a, b) => {
              const order = { critical: 0, moderate: 1, "on-track": 2 };
              return order[a.priority] - order[b.priority];
            })
            .map((domainPlan) => (
              <DomainCard
                key={domainPlan.domain}
                domainPlan={domainPlan}
                planId={planData.id}
                onActionToggle={handleActionToggle}
              />
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-slate-400">
          Plan generado el {new Date(plan.generatedAt).toLocaleDateString("es-PY", {
            year: "numeric", month: "long", day: "numeric"
          })} · {moderateDomains + criticalDomains} dominio{moderateDomains + criticalDomains !== 1 ? "s" : ""} con oportunidades de mejora
        </p>
      </div>
    </div>
  );
}
