import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Login from "@/pages/login";
import Catalogo from "@/pages/catalogo";
import Azure from "@/pages/azure";
import AI200Collection from "@/pages/ai200";
import Biblioteca from "@/pages/biblioteca";
import Contenido from "@/pages/contenido";
import Generacion from "@/pages/generacion";
import QAPage from "@/pages/qa";
import Exportacion from "@/pages/exportacion";
import Contrato from "@/pages/contrato";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Root → CloudBooks Library */}
      <Route path="/">
        <Redirect to="/catalogo" />
      </Route>

      {/* ── Catálogo jerárquico ─────────────────────────── */}
      {/* Nivel 1: Proveedores cloud */}
      <Route path="/catalogo">
        <PrivateRoute><Catalogo /></PrivateRoute>
      </Route>

      {/* Nivel 2: Certificaciones Azure */}
      <Route path="/azure">
        <PrivateRoute><Azure /></PrivateRoute>
      </Route>

      {/* Nivel 3: AI-200 Certification Collection */}
      <Route path="/ai-200">
        <PrivateRoute><AI200Collection /></PrivateRoute>
      </Route>

      {/* ── Estudio Visual Atlas (AI-200) ───────────────── */}
      <Route path="/biblioteca">
        <PrivateRoute><Biblioteca /></PrivateRoute>
      </Route>

      <Route path="/contenido/:id">
        {() => <PrivateRoute><Contenido /></PrivateRoute>}
      </Route>

      <Route path="/contenido">
        <Redirect to="/contenido/1" />
      </Route>

      <Route path="/generacion">
        <PrivateRoute><Generacion /></PrivateRoute>
      </Route>

      <Route path="/qa/:id">
        {() => <PrivateRoute><QAPage /></PrivateRoute>}
      </Route>

      <Route path="/qa">
        <Redirect to="/qa/1" />
      </Route>

      <Route path="/exportacion">
        <PrivateRoute><Exportacion /></PrivateRoute>
      </Route>

      <Route path="/contrato">
        <PrivateRoute><Contrato /></PrivateRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
