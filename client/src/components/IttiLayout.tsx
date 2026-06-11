/**
 * IttiLayout — Layout principal con sidebar animado.
 * Sprint UX/UI: motion.div para indicador activo (layoutId), stagger en nav items,
 * hover microinteracciones, logo con pulse sutil.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuit,
  LayoutDashboard,
  MessageSquare,
  Target,
  BarChart3,
  LogOut,
  ChevronRight,
  Sparkles,
  Users,
} from "lucide-react";
import NotificationBell from "./NotificationBell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: ("user" | "admin")[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Mi Dashboard", icon: LayoutDashboard, roles: ["user"] },
  { href: "/onboarding", label: "Onboarding AI", icon: MessageSquare, roles: ["user"] },
  { href: "/proof-of-skills", label: "Proof of Skills", icon: Target, roles: ["user"] },
  { href: "/learning-path", label: "Ruta de Aprendizaje", icon: Sparkles, roles: ["user"] },
  { href: "/dashboard/admin", label: "Dashboard P&C", icon: BarChart3, roles: ["admin"] },
  { href: "/dashboard/admin/team", label: "Comparativa Equipo", icon: Users, roles: ["admin"] },
];

// Variantes de animación para los nav items en stagger
const navContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const navItemVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

export default function IttiLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const role = user?.role ?? "user";
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role as "user" | "admin"));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-border">

        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
          <motion.div
            className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <BrainCircuit size={15} className="text-white" />
          </motion.div>
          <span className="font-bold text-base text-foreground tracking-tight">
            Itti<span className="text-primary">Talent</span>
          </span>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Badge
              variant="outline"
              className={`text-xs w-full justify-center py-1 ${
                role === "admin"
                  ? "bg-primary/5 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {role === "admin" ? "Administrador P&C" : "Colaborador"}
            </Badge>
          </motion.div>
        </div>

        {/* Navigation con stagger */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <motion.ul
            className="space-y-0.5"
            variants={navContainerVariants}
            initial="hidden"
            animate="show"
          >
            {visibleItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/dashboard/admin" && location.startsWith(item.href + "/")) ||
                (item.href === "/dashboard/admin" && location === "/dashboard/admin");

              return (
                <motion.li key={item.href} variants={navItemVariants}>
                  <Link href={item.href}>
                    <div className="relative">
                      {/* Indicador activo animado con layoutId */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            layoutId="active-nav-indicator"
                            className="absolute inset-0 rounded-lg bg-primary/10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          />
                        )}
                      </AnimatePresence>

                      <motion.div
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        whileHover={!isActive ? { x: 2 } : {}}
                        transition={{ duration: 0.15 }}
                      >
                        <motion.div
                          animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <item.icon
                            size={16}
                            className={`flex-shrink-0 transition-colors ${
                              isActive ? "text-primary" : "text-muted-foreground"
                            }`}
                          />
                        </motion.div>
                        <span className="flex-1">{item.label}</span>
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 0.6, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRight size={14} className="text-primary" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        </nav>

        {/* User section */}
        <motion.div
          className="flex-shrink-0 border-t border-border p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
            <motion.div
              className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.15 }}
            >
              <span className="text-white text-xs font-semibold">
                {(user?.name ?? "U")[0]?.toUpperCase()}
              </span>
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.name ?? "Usuario"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground mt-1 h-8 text-xs btn-press"
            onClick={logout}
          >
            <LogOut size={13} className="mr-2" />
            Cerrar sesión
          </Button>
        </motion.div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-white flex-shrink-0">
          <div>
            {visibleItems.find((i) => {
              if (i.href === "/dashboard/admin") return location === "/dashboard/admin";
              return location === i.href || location.startsWith(i.href + "/");
            }) && (
              <motion.h2
                key={location}
                className="text-sm font-semibold text-foreground"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {visibleItems.find((i) => {
                  if (i.href === "/dashboard/admin") return location === "/dashboard/admin";
                  return location === i.href || location.startsWith(i.href + "/");
                })?.label}
              </motion.h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            {role === "admin" && <NotificationBell />}
            <span className="text-xs text-muted-foreground hidden sm:block">
              People & Culture · IttiTalent
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
