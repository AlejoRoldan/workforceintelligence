/**
 * TeamComparison — Vista comparativa de equipo por departamento.
 * Sprint A: Comparativa de colaboradores con tabla + gráfico de barras agrupadas.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/page-transition";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedProgressBar } from "@/components/ui/animated-progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import {
  BarChart3,
  Users,
  ArrowLeft,
  TrendingUp,
  Target,
  Award,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DOMAIN_COLORS = [
  "#17B890", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4",
];

const STATUS_CONFIG = {
  completed: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { label: "En progreso", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border" },
};

type Collaborator = {
  id: number;
  name: string;
  jobTitle: string;
  department: string;
  onboardingStatus: string;
  assessmentStatus: string;
  overallScore: number | null;
  radarScores: Array<{ domain: string; score: number; expected: number }>;
};

function ScoreCell({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color = score >= 70 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return <span className={`text-sm font-bold tabular-nums ${color}`}>{Math.round(score)}</span>;
}

export default function TeamComparison() {
  const [, navigate] = useLocation();
  const [selectedDept, setSelectedDept] = useState<string>("__all__");

  const { data: departments = [] } = trpc.admin.getDepartments.useQuery();
  const { data: collaborators = [], isLoading } = trpc.admin.getTeamComparison.useQuery(
    { department: selectedDept === "__all__" ? undefined : selectedDept },
    { enabled: true }
  );

  // Build chart data: one entry per domain, bars per collaborator
  const chartData = useMemo(() => {
    if (!collaborators.length) return [];
    const allDomains = collaborators
      .flatMap((c) => c.radarScores.map((r) => r.domain))
      .filter((v, i, a) => a.indexOf(v) === i);

    return allDomains.map((domain) => {
      const entry: Record<string, string | number> = { domain: domain.replace(" & ", " &\n") };
      collaborators.forEach((c) => {
        const rs = c.radarScores.find((r) => r.domain === domain);
        entry[c.name] = rs?.score ?? 0;
      });
      return entry;
    });
  }, [collaborators]);

  const collaboratorNames = collaborators.map((c) => c.name);

  // Stats
  const withScores = collaborators.filter((c) => c.overallScore != null);
  const avgScore = withScores.length
    ? withScores.reduce((s, c) => s + (c.overallScore ?? 0), 0) / withScores.length
    : null;
  const topPerformer = withScores.length
    ? withScores.reduce((a, b) => (a.overallScore ?? 0) > (b.overallScore ?? 0) ? a : b)
    : null;
  const completedCount = collaborators.filter((c) => c.assessmentStatus === "completed").length;

  return (
    <PageTransition>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* Header */}
          <motion.div
            className="flex items-center gap-4 flex-wrap"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button variant="outline" size="sm" className="btn-press" onClick={() => navigate("/dashboard/admin")}>
              <ArrowLeft size={14} className="mr-1.5" /> Volver
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-md shadow-primary/20">
                <BarChart3 size={18} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Comparativa de Equipo</h1>
                <p className="text-sm text-muted-foreground">Análisis comparativo por dominio de competencias</p>
              </div>
            </div>
            <div className="ml-auto">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-48 h-9 text-sm">
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos los departamentos</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <AlertCircle size={32} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No hay colaboradores en este departamento</p>
            </div>
          ) : (
            <>
              {/* KPI Summary */}
              <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StaggerItem>
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">Colaboradores</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{collaborators.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selectedDept === "__all__" ? "Total plataforma" : selectedDept}
                    </p>
                  </GlassCard>
                </StaggerItem>
                <StaggerItem>
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={14} className="text-blue-600" />
                      <span className="text-xs font-medium text-muted-foreground">Evaluados</span>
                    </div>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{completedCount}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      de {collaborators.length} ({Math.round((completedCount / collaborators.length) * 100)}%)
                    </p>
                  </GlassCard>
                </StaggerItem>
                <StaggerItem>
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <span className="text-xs font-medium text-muted-foreground">Puntaje Promedio</span>
                    </div>
                    <p className={`text-2xl font-bold tabular-nums ${avgScore == null ? "text-muted-foreground" : avgScore >= 70 ? "text-emerald-600" : avgScore >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {avgScore != null ? Math.round(avgScore) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">sobre 100</p>
                  </GlassCard>
                </StaggerItem>
                <StaggerItem>
                  <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={14} className="text-amber-600" />
                      <span className="text-xs font-medium text-muted-foreground">Top Performer</span>
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">
                      {topPerformer?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {topPerformer ? `${Math.round(topPerformer.overallScore ?? 0)}/100` : "Sin datos"}
                    </p>
                  </GlassCard>
                </StaggerItem>
              </StaggerContainer>

              {/* Chart de barras agrupadas */}
              {chartData.length > 0 && collaboratorNames.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <GlassCard className="p-6">
                    <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <BarChart3 size={14} className="text-primary" />
                      Comparativa por Macro Dominio
                    </h2>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis
                            dataKey="domain"
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                          <Tooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                            formatter={(value: number) => [`${value}/100`, ""]}
                          />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                          {collaboratorNames.map((name, idx) => (
                            <Bar
                              key={name}
                              dataKey={name}
                              fill={DOMAIN_COLORS[idx % DOMAIN_COLORS.length]}
                              radius={[3, 3, 0, 0]}
                              maxBarSize={24}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Tabla comparativa */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <GlassCard className="p-6">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Users size={14} className="text-primary" />
                    Detalle por Colaborador
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-4">Colaborador</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground pb-3 pr-4">Área</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground pb-3 pr-4">Onboarding</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground pb-3 pr-4">Evaluación</th>
                          <th className="text-center text-xs font-semibold text-muted-foreground pb-3 pr-4">Puntaje</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground pb-3">Progreso por Dominio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {collaborators.map((c, idx) => {
                          const onbCfg = STATUS_CONFIG[c.onboardingStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                          const asmCfg = STATUS_CONFIG[c.assessmentStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                          return (
                            <motion.tr
                              key={c.id}
                              className="hover:bg-muted/30 cursor-pointer transition-colors"
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.05 }}
                              onClick={() => navigate(`/dashboard/admin/collaborator/${c.id}`)}
                            >
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">
                                      {c.name[0]?.toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">{c.name}</p>
                                    <p className="text-xs text-muted-foreground">{c.jobTitle}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 pr-4">
                                <span className="text-xs text-muted-foreground">{c.department}</span>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <Badge className={`text-xs border ${onbCfg.color}`}>{onbCfg.label}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <Badge className={`text-xs border ${asmCfg.color}`}>{asmCfg.label}</Badge>
                              </td>
                              <td className="py-3 pr-4 text-center">
                                <ScoreCell score={c.overallScore} />
                              </td>
                              <td className="py-3 min-w-48">
                                {c.radarScores.length > 0 ? (
                                  <div className="space-y-1">
                                    {c.radarScores.slice(0, 3).map((r) => (
                                      <div key={r.domain} className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground w-20 truncate">{r.domain.split(" ")[0]}</span>
                                        <div className="flex-1">
                                          <AnimatedProgressBar
                                            value={r.score}
                                            expected={r.expected}
                                            className="h-1.5"
                                          />
                                        </div>
                                        <span className="text-xs tabular-nums text-muted-foreground w-6 text-right">{r.score}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Sin datos</span>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
