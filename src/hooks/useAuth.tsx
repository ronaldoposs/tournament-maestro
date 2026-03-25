import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "organizer" | "participant";

interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  displayName: string;
  loading: boolean;
  isOrganizer: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  role: null,
  displayName: "",
  loading: true,
  isOrganizer: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Fetch role and profile after auth change (defer to avoid deadlocks)
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setDisplayName("");
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("display_name").eq("user_id", userId).single(),
    ]);
    setRole((roles?.[0]?.role as AppRole) ?? "participant");
    setDisplayName(profile?.display_name ?? "");
    setLoading(false);
  }

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider value={{ session, user, role, displayName, loading, isOrganizer: role === "organizer" }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
