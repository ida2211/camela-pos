import { useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";

export function ProtectedRoute() {
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      window.location.href = "/login";
    }
  }, []);

  const isLoggedIn = localStorage.getItem("isLoggedIn");
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
