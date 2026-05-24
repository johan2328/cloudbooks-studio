import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider, CartPanel } from "@/lib/cart";
import Landing from "@/pages/landing";
import Books from "@/pages/books";
import AI200Packs from "@/pages/ai200-packs";
import Login from "@/pages/login";
import NuestraLaborPage from "@/pages/nuestra-labor";
import EmpresasPage from "@/pages/empresas";
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

      {/* Portal comercial (público) */}
      <Route path="/" component={Landing} />
      <Route path="/portal" component={Landing} />
      <Route path="/books" component={Books} />
      <Route path="/ai-200-packs" component={AI200Packs} />
      <Route path="/nuestra-labor" component={NuestraLaborPage} />
      <Route path="/empresas" component={EmpresasPage} />

      {/* ── Catálogo jerárquico ───────────────────── */}
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
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
            <CartPanel />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
