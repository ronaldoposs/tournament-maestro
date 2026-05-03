import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Menu, Moon, Sun, Trophy } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import AppSidebar from "./AppSidebar";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

export default function Layout() {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
              <AppSidebar onNavigate={() => setOpen(false)} embedded />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
              <Trophy className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-sidebar-foreground">TorneiosPro</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} className="text-sidebar-foreground hover:bg-sidebar-accent">
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </header>

      {/* Desktop floating theme toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggle}
        className="hidden lg:flex fixed top-4 right-4 z-30 rounded-full shadow-md"
        aria-label="Alternar tema"
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </Button>

      <main className="lg:ml-64 p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
