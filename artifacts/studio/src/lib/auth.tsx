import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User } from "@workspace/api-client-react";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("studio_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("studio_token"));

  function login(u: User, t: string) {
    setUser(u);
    setToken(t);
    localStorage.setItem("studio_user", JSON.stringify(u));
    localStorage.setItem("studio_token", t);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("studio_user");
    localStorage.removeItem("studio_token");
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
