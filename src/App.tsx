import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComplianceProvider } from "@/components/compliance/ComplianceProvider";
import Dashboard from "@/pages/Dashboard";
import Market from "@/pages/Market";
import Portfolio from "@/pages/Portfolio";
import TradingDesk from "@/pages/TradingDesk";
import Cradle from "@/pages/Cradle";
import About from "@/pages/About";
import Subscription from "@/pages/Subscription";
import Settings from "@/pages/Settings";
import SystemMonitor from "@/pages/SystemMonitor";
import AdminPortal from "@/pages/AdminPortal";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ComplianceProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes (no auth required) */}
            <Route path="/auth/verify" element={<VerifyEmail />} />
            
            {/* Protected routes */}
            <Route path="/*" element={
              <AuthGuard>
                <DashboardLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/market" element={<Market />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/trading-desk" element={<TradingDesk />} />
                    <Route path="/cradle" element={<Cradle />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/system-monitor" element={<SystemMonitor />} />
                    <Route path="/admin" element={<AdminPortal />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </DashboardLayout>
              </AuthGuard>
            } />
          </Routes>
        </BrowserRouter>
      </ComplianceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
