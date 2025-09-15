import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Briefcase, 
  Activity, 
  BookOpen,
  Info, 
  CreditCard, 
  Settings, 
  Monitor, 
  Shield,
  ExternalLink,
  Brain,
  LineChart,
  Crown,
  Circle,
  Star,
  Target,
  Baby
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const location = useLocation();
  const { user, hasPermission } = useAuthStore();
  const { checkTabAccess, subscriptionStatus } = useSubscriptionAccess();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed' && !isMobile;
  
  const getTierIcon = (path: string) => {
    const tabAccess = checkTabAccess(path);
    const tier = tabAccess.requiresTier;
    
    switch (tier) {
      case 'standard':
        return { Icon: Circle, className: 'text-info' };
      case 'pro': 
        return { Icon: Star, className: 'text-accent' };
      case 'elite':
        return { Icon: Crown, className: 'text-warning' };
      default:
        return null;
    }
  };

  const navigationItems = [
    { title: 'Dashboard', url: '/', icon: BarChart3, description: 'Overview & analytics' },
    { title: 'Intelligence', url: '/intelligence', icon: Brain, description: 'AI analysis & Oracle signals' },
    { title: 'Market', url: '/market', icon: TrendingUp, description: 'Market data & AI insights' },
    { title: 'Paper Trading', url: '/paper-trading', icon: Target, description: 'Risk-free trading practice' },
    { title: 'Portfolio', url: '/portfolio', icon: Briefcase, description: 'Positions & audit trail' },
    { title: 'Trading Desk', url: '/trading-desk', icon: Activity, description: 'Manual & automated trading' },
    { title: 'Charts', url: '/charts', icon: LineChart, description: 'Live streaming charts & trading' },
    { title: 'Workspace', url: '/workspace', icon: Crown, description: 'Elite multi-panel workspace' },
    { title: 'Brokerage Dock', url: '/brokerage-dock', icon: ExternalLink, description: 'Access external brokerage accounts' },
    { title: 'Cradle', url: '/cradle', icon: Baby, description: 'Strategy incubator' },
  ];

  const adminItems = [
    { title: 'About', url: '/about', icon: Info, description: 'Platform overview' },
    { title: 'User Manual', url: '/user-manual', icon: BookOpen, description: 'Complete user guide' },
    { title: 'Subscription', url: '/subscription', icon: CreditCard, description: 'Manage your plan' },
    { title: 'Settings', url: '/settings', icon: Settings, description: 'App configuration' },
    { title: 'System Monitor', url: '/system-monitor', icon: Monitor, description: 'Core scaffold health' },
    { title: 'Admin Portal', url: '/admin', icon: Shield, description: 'Admin controls', adminOnly: true },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const isCurrentlyActive = isActive(path);
    return cn(
      "flex items-center gap-3 px-3 py-2 rounded-md transition-smooth group",
      isCurrentlyActive 
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-gold border border-primary/30" 
        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:shadow-gold hover:border hover:border-primary/20"
    );
  };

  const filteredAdminItems = adminItems.filter(item => {
    if (item.adminOnly) {
      return hasPermission('manage-users') || user?.role === 'Owner' || user?.role === 'Admin';
    }
    return true;
  });

  return (
    <Sidebar className={cn("border-r border-sidebar-border starfield", collapsed ? "w-16" : "w-64")}>
      <SidebarContent className="py-4">
        {/* Logo Section */}
        <div className="px-4 mb-8">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png" 
              alt="StagAlgo" 
              className="w-10 h-10 object-contain"
            />
            {!collapsed && (
              <div>
                <h2 className="text-xl font-bold text-primary font-serif">StagAlgo</h2>
                <p className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">Trading Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
            Trading Platform
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const tabAccess = checkTabAccess(item.url);
                const active = isActive(item.url);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            {tabAccess.isLocked ? (
                              <Link 
                                to="/subscription" 
                                className={cn(
                                  "flex items-center gap-3 px-3 py-2 rounded-md transition-smooth group",
                                  "text-sidebar-foreground/50 hover:bg-sidebar-accent/30 opacity-60 cursor-not-allowed"
                                )}
                              >
                                <div className="relative">
                                  <item.icon className="w-4 h-4 flex-shrink-0" />
                                  <Lock className="absolute -top-1 -right-1 h-3 w-3 text-muted-foreground" />
                                </div>
                                {!collapsed && (
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">{item.title}</span>
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs px-1 py-0 ml-auto"
                                      >
                                        {tabAccess.requiresTier === 'standard' ? 'STD' :
                                         tabAccess.requiresTier === 'pro' ? 'PRO' : 'ELITE'}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-sidebar-foreground/40 truncate">
                                      {item.description}
                                    </span>
                                  </div>
                                )}
                              </Link>
                            ) : (
                              <NavLink to={item.url} className={getNavClassName(item.url)}>
                                <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary-glow transition-colors" />
                                {!collapsed && (
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium truncate">{item.title}</span>
                                      {(() => {
                                        const tierIcon = getTierIcon(item.url);
                                        return tierIcon ? <tierIcon.Icon className={`w-3 h-3 ${tierIcon.className}`} /> : null;
                                      })()}
                                      {subscriptionStatus.isDemo && (
                                        <Badge variant="secondary" className="text-xs px-1 py-0 ml-auto">
                                          DEMO
                                        </Badge>
                                      )}
                                    </div>
                                    <span className="text-xs text-sidebar-foreground/60 truncate">
                                      {item.description}
                                    </span>
                                  </div>
                                )}
                              </NavLink>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                            {tabAccess.isLocked && (
                              <p className="text-xs text-warning mt-1">
                                Upgrade to {tabAccess.requiresTier} to unlock
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin & Settings */}
        <SidebarGroup className="mt-8">
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredAdminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className="w-4 h-4 flex-shrink-0 group-hover:text-primary-glow transition-colors" />
                      {!collapsed && (
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium truncate">{item.title}</span>
                          <span className="text-xs text-sidebar-foreground/60 truncate">
                            {item.description}
                          </span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Info in collapsed mode */}
        {collapsed && user && (
          <SidebarGroup className="mt-auto">
            <div className="px-3 py-2 text-center">
              <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-gold">
                <span className="text-xs font-semibold text-primary-foreground">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}