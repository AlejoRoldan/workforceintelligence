/**
 * RoleProfiles.tsx — Sprint D
 * Admin panel: configure expected competency scores per job role.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Briefcase, Plus, Pencil, Trash2, Target, ChevronRight } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";

// Domain color map
const domainColors: Record<string, string> = {
  "Digital & GenAI": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Liderazgo Moderno": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Operación Ágil": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Customer Experience": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Data-driven": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Innovación": "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

// ─── Role Editor Modal ────────────────────────────────────────────────────────
interface RoleEditorProps {
  open: boolean;
  onClose: () => void;
  initialRole?: { roleName: string; domains: Array<{ domainId: number; domainName: string; expectedScore: number; weight: number }> };
  availableDomains: Array<{ id: number; name: string }>;
  onSaved: () => void;
}

function RoleEditor({ open, onClose, initialRole, availableDomains, onSaved }: RoleEditorProps) {
  const isEdit = !!initialRole;
  const [roleName, setRoleName] = useState(initialRole?.roleName ?? "");
  const [scores, setScores] = useState<Record<number, number>>(
    Object.fromEntries(
      availableDomains.map((d) => [
        d.id,
        initialRole?.domains.find((x) => x.domainId === d.id)?.expectedScore ?? 70,
      ])
    )
  );

  const upsert = trpc.roleProfiles.upsertRole.useMutation({
    onSuccess: () => {
      toast.success(isEdit ? "Perfil actualizado" : "Perfil creado correctamente");
      onSaved();
      onClose();
    },
    onError: () => toast.error("No se pudo guardar el perfil"),
  });

  const handleSave = () => {
    if (!roleName.trim()) {
      toast.error("El nombre del cargo es obligatorio");
      return;
    }
    upsert.mutate({
      roleName: roleName.trim(),
      expectations: availableDomains.map((d) => ({
        domainId: d.id,
        expectedScore: scores[d.id] ?? 70,
        weight: 1.0,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-[#0f1117] border border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Briefcase className="w-5 h-5 text-violet-400" />
            {isEdit ? "Editar perfil de cargo" : "Nuevo perfil de cargo"}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            Define el nombre del cargo y el nivel esperado (0–100) para cada dominio de competencias.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-sm">Nombre del cargo</Label>
            <Input
              placeholder="Ej: Analista de Datos, Gerente de Producto..."
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              disabled={isEdit}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 disabled:opacity-50"
            />
            {isEdit && <p className="text-xs text-white/30">El nombre del cargo no se puede modificar.</p>}
          </div>

          <div className="space-y-4">
            <Label className="text-white/70 text-sm">Niveles esperados por dominio</Label>
            {availableDomains.map((domain) => {
              const score = scores[domain.id] ?? 70;
              const colorClass = domainColors[domain.name] ?? "text-white/60 bg-white/5 border-white/10";
              return (
                <div key={domain.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass}`}>
                      {domain.name}
                    </span>
                    <span className="text-white font-bold tabular-nums text-sm">{score}</span>
                  </div>
                  <Slider
                    value={[score]}
                    onValueChange={([v]) => setScores((prev) => ({ ...prev, [domain.id]: v ?? 70 }))}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/60">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={upsert.isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {upsert.isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear perfil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RoleProfiles() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{ roleName: string; domains: Array<{ domainId: number; domainName: string; expectedScore: number; weight: number }> } | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: roles = [], refetch } = trpc.roleProfiles.getAll.useQuery();
  const { data: domains = [] } = trpc.roleProfiles.getDomains.useQuery();

  const deleteRole = trpc.roleProfiles.deleteRole.useMutation({
    onSuccess: () => {
      toast.success("Perfil eliminado");
      setDeleteTarget(null);
      refetch();
    },
    onError: () => toast.error("No se pudo eliminar el perfil"),
  });

  const handleEdit = (role: typeof roles[0]) => {
    setEditingRole(role);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditingRole(undefined);
    setEditorOpen(true);
  };

  return (
    <PageTransition>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Perfiles de Cargo</h1>
            <p className="text-white/50 text-sm mt-1">
              Define los niveles de competencia esperados para cada rol. Estos valores guían el análisis de brechas de cada colaborador.
            </p>
          </div>
          <Button
            onClick={handleNew}
            className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo perfil
          </Button>
        </div>

        {/* Role Cards */}
        <div className="grid gap-4">
          <AnimatePresence>
            {roles.map((role, i) => (
              <motion.div
                key={role.roleName}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.06 }}
              >
                <GlassCard className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{role.roleName}</h3>
                        <p className="text-white/40 text-xs">{role.domains.length} dominios configurados</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(role)}
                        className="text-white/60 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(role.roleName)}
                        className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Domain scores grid */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {role.domains.map((d: { domainId: number; domainName: string; expectedScore: number; weight: number }) => {
                      const colorClass = domainColors[d.domainName] ?? "text-white/60 bg-white/5 border-white/10";
                      return (
                        <div key={d.domainId} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${colorClass}`}>
                          <div className="flex items-center gap-1.5">
                            <Target className="w-3 h-3 opacity-70" />
                            <span className="text-xs font-medium truncate max-w-[100px]">{d.domainName}</span>
                          </div>
                          <span className="text-sm font-bold tabular-nums ml-2">{d.expectedScore}</span>
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </AnimatePresence>

          {roles.length === 0 && (
            <div className="py-16 text-center text-white/30">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay perfiles de cargo configurados</p>
              <p className="text-sm mt-1">Crea el primer perfil para habilitar el análisis de brechas.</p>
              <Button
                onClick={handleNew}
                className="mt-4 bg-violet-600 hover:bg-violet-500 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear primer perfil
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <RoleEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          initialRole={editingRole}
          availableDomains={domains.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))}
          onSaved={refetch}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#0f1117] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar perfil?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Se eliminarán todas las expectativas del cargo <strong className="text-white">{deleteTarget}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteRole.mutate({ roleName: deleteTarget })}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
