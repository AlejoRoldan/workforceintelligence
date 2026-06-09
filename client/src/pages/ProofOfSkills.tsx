import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import { useLocation } from "wouter";
import {
  Target,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw,
  Sparkles,
  BrainCircuit,
} from "lucide-react";

type AssessmentQuestion = {
  id: string;
  question: string;
  macroDomain: string;
  competencyLayer: string;
  type: string;
};

const DOMAIN_COLORS: Record<string, string> = {
  "Digital & GenAI": "bg-blue-50 text-blue-700 border-blue-200",
  "Liderazgo Moderno": "bg-purple-50 text-purple-700 border-purple-200",
  "Operación Ágil": "bg-amber-50 text-amber-700 border-amber-200",
  "Customer Experience": "bg-rose-50 text-rose-700 border-rose-200",
  "Data-driven": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Innovación": "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ProofOfSkills() {
  const [, navigate] = useLocation();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: assessment, refetch } = trpc.assessment.getOrCreate.useQuery();
  const generateMutation = trpc.assessment.generateQuestions.useMutation({
    onSuccess: () => refetch(),
  });
  const submitMutation = trpc.assessment.submitAnswers.useMutation({
    onSuccess: () => refetch(),
  });
  const resetMutation = trpc.assessment.reset.useMutation({
    onSuccess: () => {
      setCurrentQ(0);
      setAnswers({});
      refetch();
    },
  });

  const questions = (assessment?.questions as AssessmentQuestion[]) ?? [];
  const radarScores = (assessment?.radarScores as RadarScore[]) ?? [];
  const isCompleted = assessment?.status === "completed";
  const hasQuestions = questions.length > 0;
  const currentQuestion = questions[currentQ];

  const handleGenerate = async () => {
    await generateMutation.mutateAsync();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const answersArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] ?? "",
      }));
      await submitMutation.mutateAsync({ answers: answersArray });
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = questions.every((q) => (answers[q.id]?.trim().length ?? 0) > 10);
  const progressPct = questions.length > 0 ? Math.round(((currentQ + 1) / questions.length) * 100) : 0;

  // ── Results view ──────────────────────────────────────────────────────────
  if (isCompleted && radarScores.length > 0) {
    const strengths = radarScores.filter((r) => r.score >= r.expected).sort((a, b) => b.score - a.score);
    const gaps = radarScores.filter((r) => r.score < r.expected).sort((a, b) => (a.score - a.expected) - (b.score - b.expected));

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <h1 className="text-2xl font-bold text-foreground">Resultados — Proof of Skills</h1>
              </div>
              <p className="text-muted-foreground text-sm">
                Perfil de competencias evaluado por IA · {new Date(assessment?.completedAt ?? "").toLocaleDateString("es-PY", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="btn-press"
                onClick={() => resetMutation.mutate()}
              >
                <RotateCcw size={14} className="mr-1.5" />
                Repetir
              </Button>
              <Button
                size="sm"
                className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => navigate("/dashboard")}
              >
                Ver Dashboard
                <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Overall score + radar */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Score card */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="card-soft border-border">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 rounded-full brand-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
                    <span className="text-3xl font-bold text-white">
                      {Math.round(assessment?.overallScore ?? 0)}
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">Puntaje General</p>
                  <p className="text-xs text-muted-foreground mt-1">sobre 100 puntos</p>
                </CardContent>
              </Card>

              {/* Strengths */}
              {strengths.length > 0 && (
                <Card className="card-soft border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                      <TrendingUp size={15} />
                      Fortalezas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {strengths.slice(0, 3).map((r) => (
                      <div key={r.domain} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{r.domain}</span>
                        <Badge className={`text-xs ${DOMAIN_COLORS[r.domain] ?? "bg-muted text-muted-foreground"}`}>
                          {r.score}/100
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Gaps */}
              {gaps.length > 0 && (
                <Card className="card-soft border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-rose-600">
                      <TrendingDown size={15} />
                      Áreas de Mejora
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    {gaps.slice(0, 3).map((r) => (
                      <div key={r.domain} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{r.domain}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge className="text-xs bg-rose-50 text-rose-600 border-rose-200">
                            {r.score}/100
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            (esp. {r.expected})
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Radar chart */}
            <div className="lg:col-span-3">
              <Card className="card-soft border-border h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 size={15} className="text-primary" />
                    Perfil de Competencias por Macro Dominio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HexRadarChart scores={radarScores} size={300} />
                  <RadarLegend />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AI Summary */}
          {assessment?.summary && (
            <Card className="card-soft border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Sparkles size={15} />
                  Análisis AI — Resumen Ejecutivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground leading-relaxed">{assessment.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Domain breakdown */}
          <Card className="card-soft border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Detalle por Macro Dominio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {radarScores.map((r) => {
                const gap = r.score - r.expected;
                return (
                  <div key={r.domain}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${DOMAIN_COLORS[r.domain] ?? "bg-muted"}`}>
                          {r.domain}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Esperado: {r.expected}</span>
                        <span className="font-semibold text-foreground">Actual: {r.score}</span>
                        <span className={`font-semibold flex items-center gap-0.5 ${gap >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                          {gap >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {gap >= 0 ? "+" : ""}{gap}
                        </span>
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full rounded-full bg-primary/30"
                        style={{ width: `${r.expected}%` }}
                      />
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all ${r.score >= r.expected ? "bg-primary" : "bg-rose-400"}`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Start screen ──────────────────────────────────────────────────────────
  if (!hasQuestions) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
            <Target size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Proof of Skills</h1>
          <p className="text-muted-foreground mb-2 leading-relaxed">
            El agente AI generará <strong>6 preguntas personalizadas</strong> para evaluar tus
            competencias en los 6 Macro Dominios estratégicos.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Las preguntas son adaptadas a tu rol y perfil de onboarding. La evaluación toma
            aproximadamente 15-20 minutos.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-8 text-left">
            {["Digital & GenAI", "Liderazgo Moderno", "Operación Ágil", "Customer Experience", "Data-driven", "Innovación"].map((d) => (
              <div key={d} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                {d}
              </div>
            ))}
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground w-full h-11"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Generando preguntas...
              </>
            ) : (
              <>
                <BrainCircuit size={16} className="mr-2" />
                Iniciar Evaluación
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── Question view ─────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center">
              <Target size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Proof of Skills</h1>
              <p className="text-xs text-muted-foreground">
                Pregunta {currentQ + 1} de {questions.length}
              </p>
            </div>
          </div>
          <Badge className={`text-xs ${DOMAIN_COLORS[currentQuestion?.macroDomain ?? ""] ?? "bg-muted"}`}>
            {currentQuestion?.macroDomain}
          </Badge>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Question content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {currentQuestion && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Layer badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Capa: {currentQuestion.competencyLayer}
              </Badge>
            </div>

            {/* Question */}
            <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-base font-medium text-foreground leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>

            {/* Answer */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Tu respuesta
              </label>
              <Textarea
                value={answers[currentQuestion.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))
                }
                placeholder="Describe tu experiencia, conocimiento o enfoque en relación a esta competencia..."
                className="min-h-[160px] text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Mínimo 10 caracteres · La AI evaluará tu respuesta en profundidad
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
                disabled={currentQ === 0}
                className="btn-press"
              >
                <ArrowLeft size={15} className="mr-1.5" />
                Anterior
              </Button>

              {currentQ < questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQ((q) => q + 1)}
                  disabled={!answers[currentQuestion.id]?.trim()}
                  className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Siguiente
                  <ArrowRight size={15} className="ml-1.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={15} className="mr-1.5 animate-spin" />
                      Evaluando con AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} className="mr-1.5" />
                      Finalizar y Ver Resultados
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 pt-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentQ
                      ? "bg-primary w-4"
                      : answers[q.id]?.trim()
                      ? "bg-primary/40"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
