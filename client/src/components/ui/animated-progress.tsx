/**
 * AnimatedProgressBar — Barra de progreso con animación de entrada.
 * Anima desde 0% hasta el valor objetivo cuando entra en el viewport.
 * Soporta una capa de "expected" (nivel esperado) como marcador visual.
 *
 * Uso:
 *   <AnimatedProgressBar value={72} expected={80} color="primary" />
 *   <AnimatedProgressBar value={45} color="rose" delay={200} />
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

type BarColor = "primary" | "emerald" | "amber" | "rose" | "purple";

const COLOR_MAP: Record<BarColor, string> = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  purple: "bg-purple-500",
};

interface AnimatedProgressBarProps {
  /** Valor actual (0-100) */
  value: number;
  /** Nivel esperado para el rol (0-100) — muestra marcador vertical */
  expected?: number;
  /** Color de la barra */
  color?: BarColor;
  /** Altura de la barra en píxeles */
  height?: number;
  /** Retraso antes de la animación (ms) */
  delay?: number;
  /** Duración de la animación (s) */
  duration?: number;
  className?: string;
}

export function AnimatedProgressBar({
  value,
  expected,
  color = "primary",
  height = 8,
  delay = 0,
  duration = 0.9,
  className,
}: AnimatedProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const clampedValue = Math.max(0, Math.min(100, value));
  const clampedExpected = expected != null ? Math.max(0, Math.min(100, expected)) : undefined;

  return (
    <div
      ref={ref}
      className={cn("relative rounded-full bg-muted overflow-hidden", className)}
      style={{ height }}
    >
      {/* Expected level marker */}
      {clampedExpected != null && (
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground/25 z-10"
          style={{ left: `${clampedExpected}%` }}
        />
      )}

      {/* Animated bar */}
      <motion.div
        className={cn("absolute top-0 left-0 h-full rounded-full", COLOR_MAP[color])}
        initial={{ width: 0 }}
        animate={isInView ? { width: `${clampedValue}%` } : { width: 0 }}
        transition={{
          duration,
          delay: delay / 1000,
          ease: [0.23, 1, 0.32, 1], // --ease-out custom
        }}
      />
    </div>
  );
}

/**
 * DomainProgressRow — Fila completa de progreso por dominio.
 * Combina etiqueta, valor, badge de gap y AnimatedProgressBar.
 */
interface DomainProgressRowProps {
  domain: string;
  score: number;
  expected: number;
  delay?: number;
}

export function DomainProgressRow({ domain, score, expected, delay = 0 }: DomainProgressRowProps) {
  const gap = score - expected;
  const color: BarColor =
    gap >= 10 ? "emerald" :
    gap >= -5 ? "primary" :
    gap >= -20 ? "amber" : "rose";

  const gapLabel =
    gap >= 10 ? "Supera" :
    gap >= -5 ? "En nivel" :
    gap >= -20 ? "Brecha moderada" : "Brecha crítica";

  const gapTextColor =
    gap >= 10 ? "text-emerald-700" :
    gap >= -5 ? "text-primary" :
    gap >= -20 ? "text-amber-700" : "text-rose-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{domain}</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Esp: {expected}</span>
          <span className={cn("font-semibold", gapTextColor)}>{gapLabel}</span>
          <span className="font-bold text-foreground">{score}/100</span>
        </div>
      </div>
      <AnimatedProgressBar
        value={score}
        expected={expected}
        color={color}
        height={8}
        delay={delay}
      />
    </div>
  );
}
