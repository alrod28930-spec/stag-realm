import { useState, useEffect } from 'react';
import { Bell, Settings, User, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { QuickAnalystButton } from '@/components/voice/QuickAnalystButton';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleAnalystOpen = () => {
    navigate('/intelligence');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Mock connection status changes
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly simulate connection issues
      setIsConnected(prev => Math.random() > 0.95 ? !prev : prev);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left: StagAlgo Brand */}
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          StagAlgo
        </h1>
        <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              Disconnected
            </>
          )}
        </Badge>
      </div>

      {/* Center: Current Time */}
      <div className="flex items-center space-x-4">
        <div className="text-sm font-mono text-muted-foreground">
          {formatTime(currentTime)}
        </div>
        <div className="text-sm text-muted-foreground">
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Right: User Actions */}
      <div className="flex items-center space-x-2">
        <QuickAnalystButton onAnalystOpen={handleAnalystOpen} />
        
        <Button variant="ghost" size="sm">
          <Bell className="w-4 h-4" />
        </Button>
        
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{user?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-sm">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm">
              Role: {user?.role}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-sm text-destructive cursor-pointer"
              onClick={logout}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}