/**
 * NumberTicker — Contador animado con framer-motion.
 * Implementación propia inspirada en Magic UI NumberTicker.
 * Anima desde 0 (o desde un valor anterior) hasta el valor objetivo.
 *
 * Uso:
 *   <NumberTicker value={42} />
 *   <NumberTicker value={85} suffix="/100" className="text-2xl font-bold" />
 */
import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface NumberTickerProps {
  value: number;
  /** Texto a mostrar antes del número (ej: "$") */
  prefix?: string;
  /** Texto a mostrar después del número (ej: "/100", "%") */
  suffix?: string;
  /** Número de decimales a mostrar */
  decimals?: number;
  /** Duración de la animación en segundos */
  duration?: number;
  /** Retraso antes de iniciar la animación (ms) */
  delay?: number;
  className?: string;
}

export function NumberTicker({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1.2,
  delay = 0,
  className,
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
    duration,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(value);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isInView, value, delay, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(parseFloat(latest.toFixed(decimals)));
    });
    return unsubscribe;
  }, [springValue, decimals]);

  return (
    <span
      ref={ref}
      className={cn("tabular-nums", className)}
    >
      {prefix}
      {displayValue.toLocaleString("es-PY", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
