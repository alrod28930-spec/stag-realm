import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthPage } from "@/components/auth/AuthPage";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComplianceProvider } from "@/components/compliance/ComplianceProvider";
import { PWAInstall } from "@/components/PWAInstall";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { toggleService } from '@/services/toggleService';
import { riskEnforcement } from '@/services/riskEnforcement';
import Dashboard from "@/pages/Dashboard";
import Market from "@/pages/Market";
import Portfolio from "@/pages/Portfolio";
import TradingDesk from "@/pages/TradingDesk";
import BrokerageDock from "@/pages/BrokerageDock";
import Cradle from "@/pages/Cradle";
import About from "@/pages/About";
import Subscription from "@/pages/Subscription";
import Settings from "@/pages/Settings";
import SystemMonitor from "@/pages/SystemMonitor";
import AdminPortal from "@/pages/AdminPortal";
import VerifyEmail from "@/pages/VerifyEmail";
import Download from "@/pages/Download";
import Intelligence from "@/pages/Intelligence";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log('🚀 App component rendering');
  useEffect(() => {
    const initApp = async () => {
      // Initialize auth first - critical for all other services
      await useAuthStore.getState().initializeAuth();
      
      // Initialize risk enforcement system
      console.log('🛡️ Risk enforcement system initialized');
      
      // Log current risk status for monitoring
      const riskStatus = toggleService.getRiskStatus();
      console.log('🛡️ Initial risk status:', riskStatus);
    };
    initApp();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ComplianceProvider>
          <PWAInstall />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public routes (no auth required) */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/verify" element={<VerifyEmail />} />
              <Route path="/download" element={<Download />} />
              
              {/* Protected routes */}
              <Route path="/*" element={
                <AuthGuard>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/intelligence" element={<Intelligence />} />
                      <Route path="/market" element={<Market />} />
                      <Route path="/portfolio" element={<Portfolio />} />
                      <Route path="/trading-desk" element={<TradingDesk />} />
                      <Route path="/brokerage-dock" element={<BrokerageDock />} />
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
};

export default App;