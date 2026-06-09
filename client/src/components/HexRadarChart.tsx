import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

export interface RadarScore {
  domain: string;
  score: number;
  expected: number;
}

interface HexRadarChartProps {
  scores: RadarScore[];
  size?: number;
}

const DOMAIN_SHORT: Record<string, string> = {
  "Digital & GenAI": "Digital",
  "Liderazgo Moderno": "Liderazgo",
  "Operación Ágil": "Operación",
  "Customer Experience": "CX",
  "Data-driven": "Data",
  "Innovación": "Innovación",
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: RadarScore }[] }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const gap = data.score - data.expected;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-foreground mb-1">{data.domain}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Nivel actual</span>
          <span className="font-medium text-primary">{data.score}/100</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Nivel esperado</span>
          <span className="font-medium text-muted-foreground">{data.expected}/100</span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-1 border-t border-border">
          <span className="text-muted-foreground">Brecha</span>
          <span className={`font-semibold ${gap >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {gap >= 0 ? "+" : ""}{gap}
          </span>
        </div>
      </div>
    </div>
  );
};

// Custom angle axis tick
const CustomTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) => {
  const short = DOMAIN_SHORT[payload?.value ?? ""] ?? payload?.value ?? "";
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="fill-muted-foreground"
      style={{ fontSize: "11px", fontFamily: "Inter, sans-serif", fontWeight: 500 }}
    >
      {short}
    </text>
  );
};

export function HexRadarChart({ scores, size = 340 }: HexRadarChartProps) {
  const data = scores.map((s) => ({
    domain: s.domain,
    score: s.score,
    expected: s.expected,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid
          gridType="polygon"
          stroke="oklch(0.91 0.005 260)"
          strokeWidth={1}
        />
        <PolarAngleAxis
          dataKey="domain"
          tick={CustomTick as never}
          tickLine={false}
          axisLine={false}
        />
        {/* Expected level — dashed reference */}
        <Radar
          name="Nivel esperado"
          dataKey="expected"
          stroke="oklch(0.75 0.01 260)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="transparent"
          dot={false}
        />
        {/* Actual score */}
        <Radar
          name="Nivel actual"
          dataKey="score"
          stroke="oklch(0.65 0.14 168)"
          strokeWidth={2.5}
          fill="oklch(0.65 0.14 168)"
          fillOpacity={0.18}
          dot={{ r: 4, fill: "oklch(0.65 0.14 168)", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "oklch(0.55 0.14 168)", strokeWidth: 0 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// Legend component
export function RadarLegend() {
  return (
    <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 bg-primary rounded" />
        <span>Nivel actual</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 border-t-2 border-dashed border-muted-foreground/50 rounded" />
        <span>Nivel esperado por rol</span>
      </div>
    </div>
  );
}
