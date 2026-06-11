/**
 * NotificationBell — Badge animado con dropdown de notificaciones para admins.
 * Sprint A: Notificaciones en tiempo real (polling cada 30s).
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, BrainCircuit, Target, Sparkles, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const TYPE_CONFIG = {
  onboarding_completed: {
    icon: BrainCircuit,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  assessment_completed: {
    icon: Target,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  learning_plan_ready: {
    icon: Sparkles,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  profile_updated: {
    icon: User,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
} as const;

function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "ahora mismo";
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // Poll unread every 30 seconds
  const { data } = trpc.notifications.getUnread.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const { data: allNotifs } = trpc.notifications.getAll.useQuery(undefined, {
    enabled: open,
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnread.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnread.invalidate();
      utils.notifications.getAll.invalidate();
    },
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const unreadCount = data?.count ?? 0;
  const notifications = allNotifs ?? data?.items ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <motion.button
        className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.15 }}
        aria-label="Notificaciones"
      >
        <Bell size={16} className="text-muted-foreground" />

        {/* Badge de conteo animado */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              key="badge"
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 flex items-center justify-center px-1"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <span className="text-white text-[9px] font-bold leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-10 w-80 bg-white rounded-xl border border-border shadow-lg z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Notificaciones</span>
                {unreadCount > 0 && (
                  <Badge className="bg-rose-100 text-rose-600 border-0 text-xs h-5 px-1.5">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <CheckCheck size={12} className="mr-1" />
                  Marcar todas
                </Button>
              )}
            </div>

            {/* List */}
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell size={18} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Sin notificaciones</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aquí verás los eventos del equipo en tiempo real
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif, idx) => {
                    const cfg = TYPE_CONFIG[notif.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.profile_updated;
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={notif.id}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          !notif.read ? "bg-primary/3 hover:bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                        onClick={() => {
                          if (!notif.read) markRead.mutate({ id: notif.id });
                        }}
                      >
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon size={14} className={cfg.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs font-medium leading-tight ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {timeAgo(notif.createdAt)}
                          </p>
                        </div>
                        {!notif.read && (
                          <button
                            className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead.mutate({ id: notif.id });
                            }}
                            title="Marcar como leída"
                          >
                            <Check size={12} className="text-muted-foreground hover:text-primary" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
