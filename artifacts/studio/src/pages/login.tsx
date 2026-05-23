import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const USERS = [
  { username: "directora", displayName: "Directora Editorial", role: "Admin",    initial: "DE" },
  { username: "disenador", displayName: "Diseñador Sr",        role: "Editor",   initial: "DS" },
  { username: "qa",        displayName: "QA Specialist",       role: "Reviewer", initial: "QA" },
  { username: "exportacion", displayName: "Exportación Lead",  role: "Exporter", initial: "EL" },
];

export default function Login() {
  const [selected, setSelected] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const loginMutation = useLogin();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError("");
    loginMutation.mutate(
      { data: { username: selected, pin } },
      {
        onSuccess: (result) => {
          login(result.user, result.token);
          setLocation("/biblioteca");
        },
        onError: () => setError("PIN incorrecto. Intenta de nuevo."),
      }
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — CloudBooks brand identity */}
      <div className="hidden lg:flex w-80 bg-[#0d1629] flex-col items-center justify-center px-10 shrink-0 relative overflow-hidden">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />

        {/* Logo — full PNG, blends with navy bg */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          <img
            src="/cloudbooks-logo-nobg.png"
            alt="CloudBooks"
            className="w-56 drop-shadow-[0_0_32px_rgba(99,102,241,0.25)]"
            draggable={false}
          />
          {/* Divider */}
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          {/* Product line */}
          <div className="text-center space-y-1">
            <p className="text-[9px] text-blue-300/50 uppercase tracking-[3.5px] font-medium">
              Estudio Editorial
            </p>
            <p className="text-[8px] text-white/20 uppercase tracking-[2px]">
              AI-200 Visual Study Atlas
            </p>
          </div>
        </div>

        {/* Bottom label */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <p className="text-[8px] text-white/12 tracking-widest uppercase">Plataforma editorial interna</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 bg-[#f8f9fb] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-[#0d1629] rounded-lg p-3 inline-flex">
              <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-10" />
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Acceso al estudio</h1>
            <p className="text-xs text-gray-400 mt-0.5">Selecciona tu perfil e introduce tu PIN</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Perfil de trabajo
            </p>

            {/* Profile grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {USERS.map((u) => (
                <button
                  key={u.username}
                  data-testid={`user-card-${u.username}`}
                  onClick={() => { setSelected(u.username); setPin(""); setError(""); }}
                  className={cn(
                    "p-2.5 rounded-sm border text-left transition-all",
                    selected === u.username
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                      selected === u.username
                        ? "bg-gradient-to-br from-blue-600 to-violet-600"
                        : "bg-[#0d1629]"
                    )}>
                      {u.initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-gray-900 leading-tight truncate">
                        {u.displayName}
                      </p>
                      <p className="text-[9px] text-gray-400">{u.role}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* PIN entry */}
            {selected ? (
              <form onSubmit={handleSubmit} className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    PIN de acceso
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="· · · ·"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    data-testid="input-pin"
                    className="text-center text-xl tracking-[0.5em] font-mono h-11 border-gray-200 focus:border-blue-400 focus:ring-blue-200"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-sm">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={pin.length < 4 || loginMutation.isPending}
                  data-testid="button-submit-login"
                  className="w-full h-9 text-sm font-semibold bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 border-0 text-white shadow-sm"
                >
                  {loginMutation.isPending ? "Verificando…" : "Acceder al estudio"}
                </Button>
              </form>
            ) : (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] text-gray-300 text-center">
                  Selecciona un perfil para continuar
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-[9px] text-gray-300 mt-5">
            Acceso restringido · PIN universal demo: 1234
          </p>
        </div>
      </div>
    </div>
  );
}
