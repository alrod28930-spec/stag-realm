import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Monitor, 
  Mic, 
  Speaker, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Zap,
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DesktopInstallerProps {
  onInstallComplete?: () => void;
}

export function DesktopInstaller({ onInstallComplete }: DesktopInstallerProps) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [installStep, setInstallStep] = useState<'idle' | 'downloading' | 'installing' | 'permissions' | 'complete'>('idle');
  const [permissions, setPermissions] = useState({
    microphone: false,
    speaker: false,
    notifications: false
  });
  const { toast } = useToast();

  const detectOS = () => {
    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;
    const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
    const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
    const iosPlatforms = ['iPhone', 'iPad', 'iPod'];
    
    if (macosPlatforms.indexOf(platform) !== -1) {
      return 'macOS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
      return 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
      return 'Windows';
    } else if (/Android/.test(userAgent)) {
      return 'Android';
    } else if (/Linux/.test(platform)) {
      return 'Linux';
    }
    return 'Unknown';
  };

  const getDownloadUrl = (os: string) => {
    // These would be real URLs to your built electron apps
    const baseUrl = 'https://releases.stagalgo.com/desktop';
    switch (os) {
      case 'Windows':
        return `${baseUrl}/StagAlgo-Setup.exe`;
      case 'macOS':
        return `${baseUrl}/StagAlgo-Setup.dmg`;
      case 'Linux':
        return `${baseUrl}/StagAlgo-Setup.AppImage`;
      default:
        return '';
    }
  };

  const requestPermissions = async () => {
    setInstallStep('permissions');
    
    try {
      // Request microphone permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissions(prev => ({ ...prev, microphone: true }));
        stream.getTracks().forEach(track => track.stop()); // Stop the stream
      }

      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setPermissions(prev => ({ ...prev, notifications: permission === 'granted' }));
      }

      // Speaker permission is implicit with microphone
      setPermissions(prev => ({ ...prev, speaker: true }));

      toast({
        title: "Permissions Granted",
        description: "StagAlgo has been granted the necessary permissions for full functionality.",
      });

      setTimeout(() => {
        setInstallStep('complete');
        onInstallComplete?.();
      }, 1500);

    } catch (error) {
      console.error('Permission error:', error);
      toast({
        title: "Permission Warning",
        description: "Some permissions were not granted. You can enable them later in settings.",
        variant: "destructive",
      });
      setInstallStep('complete');
    }
  };

  const simulateDownload = async (os: string) => {
    setIsDownloading(true);
    setInstallStep('downloading');
    setDownloadProgress(0);

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setInstallStep('installing');
          
          // Simulate installation
          setTimeout(() => {
            requestPermissions();
          }, 2000);
          
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Create download link for the actual file
    const downloadUrl = getDownloadUrl(os);
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `StagAlgo-${os}-Setup`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Download Started",
      description: `Downloading StagAlgo for ${os}. The installer will guide you through the setup process.`,
    });
  };

  const handleDownload = () => {
    const os = detectOS();
    if (os === 'Unknown' || os === 'iOS' || os === 'Android') {
      toast({
        title: "Platform Not Supported",
        description: "Desktop app is available for Windows, macOS, and Linux only.",
        variant: "destructive",
      });
      return;
    }
    simulateDownload(os);
  };

  const os = detectOS();
  const isDesktopOS = ['Windows', 'macOS', 'Linux'].includes(os);

  if (installStep === 'complete') {
    return (
      <Card className="glow-gold shadow-elevated">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-success mb-4" />
          <CardTitle className="text-2xl text-success">Installation Complete!</CardTitle>
          <CardDescription>
            StagAlgo Desktop has been successfully installed with all necessary permissions.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Mic className={`w-6 h-6 mx-auto mb-2 ${permissions.microphone ? 'text-success' : 'text-muted-foreground'}`} />
              <p className="text-xs">Microphone</p>
            </div>
            <div className="text-center">
              <Speaker className={`w-6 h-6 mx-auto mb-2 ${permissions.speaker ? 'text-success' : 'text-muted-foreground'}`} />
              <p className="text-xs">Speaker</p>
            </div>
            <div className="text-center">
              <Shield className={`w-6 h-6 mx-auto mb-2 ${permissions.notifications ? 'text-success' : 'text-muted-foreground'}`} />
              <p className="text-xs">Notifications</p>
            </div>
          </div>
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            Launch StagAlgo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glow-gold shadow-elevated max-w-md mx-auto">
      <CardHeader className="text-center">
        <Monitor className="w-16 h-16 mx-auto text-primary mb-4" />
        <CardTitle className="text-2xl">Install StagAlgo Desktop</CardTitle>
        <CardDescription>
          Professional trading platform optimized for {os}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Star className="w-5 h-5 text-primary" />
            <span className="text-sm">Professional-grade trading tools</span>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-accent" />
            <span className="text-sm">Real-time market data & execution</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-warning" />
            <span className="text-sm">Bank-level security & encryption</span>
          </div>
        </div>

        {/* System Requirements */}
        {isDesktopOS && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Permissions Required:</strong> Microphone and speaker access for voice features, 
              notifications for trading alerts.
            </AlertDescription>
          </Alert>
        )}

        {/* Download Progress */}
        {installStep !== 'idle' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>
                {installStep === 'downloading' && 'Downloading...'}
                {installStep === 'installing' && 'Installing...'}
                {installStep === 'permissions' && 'Configuring Permissions...'}
              </span>
              {installStep === 'downloading' && (
                <span>{Math.round(downloadProgress)}%</span>
              )}
            </div>
            
            {installStep === 'downloading' && (
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            )}

            {(installStep === 'installing' || installStep === 'permissions') && (
              <div className="flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}

        {/* Download Button */}
        {isDesktopOS ? (
          <Button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-gold"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Installing for {os}...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download for {os}
              </>
            )}
          </Button>
        ) : (
          <div className="text-center space-y-3">
            <Badge variant="secondary" className="mb-3">
              {os} Not Supported
            </Badge>
            <p className="text-sm text-muted-foreground">
              Desktop app is available for Windows, macOS, and Linux only.
            </p>
            <Button variant="outline" className="w-full">
              Use Web Version Instead
            </Button>
          </div>
        )}

        {/* OS Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs">
            Detected: {os}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}