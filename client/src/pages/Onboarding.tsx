import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import {
  BrainCircuit,
  Send,
  CheckCircle2,
  Layers,
  RotateCcw,
  ArrowRight,
  Loader2,
  User,
  Bot,
} from "lucide-react";

const LAYERS = [
  { name: "Organizacionales", color: "bg-primary" },
  { name: "Liderazgo", color: "bg-purple-500" },
  { name: "Funcionales", color: "bg-amber-500" },
  { name: "Estratégicas Futuras", color: "bg-cyan-500" },
];

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: session, refetch } = trpc.onboarding.getSession.useQuery();
  const sendMessage = trpc.onboarding.sendMessage.useMutation({
    onSuccess: () => refetch(),
  });
  const resetMutation = trpc.onboarding.reset.useMutation({
    onSuccess: () => refetch(),
  });

  const messages = (session?.messages as { role: string; content: string }[]) ?? [];
  const isCompleted = session?.status === "completed";
  const isInProgress = session?.status === "in_progress";

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-start: send greeting if no messages
  useEffect(() => {
    if (session && messages.length === 0 && !sending) {
      handleSend("Hola, estoy listo para comenzar mi onboarding.");
    }
  }, [session?.id]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    try {
      await sendMessage.mutateAsync({ message: msg });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Progress estimation based on message count
  const progressPct = Math.min(100, Math.round((messages.length / 16) * 100));
  const layerProgress = Math.min(4, Math.floor(messages.length / 4));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg brand-gradient flex items-center justify-center">
              <BrainCircuit size={18} className="text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Onboarding Conversacional</h1>
              <p className="text-xs text-muted-foreground">
                Agente AI · Framework 4 Capas de Competencias
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 size={12} className="mr-1" />
                Completado
              </Badge>
            )}
            {!isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground btn-press"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                <RotateCcw size={14} className="mr-1.5" />
                Reiniciar
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!isCompleted && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers size={12} />
                Progreso del onboarding
              </span>
              <span className="text-xs font-medium text-primary">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
            <div className="flex gap-2 mt-2">
              {LAYERS.map((layer, i) => (
                <div key={layer.name} className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < layerProgress ? layer.color : "bg-muted"
                    }`}
                  />
                  <span className={`text-xs ${i < layerProgress ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {layer.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === "assistant"
                  ? "brand-gradient"
                  : "bg-secondary border border-border"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot size={15} className="text-white" />
              ) : (
                <User size={15} className="text-muted-foreground" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-white border border-border card-soft text-foreground rounded-tl-sm"
                  : "bg-primary text-primary-foreground rounded-tr-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <Streamdown>{msg.content}</Streamdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center flex-shrink-0">
              <Bot size={15} className="text-white" />
            </div>
            <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 card-soft">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Completed state */}
      {isCompleted && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-emerald-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} />
              <span className="font-medium text-sm">
                ¡Onboarding completado! Tu perfil de competencias fue registrado.
              </span>
            </div>
            <Button
              onClick={() => navigate("/proof-of-skills")}
              className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              Ir a Proof of Skills
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Input area */}
      {!isCompleted && (
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-white">
          <div className="flex gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta..."
              disabled={sending}
              className="flex-1 h-10 text-sm"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || sending}
              className="btn-press bg-primary hover:bg-primary/90 text-primary-foreground h-10 w-10 p-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Presiona Enter para enviar · El agente AI adaptará las preguntas según tus respuestas
          </p>
        </div>
      )}
    </div>
  );
}
