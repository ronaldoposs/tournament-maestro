import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Participants from "./pages/Participants";
import Brackets from "./pages/Brackets";
import Rankings from "./pages/Rankings";
import Reports from "./pages/Reports";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PublicTournament from "./pages/PublicTournament";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route — accessible without login */}
      <Route path="/public/torneio/:id" element={<PublicTournament />} />

      {!user ? (
        <Route path="*" element={<Auth />} />
      ) : (
        <>
          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute role="organizer" redirectTo="/tournaments"><Dashboard /></ProtectedRoute>} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/participants" element={<Participants />} />
            <Route path="/brackets" element={<Brackets />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/reports" element={<ProtectedRoute role="organizer"><Reports /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
