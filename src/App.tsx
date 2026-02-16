import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import StokBarang from "@/pages/StokBarang";
import Penjualan from "@/pages/Penjualan";
import Pengeluaran from "@/pages/Pengeluaran";
import Laporan from "@/pages/Laporan";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import StoreProfile from "@/pages/StoreProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile" element={<StoreProfile />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/stok" element={<StokBarang />} />
              <Route path="/penjualan" element={<Penjualan />} />
              <Route path="/pengeluaran" element={<Pengeluaran />} />
              <Route path="/laporan" element={<Laporan />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
