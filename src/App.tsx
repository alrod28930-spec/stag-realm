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
import Charts from "@/pages/Charts";
import BrokerageDock from "@/pages/BrokerageDock";
import Cradle from "@/pages/Cradle";
import About from "@/pages/About";
import Subscription from "@/pages/Subscription";
import Workspace from "@/pages/Workspace";
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
  
  // Simplified version - just render a basic structure to test
  return (
    <div style={{ padding: '20px', color: 'white', backgroundColor: '#1a1a1a', minHeight: '100vh' }}>
      <h1>StagAlgo Loading...</h1>
      <p>If you see this, React is working!</p>
      <p>Now loading the full application...</p>
    </div>
  );
};

export default App;