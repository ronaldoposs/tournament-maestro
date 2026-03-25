import { Trophy, Users, LayoutDashboard, GitBranch, Medal, FileBarChart, LogOut } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const allNavItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["organizer"] },
  { to: "/tournaments", label: "Torneios", icon: Trophy, roles: ["organizer", "participant"] },
  { to: "/participants", label: "Participantes", icon: Users, roles: ["organizer"] },
  { to: "/brackets", label: "Chaveamentos", icon: GitBranch, roles: ["organizer", "participant"] },
  { to: "/rankings", label: "Classificação", icon: Medal, roles: ["organizer", "participant"] },
  { to: "/reports", label: "Relatórios", icon: FileBarChart, roles: ["organizer"] },
];

export default function AppSidebar() {
  const { pathname } = useLocation();
  const { role, displayName } = useAuth();

  const navItems = allNavItems.filter((item) => item.roles.includes(role || "participant"));

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg accent-gradient flex items-center justify-center">
          <Trophy className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-heading font-bold text-sidebar-foreground">TorneiosPro</h1>
          <p className="text-xs text-sidebar-foreground/60">Gestão Esportiva</p>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 mx-3 mb-2 rounded-lg bg-sidebar-accent">
        <p className="text-xs text-sidebar-foreground/60 font-medium">Conectado como</p>
        <p className="text-sm font-semibold text-sidebar-foreground truncate">{displayName}</p>
        <p className="text-xs text-sidebar-foreground/60 capitalize mt-0.5">
          {role === "organizer" ? "Organizador" : "Participante"}
        </p>
      </div>

      <div className="px-3 mb-4">
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 px-4 py-2 w-full rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
