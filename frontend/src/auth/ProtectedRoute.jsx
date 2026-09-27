import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  department,
  children,
}) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to={`/login/${department}`} replace />;
  }

  const userDept = user.department?.toLowerCase();
  const targetDept = department?.toLowerCase();

  // Allow engineering/track/civil interchangeably
  const isMatch = 
    userDept === targetDept || 
    ((userDept === "engineering" || userDept === "track" || userDept === "civil") &&
     (targetDept === "engineering" || targetDept === "track" || targetDept === "civil"));

  if (!isMatch) {
    return <Navigate to={`/login/${department}`} replace />;
  }

  return children;
}