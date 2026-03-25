import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  role: "organizer" | "participant";
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { role: userRole } = useAuth();

  if (userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
