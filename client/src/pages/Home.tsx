import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  BrainCircuit,
  Users,
  BarChart3,
  Zap,
  Target,
  TrendingUp,
  Layers,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Globe,
  Lightbulb,
  LineChart,
  HeartHandshake,
  Cpu,
} from "lucide-react";

const MACRO_DOMAINS = [
  { name: "Digital & GenAI", icon: Cpu, color: "bg-blue-50 text-blue-600 border-blue-100" },
  { name: "Liderazgo Moderno", icon: Star, color: "bg-purple-50 text-purple-600 border-purple-100" },
  { name: "Operación Ágil", icon: Zap, color: "bg-amber-50 text-amber-600 border-amber-100" },
  { name: "Customer Experience", icon: HeartHandshake, color: "bg-rose-50 text-rose-600 border-rose-100" },
  { name: "Data-driven", icon: LineChart, color: "bg-cyan-50 text-cyan-600 border-cyan-100" },
  { name: "Innovación", icon: Lightbulb, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
];

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Onboarding Conversacional AI",
    description:
      "Un agente inteligente conduce entrevistas adaptativas para perfilar a cada colaborador dentro del framework de 4 capas de competencias.",
  },
  {
    icon: Target,
    title: "Proof of Skills",
    description:
      "Preguntas generadas dinámicamente por AI según el rol y perfil del colaborador, con evaluación de respuestas en tiempo real.",
  },
  {
    icon: BarChart3,
    title: "Gráfico Radar de Competencias",
    description:
      "Visualización hexagonal que muestra el perfil completo del colaborador, destacando fortalezas y áreas de mejora por macro dominio.",
  },
  {
    icon: TrendingUp,
    title: "Análisis de Brechas",
    description:
      "Comparación precisa entre el nivel actual evaluado y el nivel esperado por rol, con priorización de gaps de mayor impacto.",
  },
  {
    icon: Users,
    title: "Dashboard P&C",
    description:
      "Vista 360° del talento organizacional para el equipo de People & Culture: métricas, estados de onboarding y resultados agregados.",
  },
  {
    icon: Layers,
    title: "Framework 4 Capas",
    description:
      "Competencias Organizacionales, de Liderazgo, Funcionales y Estratégicas Futuras — un modelo coherente y escalable.",
  },
];

const COMPETENCY_LAYERS = [
  { name: "Organizacionales", desc: "Valores, cultura, trabajo en equipo y comunicación", color: "border-l-brand-500" },
  { name: "Liderazgo", desc: "Gestión de equipos, toma de decisiones e influencia", color: "border-l-purple-400" },
  { name: "Funcionales", desc: "Habilidades técnicas específicas del rol", color: "border-l-amber-400" },
  { name: "Estratégicas Futuras", desc: "Adaptabilidad, innovación y pensamiento digital", color: "border-l-cyan-400" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate(user?.role === "admin" ? "/dashboard/admin" : "/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
              <BrainCircuit className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <span className="font-bold text-lg text-foreground tracking-tight">
              Itti<span className="text-primary">Talent</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#domains" className="hover:text-foreground transition-colors">Macro Dominios</a>
            <a href="#framework" className="hover:text-foreground transition-colors">Framework</a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                onClick={handleCTA}
                className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
              >
                Ir al Dashboard
                <ArrowRight size={15} className="ml-1.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-sm text-muted-foreground hover:text-foreground btn-press"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={handleCTA}
                  className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                >
                  Comenzar
                  <ArrowRight size={15} className="ml-1.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#f0faf7] to-white pt-20 pb-24">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/4 translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Badge
              variant="outline"
              className="mb-6 text-primary border-primary/30 bg-primary/5 font-medium px-3 py-1"
            >
              <Sparkles size={13} className="mr-1.5" />
              Potenciado por Inteligencia Artificial
            </Badge>

            <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-[1.1] mb-6">
              Desarrolla el talento de tu organización con{" "}
              <span className="text-primary">precisión inteligente</span>
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
              Onboarding conversacional, perfilamiento por competencias, rutas de aprendizaje
              personalizadas y validación de habilidades — todo asistido por un agente AI que
              entiende tu organización.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleCTA}
                size="lg"
                className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base font-medium shadow-lg shadow-primary/20"
              >
                Comenzar Ahora
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="btn-press h-12 px-8 text-base font-medium"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explorar Capacidades
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              {["Onboarding AI en minutos", "6 Macro Dominios estratégicos", "Framework 4 Capas"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-primary" />
                    <span>{item}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
              Funcionalidades
            </Badge>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Todo lo que necesita tu equipo P&C
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Una plataforma integral que combina inteligencia artificial con un framework de
              competencias probado para impulsar el desarrollo del talento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border border-border bg-white hover:border-primary/30 hover:shadow-md transition-all duration-200 card-soft"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon size={20} className="text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6 Macro Domains ── */}
      <section id="domains" className="py-24 bg-[#f8fffe]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
              <Globe size={13} className="mr-1.5" />6 Macro Dominios Estratégicos
            </Badge>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Las capacidades que toda organización debe desarrollar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              El eje estructural de IttiTalent: seis dominios estratégicos que definen la ventaja
              competitiva de tu organización.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MACRO_DOMAINS.map((domain) => (
              <div
                key={domain.name}
                className={`flex items-center gap-3 p-5 rounded-xl border bg-white card-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${domain.color}`}>
                  <domain.icon size={20} />
                </div>
                <span className="font-semibold text-foreground text-sm leading-tight">{domain.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Framework 4 Layers ── */}
      <section id="framework" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge variant="outline" className="mb-4 text-primary border-primary/30 bg-primary/5">
                Framework de Competencias
              </Badge>
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Modelo de 4 Capas para el desarrollo integral
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Un framework coherente que cubre desde las competencias base de la organización hasta
                las capacidades estratégicas del futuro, adaptado a cada rol y nivel.
              </p>
              <Button
                onClick={handleCTA}
                className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Ver mi perfil de competencias
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>

            <div className="space-y-3">
              {COMPETENCY_LAYERS.map((layer, i) => (
                <div
                  key={layer.name}
                  className={`p-5 rounded-xl border-l-4 border border-border bg-white card-soft ${layer.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">{layer.name}</h4>
                      <p className="text-sm text-muted-foreground">{layer.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 brand-gradient">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Empieza a mapear el talento de tu organización hoy
          </h2>
          <p className="text-lg text-white/80 mb-8">
            Únete al equipo de People & Culture y transforma la gestión del talento con inteligencia
            artificial.
          </p>
          <Button
            onClick={handleCTA}
            size="lg"
            variant="outline"
            className="btn-press bg-white text-primary border-white hover:bg-white/90 h-12 px-8 text-base font-medium"
          >
            Comenzar Ahora
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded brand-gradient flex items-center justify-center">
              <BrainCircuit size={13} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-foreground">
              Itti<span className="text-primary">Talent</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 IttiTalent — Workforce Intelligence Platform · People & Culture
          </p>
        </div>
      </footer>
    </div>
  );
}
