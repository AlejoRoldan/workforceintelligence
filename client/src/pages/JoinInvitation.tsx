import { useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Clock3, Link2Off, LogIn, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/page-transition";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";

function formatExpiry(value: Date | string) {
  return new Date(value).toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function JoinInvitation() {
  const [location, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);
  const preview = trpc.invitation.preview.useQuery(
    { token },
    { enabled: Boolean(token), retry: false },
  );
  const redeem = trpc.invitation.redeem.useMutation({
    onSuccess: ({ role }) => {
      toast.success("Invitación aceptada correctamente");
      navigate(role === "admin" ? "/dashboard/admin" : "/dashboard");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleContinue = () => {
    if (!isAuthenticated) {
      // OAuth returns to this exact path, keeping the token in the URL.
      window.location.href = getLoginUrl(location);
      return;
    }
    redeem.mutate({ token });
  };

  const isLoading = authLoading || preview.isLoading;
  const invitation = preview.data?.valid === true ? preview.data : null;
  const isValid = invitation !== null;

  return (
    <PageTransition>
      <main className="min-h-screen bg-gradient-to-br from-[#f0faf7] via-white to-white flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg border-border/80 shadow-xl shadow-primary/5">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {isValid ? <ShieldCheck size={28} /> : <UserPlus size={28} />}
            </div>
            <div>
              <Badge variant="outline" className="mb-3 border-primary/30 bg-primary/5 text-primary">
                IttiTalent
              </Badge>
              <CardTitle className="text-2xl text-foreground">Únete a tu organización</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Acepta la invitación para comenzar tu perfil de competencias y desarrollo.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Verificando el enlace seguro...</div>
            ) : !token || !isValid ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <Link2Off className="mx-auto mb-3 text-destructive" size={28} />
                <h2 className="font-semibold text-foreground">Enlace no disponible</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Este enlace ya fue utilizado, expiró o no es válido. Solicita una nueva invitación al equipo de People & Culture.
                </p>
                <Button variant="outline" className="mt-5" onClick={() => navigate("/")}>Volver al inicio</Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">Rol asignado</span>
                    <Badge className="bg-primary text-primary-foreground">
                      {invitation.role === "admin" ? "Administrador P&C" : "Colaborador"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock3 size={14} className="text-primary" />
                    Válida hasta el {formatExpiry(invitation.expiresAt)}
                  </div>
                </div>
                {invitation.note && (
                  <blockquote className="border-l-2 border-primary/40 pl-4 text-sm italic text-muted-foreground">
                    “{invitation.note}”
                  </blockquote>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {isAuthenticated
                    ? "Tu sesión está lista. Confirma para vincular esta invitación a tu cuenta actual."
                    : "Inicia sesión con la cuenta que quieres vincular. Si la invitación está dirigida a un correo específico, debe coincidir con tu cuenta."}
                </p>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleContinue} disabled={redeem.isPending}>
                  {redeem.isPending ? "Aceptando invitación..." : isAuthenticated ? "Aceptar invitación" : "Iniciar sesión y continuar"}
                  {isAuthenticated ? <ArrowRight size={16} className="ml-2" /> : <LogIn size={16} className="ml-2" />}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </PageTransition>
  );
}
