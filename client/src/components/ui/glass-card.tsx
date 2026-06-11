/**
 * GlassCard — Card con efecto glassmorphism.
 * Usa backdrop-blur + fondo semi-transparente para crear profundidad visual.
 * Ideal para cards de métricas secundarias, popovers y panels de análisis AI.
 *
 * Uso:
 *   <GlassCard className="p-6">Contenido</GlassCard>
 *   <GlassCard variant="accent">Card con tinte de color primario</GlassCard>
 */
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

type GlassVariant = "default" | "accent" | "success" | "warning" | "danger";

const VARIANT_CLASSES: Record<GlassVariant, string> = {
  default: "bg-white/70 border-white/50 shadow-sm",
  accent: "bg-primary/5 border-primary/20 shadow-sm",
  success: "bg-emerald-50/80 border-emerald-200/60 shadow-sm",
  warning: "bg-amber-50/80 border-amber-200/60 shadow-sm",
  danger: "bg-rose-50/80 border-rose-200/60 shadow-sm",
};

interface GlassCardProps {
  variant?: GlassVariant;
  /** Habilitar animación de entrada (fade + slide up) */
  animate?: boolean;
  /** Retraso de la animación de entrada (ms) */
  delay?: number;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function GlassCard({
  variant = "default",
  animate: shouldAnimate = true,
  delay = 0,
  className,
  children,
  style,
  onClick,
}: GlassCardProps) {
  const baseClasses = cn(
    "backdrop-blur-sm rounded-xl border",
    VARIANT_CLASSES[variant],
    className
  );

  if (!shouldAnimate) {
    return (
      <div className={baseClasses}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={baseClasses}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: delay / 1000,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * GlassMetricCard — Card de métrica con glassmorphism, icono, valor y label.
 * Versión animada con NumberTicker integrado.
 */
import { NumberTicker } from "./number-ticker";

interface GlassMetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  iconColor: string;
  iconBg: string;
  variant?: GlassVariant;
  delay?: number;
  isLoading?: boolean;
}

export function GlassMetricCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  iconColor,
  iconBg,
  variant = "default",
  delay = 0,
  isLoading = false,
}: GlassMetricCardProps) {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  const isNumeric = !isNaN(numericValue);

  return (
    <GlassCard variant={variant} delay={delay} className="p-5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="space-y-0.5">
        {isLoading ? (
          <div className="h-8 w-16 bg-muted animate-pulse rounded" />
        ) : isNumeric ? (
          <p className="text-2xl font-bold text-foreground tabular-nums">
            <NumberTicker value={numericValue} suffix={suffix} delay={delay + 100} />
          </p>
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </GlassCard>
  );
}
