/**
 * DashboardAdmin — Panel P&C para Administradores.
 * Sprint 4: filtros por área/estado, búsqueda, exportación CSV, enlace a detalle.
 */
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import { useLocation } from "wouter";
import {
  Users,
  CheckCircle2,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Download,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

type Collaborator = {
  id: number;
  name: string | null;
  email: string | null;
  jobTitle: string | null;
  department: string | null;
  onboardingStatus: string;
  assessmentStatus: string;
  overallScore: number | null;
  radarScores: RadarScore[];
  completedAt: Date | null;
};

const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  completed: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { label: "En progreso", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border" },
};

export default function DashboardAdmin() {
  const [, navigate] = useLocation();

  // Filter state
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [assessFilter, setAssessFilter] = useState("all");
  const [onbFilter, setOnbFilter] = useState("all");
  const [csvLoading, setCsvLoading] = useState(false);
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery();
  const { data: allCollaborators = [], isLoading: collabLoading } = trpc.admin.getCollaborators.useQuery();
  const { data: departments = [] } = trpc.admin.getDepartments.useQuery();

  const isLoading = statsLoading || collabLoading;

  // Client-side filtering (fast, no extra network round-trips)
  const collaborators = useMemo(() => {
    let list = allCollaborators as Collaborator[];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.jobTitle?.toLowerCase().includes(q) ||
          c.department?.toLowerCase().includes(q)
      );
    }
    if (deptFilter !== "all") list = list.filter((c) => c.department === deptFilter);
    if (assessFilter !== "all") list = list.filter((c) => c.assessmentStatus === assessFilter);
    if (onbFilter !== "all") list = list.filter((c) => c.onboardingStatus === onbFilter);
    return list;
  }, [allCollaborators, search, deptFilter, assessFilter, onbFilter]);

  const totalPages = Math.max(1, Math.ceil(collaborators.length / PAGE_SIZE));
  const pagedCollaborators = collaborators.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, deptFilter, assessFilter, onbFilter]);

  const domainAverages = stats?.domainAverages ?? [];
  const radarData: RadarScore[] = domainAverages.map((d) => ({
    domain: d.domain,
    score: Math.round(d.average),
    expected: d.expected,
  }));

  // CSV export
  const handleExportCSV = async () => {
    setCsvLoading(true);
    try {
      const response = await fetch("/api/admin/export.csv", { credentials: "include" });
      if (!response.ok) throw new Error("Error al exportar");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `itti-talent-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exportado correctamente");
    } catch {
      toast.error("No se pudo exportar el CSV");
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 text-xs">
                People & Culture
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard P&C</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Vista organizacional del talento · Administrador P&C
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="btn-press flex items-center gap-1.5"
            onClick={handleExportCSV}
            disabled={csvLoading}
          >
            {csvLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Exportar CSV
          </Button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            label="Colaboradores"
            value={isLoading ? "—" : String(stats?.totalUsers ?? 0)}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <MetricCard
            icon={CheckCircle2}
            label="Onboardings completados"
            value={isLoading ? "—" : String(stats?.completedOnboardings ?? 0)}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
          />
          <MetricCard
            icon={Target}
            label="Evaluaciones completadas"
            value={isLoading ? "—" : String(stats?.completedAssessments ?? 0)}
            iconColor="text-purple-600"
            iconBg="bg-purple-50"
          />
          <MetricCard
            icon={BarChart3}
            label="Puntaje promedio"
            value={isLoading ? "—" : `${stats?.avgScore ?? 0}/100`}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
        </div>

        {/* Organizational radar + domain breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <Card className="card-soft border-border h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 size={15} className="text-primary" />
                  Perfil Organizacional
                </CardTitle>
                <p className="text-xs text-muted-foreground">Promedio de todos los colaboradores</p>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <>
                    <HexRadarChart scores={radarData} size={260} />
                    <RadarLegend />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    Sin datos de evaluaciones aún
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card className="card-soft border-border h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Brechas por Macro Dominio</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Comparación promedio organizacional vs nivel esperado
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {domainAverages.length > 0 ? domainAverages.map((d) => {
                  const gap = Math.round(d.average - d.expected);
                  return (
                    <div key={d.domain}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{d.domain}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Esp: {d.expected}</span>
                          <span className="font-semibold">{Math.round(d.average)}/100</span>
                          <span className={`flex items-center gap-0.5 font-semibold ${gap >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            {gap > 0 ? <TrendingUp size={11} /> : gap < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                            {gap >= 0 ? "+" : ""}{gap}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                        <div className="absolute top-0 left-0 h-full rounded-full bg-primary/25" style={{ width: `${d.expected}%` }} />
                        <div className={`absolute top-0 left-0 h-full rounded-full transition-all ${d.average >= d.expected ? "bg-primary" : "bg-rose-400"}`} style={{ width: `${Math.round(d.average)}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Sin evaluaciones completadas aún
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Collaborators table with filters */}
        <Card className="card-soft border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users size={15} className="text-primary" />
                Colaboradores
                <Badge variant="outline" className="text-xs ml-1">
                  {collaborators.length} / {(allCollaborators as Collaborator[]).length}
                </Badge>
                {totalPages > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Pág. {page}/{totalPages}
                  </span>
                )}
              </CardTitle>
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, cargo, área..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {departments.length > 0 && (
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-8 text-xs w-[140px]">
                    <SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las áreas</SelectItem>
                    {(departments as string[]).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={assessFilter} onValueChange={setAssessFilter}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Evaluación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={onbFilter} onValueChange={setOnbFilter}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Onboarding" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>

              {(search || deptFilter !== "all" || assessFilter !== "all" || onbFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => { setSearch(""); setDeptFilter("all"); setAssessFilter("all"); setOnbFilter("all"); setPage(1); }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {collabLoading ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                <Loader2 size={16} className="animate-spin mr-2" /> Cargando...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                {(allCollaborators as Collaborator[]).length === 0
                  ? "Aún no hay colaboradores registrados"
                  : "No hay resultados para los filtros aplicados"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground">Colaborador</th>
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground">Cargo / Área</th>
                      <th className="text-center py-2.5 pr-4 text-xs font-medium text-muted-foreground">Onboarding</th>
                      <th className="text-center py-2.5 pr-4 text-xs font-medium text-muted-foreground">Evaluación</th>
                      <th className="text-center py-2.5 pr-4 text-xs font-medium text-muted-foreground">Puntaje</th>
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Fecha Eval.</th>
                      <th className="text-center py-2.5 text-xs font-medium text-muted-foreground">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pagedCollaborators.map((c: Collaborator) => {
                      const onbCfg = STATUS_BADGE[c.onboardingStatus] ?? STATUS_BADGE.pending!;
                      const asmCfg = STATUS_BADGE[c.assessmentStatus] ?? STATUS_BADGE.pending!;
                      return (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-semibold">
                                  {(c.name ?? "?")[0]?.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-xs">{c.name ?? "Sin nombre"}</p>
                                <p className="text-muted-foreground text-xs">{c.email ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-xs text-foreground">{c.jobTitle ?? "—"}</p>
                            {c.department && (
                              <p className="text-xs text-muted-foreground">{c.department}</p>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <Badge className={`text-xs ${onbCfg.color}`}>{onbCfg.label}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <Badge className={`text-xs ${asmCfg.color}`}>{asmCfg.label}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            {c.overallScore != null ? (
                              <span className={`text-sm font-bold ${c.overallScore >= 70 ? "text-emerald-600" : c.overallScore >= 50 ? "text-amber-600" : "text-rose-500"}`}>
                                {Math.round(c.overallScore)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 hidden lg:table-cell">
                            {c.completedAt ? (
                              <span className="text-xs text-muted-foreground">
                                {new Date(c.completedAt).toLocaleDateString("es-PY")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 btn-press"
                              onClick={() => navigate(`/dashboard/admin/collaborator/${c.id}`)}
                            >
                              <ExternalLink size={13} className="text-primary" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, collaborators.length)} de {collaborators.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 btn-press"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft size={13} />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "..." ? (
                        <span key={`ellipsis-${idx}`} className="text-xs text-muted-foreground px-1">…</span>
                      ) : (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "outline"}
                          size="sm"
                          className="h-7 w-7 p-0 btn-press text-xs"
                          onClick={() => setPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )
                  }
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 btn-press"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight size={13} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="card-soft border-border">
      <CardContent className="pt-5">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
          <Icon size={17} className={iconColor} />
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}
