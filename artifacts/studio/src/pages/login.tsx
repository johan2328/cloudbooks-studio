import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const USERS = [
  { username: "directora", displayName: "Directora Editorial", role: "admin", initial: "DE" },
  { username: "disenador", displayName: "Diseñador Sr", role: "editor", initial: "DS" },
  { username: "qa", displayName: "QA Specialist", role: "reviewer", initial: "QA" },
  { username: "exportacion", displayName: "Exportación Lead", role: "exporter", initial: "EL" },
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
        onError: () => {
          setError("PIN incorrecto. Intenta de nuevo.");
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#0d1629] rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-teal-400 rounded-sm" />
            </div>
            <span className="text-[#0d1629] font-semibold text-lg tracking-tight">AI-200 Studio</span>
          </div>
          <p className="text-xs text-gray-400 tracking-widest uppercase font-medium">Consola Editorial — Acceso Restringido</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-8">
          <p className="text-sm font-medium text-gray-700 mb-4">Selecciona tu perfil</p>

          {/* User cards */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {USERS.map((u) => (
              <button
                key={u.username}
                data-testid={`user-card-${u.username}`}
                onClick={() => { setSelected(u.username); setPin(""); setError(""); }}
                className={cn(
                  "p-3 rounded-sm border text-left transition-all",
                  selected === u.username
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-8 h-8 rounded-sm flex items-center justify-center text-xs font-bold text-white",
                    selected === u.username ? "bg-teal-600" : "bg-[#0d1629]"
                  )}>
                    {u.initial}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900 leading-tight">{u.displayName}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* PIN form */}
          {selected && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">PIN de acceso</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="• • • •"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  data-testid="input-pin"
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-[#0d1629] hover:bg-[#1a2745] text-white"
                disabled={pin.length < 4 || loginMutation.isPending}
                data-testid="button-submit-login"
              >
                {loginMutation.isPending ? "Verificando..." : "Acceder al estudio"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-300 mt-6">
          Autenticación demo — PIN universal: 1234 · En producción configurar auth real
        </p>
      </div>
    </div>
  );
}
