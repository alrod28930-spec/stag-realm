import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Smartphone, Monitor, Globe, Star, Shield, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function DownloadPage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent));
    setIsAndroid(/Android/.test(userAgent));
    setIsMobile(/Mobi|Android/i.test(userAgent));

    // Check if PWA is installable
    const checkPWA = () => {
      if ('serviceWorker' in navigator) {
        setIsPWAInstallable(true);
      }
    };
    checkPWA();
  }, []);

  const installPWA = () => {
    if (isIOS) {
      alert('To install: Tap the Share button in Safari, then tap "Add to Home Screen"');
    } else if (isAndroid) {
      alert('To install: Tap the menu (⋮) in Chrome, then tap "Add to Home screen"');
    } else {
      alert('To install: Look for the install icon in your browser\'s address bar');
    }
  };

  return (
    <div className="min-h-screen bg-background starfield">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-card to-background">
        <div className="absolute inset-0 bg-gradient-starfield opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png"
                alt="StagAlgo Logo"
                className="h-20 w-20 rounded-2xl shadow-elevated glow-gold"
              />
            </div>
            <h1 className="text-5xl font-bold text-foreground mb-6">
              Download <span className="text-primary">StagAlgo</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Professional algorithmic trading platform available on all your devices. 
              Trade smarter with advanced analytics, real-time data, and intelligent automation.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Badge variant="secondary" className="text-sm px-4 py-2">
                <Star className="w-4 h-4 mr-2" />
                Professional Grade
              </Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                Bank-Level Security
              </Badge>
              <Badge variant="secondary" className="text-sm px-4 py-2">
                <Zap className="w-4 h-4 mr-2" />
                Real-Time Trading
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Download Options */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Web App / PWA */}
          <Card className="glow-gold hover:shadow-elevated transition-smooth">
            <CardHeader className="text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 text-primary" />
              <CardTitle>Web Application</CardTitle>
              <CardDescription>
                Install directly from your browser. Works on all devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <Badge variant="outline">✓ Instant Access</Badge>
                <Badge variant="outline">✓ Auto Updates</Badge>
                <Badge variant="outline">✓ Offline Browsing</Badge>
              </div>
              {isPWAInstallable ? (
                <Button 
                  onClick={installPWA}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Install Web App
                </Button>
              ) : (
                <Button className="w-full" variant="outline">
                  <Globe className="w-4 h-4 mr-2" />
                  Open Web App
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {isIOS && "Safari: Share → Add to Home Screen"}
                {isAndroid && "Chrome: Menu → Add to Home screen"}
                {!isMobile && "Look for install icon in address bar"}
              </p>
            </CardContent>
          </Card>

          {/* Mobile Apps */}
          <Card className="glow-gold hover:shadow-elevated transition-smooth">
            <CardHeader className="text-center">
              <Smartphone className="w-12 h-12 mx-auto mb-4 text-accent" />
              <CardTitle>Mobile Apps</CardTitle>
              <CardDescription>
                Native iOS and Android apps for the best mobile experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <Badge variant="outline">✓ Native Performance</Badge>
                <Badge variant="outline">✓ Push Notifications</Badge>
                <Badge variant="outline">✓ Touch Optimized</Badge>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  disabled
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download for iOS
                </Button>
                <Button 
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  disabled
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download for Android
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Coming soon to App Store & Google Play
              </p>
            </CardContent>
          </Card>

          {/* Desktop Apps */}
          <Card className="glow-gold hover:shadow-elevated transition-smooth border-primary/30">
            <CardHeader className="text-center">
              <Monitor className="w-12 h-12 mx-auto mb-4 text-warning" />
              <CardTitle>Desktop Apps</CardTitle>
              <CardDescription>
                Native desktop applications with full permissions and installer wizard.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="space-y-2">
                <Badge variant="outline">✓ Full Screen Experience</Badge>
                <Badge variant="outline">✓ Voice & Audio Features</Badge>
                <Badge variant="outline">✓ System Integration</Badge>
              </div>
              <div className="space-y-2">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  onClick={() => {
                    const userAgent = navigator.userAgent;
                    const isWindows = userAgent.indexOf('Win') !== -1;
                    const isMac = userAgent.indexOf('Mac') !== -1;
                    const isLinux = userAgent.indexOf('Linux') !== -1;
                    
                    let os = 'Unknown';
                    if (isWindows) os = 'Windows';
                    else if (isMac) os = 'macOS';
                    else if (isLinux) os = 'Linux';
                    
                    if (os !== 'Unknown') {
                      // Trigger download
                      const link = document.createElement('a');
                      link.href = `https://releases.stagalgo.com/desktop/StagAlgo-${os}-Setup`;
                      link.download = `StagAlgo-${os}-Setup`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      // Show toast
                      const event = new CustomEvent('show-toast', {
                        detail: {
                          title: "Download Started",
                          description: `Downloading StagAlgo for ${os}. Run the installer when download completes.`
                        }
                      });
                      window.dispatchEvent(event);
                    } else {
                      alert('Desktop app is available for Windows, macOS, and Linux only.');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Desktop App
                </Button>
                <p className="text-xs text-muted-foreground">
                  Includes installer wizard with permission setup
                </p>
              </div>
              <Alert className="text-left">
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Permissions:</strong> Installer will request microphone and speaker access for voice features.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Features Section */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Why Choose StagAlgo?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "Real-Time Data",
                description: "Live market data and instant trade execution"
              },
              {
                icon: Shield,
                title: "Secure Trading",
                description: "Bank-level encryption and security protocols"
              },
              {
                icon: Star,
                title: "Professional Tools",
                description: "Advanced analytics and trading algorithms"
              },
              {
                icon: Globe,
                title: "Cross-Platform",
                description: "Seamless experience across all devices"
              }
            ].map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <feature.icon className="w-8 h-8 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}