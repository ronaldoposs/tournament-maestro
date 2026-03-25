import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  role: "organizer" | "participant";
  redirectTo?: string;
}

export default function ProtectedRoute({ children, role, redirectTo = "/" }: ProtectedRouteProps) {
  const { role: userRole, loading } = useAuth();

  if (loading) return null;

  if (userRole !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
