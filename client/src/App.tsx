import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import ProofOfSkills from "./pages/ProofOfSkills";
import DashboardCollaborator from "./pages/DashboardCollaborator";
import DashboardAdmin from "./pages/DashboardAdmin";
import IttiLayout from "./components/IttiLayout";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

// Routes that require the sidebar layout
const DASHBOARD_ROUTES = ["/dashboard", "/onboarding", "/proof-of-skills", "/dashboard/admin"];

function ProtectedRoute({
  component: Component,
  adminOnly = false,
}: {
  component: React.ComponentType;
  adminOnly?: boolean;
}) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
    // Redirect admin to admin dashboard if they land on /dashboard
    if (!loading && isAuthenticated && user?.role === "admin" && location === "/dashboard") {
      navigate("/dashboard/admin");
    }
    // Redirect non-admin away from admin routes
    if (!loading && isAuthenticated && adminOnly && user?.role !== "admin") {
      navigate("/dashboard");
    }
  }, [loading, isAuthenticated, adminOnly, user?.role, location]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (adminOnly && user?.role !== "admin") return null;

  return <Component />;
}

function AppRouter() {
  const [location] = useLocation();
  const isDashboard = DASHBOARD_ROUTES.some(
    (r) => location === r || location.startsWith(r + "/")
  );

  if (isDashboard) {
    return (
      <IttiLayout>
        <Switch>
          <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardCollaborator} />} />
          <Route path="/onboarding" component={() => <ProtectedRoute component={Onboarding} />} />
          <Route path="/proof-of-skills" component={() => <ProtectedRoute component={ProofOfSkills} />} />
          <Route path="/dashboard/admin" component={() => <ProtectedRoute component={DashboardAdmin} adminOnly />} />
          <Route component={NotFound} />
        </Switch>
      </IttiLayout>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
