/**
 * UserManagement.tsx — Sprint D
 * Admin panel: view all collaborators, change roles, generate invitation links.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Shield,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  Link2,
} from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusConfig = {
  pending: { label: "Pendiente", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  in_progress: { label: "En progreso", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: AlertCircle },
  completed: { label: "Completado", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ─── Invitation Modal ─────────────────────────────────────────────────────────
function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [note, setNote] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createInvitation = trpc.userManagement.createInvitation.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/join?token=${data.token}`;
      setGeneratedLink(link);
      toast.success("Invitación creada correctamente");
    },
    onError: () => toast.error("No se pudo crear la invitación"),
  });

  const handleCopy = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Enlace copiado al portapapeles");
  };

  const handleClose = () => {
    setEmail("");
    setRole("user");
    setNote("");
    setGeneratedLink(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#0f1117] border border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-violet-400" />
            Invitar colaborador
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Genera un enlace de invitación válido por 7 días. El colaborador podrá acceder a la plataforma con este link.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Email (opcional)</Label>
              <Input
                placeholder="colaborador@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Rol asignado</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "user" | "admin")}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f1117] border-white/10">
                  <SelectItem value="user" className="text-white">Colaborador</SelectItem>
                  <SelectItem value="admin" className="text-white">Administrador P&C</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Nota para el invitado (opcional)</Label>
              <Input
                placeholder="Bienvenido al equipo de Tecnología..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <p className="text-sm text-white/60">Enlace de invitación generado:</p>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Link2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-xs text-violet-300 truncate flex-1">{generatedLink}</span>
              <button
                onClick={handleCopy}
                className="shrink-0 text-violet-400 hover:text-violet-300 transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-white/40">
              <Clock className="w-3 h-3 inline mr-1" />
              Válido por 7 días
            </p>
          </div>
        )}

        <DialogFooter>
          {!generatedLink ? (
            <>
              <Button variant="ghost" onClick={handleClose} className="text-white/60">
                Cancelar
              </Button>
              <Button
                onClick={() => createInvitation.mutate({ email: email || undefined, role, note: note || undefined })}
                disabled={createInvitation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {createInvitation.isPending ? "Generando..." : "Generar enlace"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="bg-violet-600 hover:bg-violet-500 text-white">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserManagement() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");

  const { data: users = [], refetch } = trpc.userManagement.getUsers.useQuery();
  const { data: invitations = [] } = trpc.userManagement.getInvitations.useQuery();

  const updateRole = trpc.userManagement.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Rol actualizado correctamente");
      refetch();
    },
    onError: () => toast.error("No se pudo actualizar el rol"),
  });

  const filteredUsers = users.filter((u) => roleFilter === "all" || u.role === roleFilter);

  const stats = {
    total: users.length,
    onboardingCompleted: users.filter((u) => u.onboardingStatus === "completed").length,
    assessmentCompleted: users.filter((u) => u.assessmentStatus === "completed").length,
    pendingInvitations: invitations.filter((i) => !i.usedAt).length,
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
            <p className="text-white/50 text-sm mt-1">Administra colaboradores, roles e invitaciones</p>
          </div>
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Invitar colaborador
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total colaboradores", value: stats.total, icon: Users, color: "text-violet-400" },
            { label: "Onboarding completado", value: stats.onboardingCompleted, icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Evaluación completada", value: stats.assessmentCompleted, icon: Shield, color: "text-blue-400" },
            { label: "Invitaciones pendientes", value: stats.pendingInvitations, icon: Mail, color: "text-amber-400" },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
                    <p className="text-xs text-white/50">{kpi.label}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="users" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-white/60">
              <Users className="w-4 h-4 mr-2" />
              Colaboradores ({users.length})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-white/60">
              <Mail className="w-4 h-4 mr-2" />
              Invitaciones ({invitations.length})
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4">
            <GlassCard className="overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10 text-white text-sm h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f1117] border-white/10">
                    <SelectItem value="all" className="text-white">Todos</SelectItem>
                    <SelectItem value="user" className="text-white">Colaboradores</SelectItem>
                    <SelectItem value="admin" className="text-white">Admins</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-white/40 text-sm">{filteredUsers.length} usuarios</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Nombre", "Cargo / Área", "Onboarding", "Evaluación", "Score", "Rol", "Último acceso"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-white/40 font-medium text-xs uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredUsers.map((user, i) => (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="border-b border-white/5 hover:bg-white/3 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-bold">
                                {(user.name || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-medium">{user.name || "Sin nombre"}</p>
                                <p className="text-white/40 text-xs">{user.email || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white/80">{user.jobTitle || "—"}</p>
                            <p className="text-white/40 text-xs">{user.department || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={user.onboardingStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={user.assessmentStatus} />
                          </td>
                          <td className="px-4 py-3">
                            {user.overallScore != null ? (
                              <span className={`font-bold tabular-nums ${user.overallScore >= 70 ? "text-emerald-400" : user.overallScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                {Math.round(user.overallScore)}
                              </span>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Select
                              value={user.role}
                              onValueChange={(v) => updateRole.mutate({ userId: user.id, role: v as "user" | "admin" })}
                            >
                              <SelectTrigger className="w-32 h-7 bg-white/5 border-white/10 text-xs text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0f1117] border-white/10">
                                <SelectItem value="user" className="text-white text-xs">
                                  <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Colaborador</span>
                                </SelectItem>
                                <SelectItem value="admin" className="text-white text-xs">
                                  <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Admin P&C</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-3 text-white/40 text-xs">
                            {new Date(user.lastSignedIn).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-white/30">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No hay colaboradores registrados aún.</p>
                    <p className="text-xs mt-1">Genera una invitación para que se unan a la plataforma.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="mt-4">
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {["Token", "Email", "Rol", "Estado", "Expira", "Creado"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-white/40 font-medium text-xs uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv, i) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <code className="text-violet-300 text-xs bg-violet-500/10 px-2 py-0.5 rounded">
                            {inv.token.slice(0, 12)}...
                          </code>
                        </td>
                        <td className="px-4 py-3 text-white/70">{inv.email || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs border-white/20 text-white/60">
                            {inv.role === "admin" ? "Admin P&C" : "Colaborador"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {inv.usedAt ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Usado
                            </span>
                          ) : new Date(inv.expiresAt) < new Date() ? (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Expirado
                            </span>
                          ) : (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs">
                          {new Date(inv.expiresAt).toLocaleDateString("es-CO")}
                        </td>
                        <td className="px-4 py-3 text-white/40 text-xs">
                          {new Date(inv.createdAt).toLocaleDateString("es-CO")}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {invitations.length === 0 && (
                  <div className="py-12 text-center text-white/30">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No hay invitaciones generadas aún.</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </PageTransition>
  );
}
