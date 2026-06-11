/**
 * PageTransition — Wrapper de animación para transiciones entre páginas.
 * Usa framer-motion AnimatePresence con fade + slide-up suave.
 * Diseñado para envolver el contenido de cada página dentro del layout.
 *
 * Uso:
 *   <PageTransition>
 *     <div>Contenido de la página</div>
 *   </PageTransition>
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  /** Variante de animación */
  variant?: "fade" | "slide-up" | "slide-right";
  /** Retraso antes de la animación (ms) */
  delay?: number;
}

const VARIANTS = {
  "fade": {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-up": {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  },
  "slide-right": {
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 6 },
  },
};

export function PageTransition({
  children,
  className,
  variant = "slide-up",
  delay = 0,
}: PageTransitionProps) {
  const v = VARIANTS[variant];

  return (
    <motion.div
      className={cn("h-full", className)}
      initial={v.initial}
      animate={v.animate}
      exit={v.exit}
      transition={{
        duration: 0.25,
        delay: delay / 1000,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer — Contenedor que aplica stagger (cascada) a sus hijos.
 * Los hijos deben usar StaggerItem para recibir la animación.
 *
 * Uso:
 *   <StaggerContainer>
 *     <StaggerItem>Item 1</StaggerItem>
 *     <StaggerItem>Item 2</StaggerItem>
 *   </StaggerContainer>
 */
const staggerContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const staggerItemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
