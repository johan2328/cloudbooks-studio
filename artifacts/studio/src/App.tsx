import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider, CartPanel } from "@/lib/cart";
import { StudioProvider } from "@/lib/studio-store";

/* ── Portal comercial ── */
import Landing from "@/pages/landing";
import Books from "@/pages/books";
import AI200Packs from "@/pages/ai200-packs";
import Login from "@/pages/login";
import NuestraLaborPage from "@/pages/nuestra-labor";
import EmpresasPage from "@/pages/empresas";
import DemoPage from "@/pages/demo";

/* ── Catálogo jerárquico ── */
import Catalogo from "@/pages/catalogo";
import Azure from "@/pages/azure";

/* ── Production Studio ── */
import StudioDashboard from "@/pages/studio-dashboard";
import AI200Collection from "@/pages/ai200";
import Biblioteca from "@/pages/biblioteca";
import Contenido from "@/pages/contenido";
import Generacion from "@/pages/generacion";
import QAPage from "@/pages/qa";
import QAReportPage from "@/pages/qa-report";
import Exportacion from "@/pages/exportacion";
import Contrato from "@/pages/contrato";
import Estandares from "@/pages/estandares";
import Actividad from "@/pages/actividad";
import ComposerPage from "@/pages/composer";
import Conectores from "@/pages/conectores";
import Assets from "@/pages/assets";
import ContenidoGrounding from "@/pages/contenido-grounding";

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

/* Paths que pertenecen al Production Studio (requieren StudioProvider) */
const STUDIO_PREFIXES = [
  "/studio", "/biblioteca", "/generacion", "/qa", "/qa-report", "/exportacion",
  "/contrato", "/estandares", "/actividad", "/composer", "/conectores", "/assets",
  "/contenido", "/contenido-base", "/catalogo", "/azure", "/ai-200",
];

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* ── Portal comercial (público) ──────────────────────────────── */}
      <Route path="/" component={Landing} />
      <Route path="/portal" component={Landing} />
      <Route path="/books" component={Books} />
      <Route path="/ai-200-packs" component={AI200Packs} />
      <Route path="/nuestra-labor" component={NuestraLaborPage} />
      <Route path="/empresas" component={EmpresasPage} />
      <Route path="/demo" component={DemoPage} />

      {/* ── Production Studio ──────────────────────────────────────── */}
      <Route path="/studio">
        <PrivateRoute><StudioDashboard /></PrivateRoute>
      </Route>

      <Route path="/catalogo">
        <PrivateRoute><Catalogo /></PrivateRoute>
      </Route>
      <Route path="/azure">
        <PrivateRoute><Azure /></PrivateRoute>
      </Route>

      <Route path="/ai-200">
        <PrivateRoute><AI200Collection /></PrivateRoute>
      </Route>

      <Route path="/biblioteca">
        <PrivateRoute><Biblioteca /></PrivateRoute>
      </Route>

      <Route path="/contenido/:id">
        {() => <PrivateRoute><Contenido /></PrivateRoute>}
      </Route>
      <Route path="/contenido">
        <Redirect to="/contenido-base" />
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

      <Route path="/qa-report/:id">
        {() => <PrivateRoute><QAReportPage /></PrivateRoute>}
      </Route>

      <Route path="/composer/:id">
        {() => <PrivateRoute><ComposerPage /></PrivateRoute>}
      </Route>
      <Route path="/composer">
        <Redirect to="/composer/01" />
      </Route>

      <Route path="/exportacion">
        <PrivateRoute><Exportacion /></PrivateRoute>
      </Route>

      <Route path="/estandares">
        <PrivateRoute><Estandares /></PrivateRoute>
      </Route>

      <Route path="/contrato">
        <PrivateRoute><Contrato /></PrivateRoute>
      </Route>

      <Route path="/actividad">
        <PrivateRoute><Actividad /></PrivateRoute>
      </Route>

      <Route path="/conectores">
        <PrivateRoute><Conectores /></PrivateRoute>
      </Route>

      <Route path="/assets">
        <PrivateRoute><Assets /></PrivateRoute>
      </Route>

      <Route path="/contenido-base">
        <PrivateRoute><ContenidoGrounding /></PrivateRoute>
      </Route>

      <Route path="/ejecuciones">
        <Redirect to="/actividad" />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Monta StudioProvider para rutas del Production Studio,
 * CartProvider + CartPanel para el portal comercial.
 * Los dos contextos no se mezclan.
 */
function SectionProviders() {
  const [location] = useLocation();
  const isStudio = STUDIO_PREFIXES.some(
    p => location === p || location.startsWith(p + "/"),
  );

  if (isStudio) {
    return (
      <StudioProvider>
        <Router />
      </StudioProvider>
    );
  }

  return (
    <CartProvider>
      <Router />
      <CartPanel />
    </CartProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <SectionProviders />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
