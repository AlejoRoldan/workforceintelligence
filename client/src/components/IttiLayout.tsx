import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, Link } from "wouter";
import {
  BrainCircuit,
  LayoutDashboard,
  MessageSquare,
  Target,
  Users,
  BarChart3,
  LogOut,
  ChevronRight,
  Settings,
  Sparkles,
} from "lucide-react";

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
];

export default function IttiLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const role = user?.role ?? "user";
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role as "user" | "admin"));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-border">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center">
            <BrainCircuit size={15} className="text-white" />
          </div>
          <span className="font-bold text-base text-foreground tracking-tight">
            Itti<span className="text-primary">Talent</span>
          </span>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon
                    size={16}
                    className={`flex-shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="text-primary opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted transition-colors">
            <div className="w-7 h-7 rounded-full brand-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">
                {(user?.name ?? "U")[0]?.toUpperCase()}
              </span>
            </div>
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
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-border bg-white flex-shrink-0">
          <div>
            {visibleItems.find((i) => i.href === location || location.startsWith(i.href + "/")) && (
              <h2 className="text-sm font-semibold text-foreground">
                {visibleItems.find((i) => i.href === location || location.startsWith(i.href + "/"))?.label}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2">
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
