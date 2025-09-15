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
import { GlobalVoiceInterface } from "@/components/voice/GlobalVoiceInterface";
import { useEffect, lazy, Suspense } from "react";
import { toggleService } from '@/services/toggleService';
import { riskEnforcement } from '@/services/riskEnforcement';
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Market = lazy(() => import("@/pages/Market"));
const Portfolio = lazy(() => import("@/pages/Portfolio"));
const TradingDesk = lazy(() => import("@/pages/TradingDesk"));
const Charts = lazy(() => import("@/pages/Charts"));
const BrokerageDock = lazy(() => import("@/pages/BrokerageDock"));
const Cradle = lazy(() => import("@/pages/Cradle"));
const About = lazy(() => import("@/pages/About"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Workspace = lazy(() => import("@/pages/Workspace"));
const Settings = lazy(() => import("@/pages/Settings"));
const SystemMonitor = lazy(() => import("@/pages/SystemMonitor"));
const AdminPortal = lazy(() => import("@/pages/AdminPortal"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const Download = lazy(() => import("@/pages/Download"));
const Intelligence = lazy(() => import("@/pages/Intelligence"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
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
                        <Route path="/charts" element={<Charts />} />
                        <Route path="/workspace" element={<Workspace />} />
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
                    <GlobalVoiceInterface />
                  </AuthGuard>
                } />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ComplianceProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;