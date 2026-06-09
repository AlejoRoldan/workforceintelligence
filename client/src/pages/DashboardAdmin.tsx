import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HexRadarChart, RadarLegend, type RadarScore } from "@/components/HexRadarChart";
import {
  Users,
  CheckCircle2,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Minus,
} from "lucide-react";

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
  createdAt: Date;
};

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  completed: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  in_progress: { label: "En progreso", color: "bg-amber-50 text-amber-700 border-amber-200" },
  pending: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border" },
};

export default function DashboardAdmin() {
  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery();
  const { data: collaborators = [], isLoading: collabLoading } = trpc.admin.getCollaborators.useQuery();

  const isLoading = statsLoading || collabLoading;

  const domainAverages = stats?.domainAverages ?? [];
  const radarData: RadarScore[] = domainAverages.map((d) => ({
    domain: d.domain,
    score: Math.round(d.average),
    expected: d.expected,
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
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
          {/* Radar organizacional */}
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

          {/* Domain breakdown */}
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
                        <div
                          className="absolute top-0 left-0 h-full rounded-full bg-primary/25"
                          style={{ width: `${d.expected}%` }}
                        />
                        <div
                          className={`absolute top-0 left-0 h-full rounded-full transition-all ${d.average >= d.expected ? "bg-primary" : "bg-rose-400"}`}
                          style={{ width: `${Math.round(d.average)}%` }}
                        />
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

        {/* Collaborators table */}
        <Card className="card-soft border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users size={15} className="text-primary" />
                Colaboradores
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {collaborators.length} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {collabLoading ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : collaborators.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                Aún no hay colaboradores registrados
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground">Colaborador</th>
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-muted-foreground">Cargo</th>
                      <th className="text-center py-2.5 pr-4 text-xs font-medium text-muted-foreground">Onboarding</th>
                      <th className="text-center py-2.5 pr-4 text-xs font-medium text-muted-foreground">Evaluación</th>
                      <th className="text-center py-2.5 text-xs font-medium text-muted-foreground">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {collaborators.map((c: Collaborator) => {
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
                            <Badge className={`text-xs ${onbCfg.color}`}>
                              {onbCfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <Badge className={`text-xs ${asmCfg.color}`}>
                              {asmCfg.label}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            {c.overallScore != null ? (
                              <span className={`text-sm font-bold ${c.overallScore >= 70 ? "text-emerald-600" : c.overallScore >= 50 ? "text-amber-600" : "text-rose-500"}`}>
                                {Math.round(c.overallScore)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Metric card component ─────────────────────────────────────────────────────
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
