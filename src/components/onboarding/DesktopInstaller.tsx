import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Monitor, 
  Apple, 
  CheckCircle, 
  ExternalLink,
  Shield,
  FileText,
  User,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InstallerStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
}

export default function DesktopInstaller() {
  const [currentStep, setCurrentStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedEULA, setAcceptedEULA] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  
  const { toast } = useToast();

  const steps: InstallerStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to StagAlgo',
      description: 'Get started with our desktop application',
      icon: User,
      completed: currentStep > 0
    },
    {
      id: 'agreements',
      title: 'Legal Agreements',
      description: 'Review and accept our terms and policies',
      icon: Shield,
      completed: currentStep > 1
    },
    {
      id: 'download',
      title: 'Download & Install',
      description: 'Download the desktop application',
      icon: Download,
      completed: downloadComplete
    }
  ];

  const handleDownload = async (platform: 'windows' | 'mac') => {
    if (!acceptedTerms || !acceptedPrivacy || !acceptedEULA) {
      toast({
        title: "Agreement Required",
        description: "Please accept all agreements before downloading.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);
    
    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real implementation, this would trigger the actual download
      const downloadUrl = platform === 'windows' 
        ? '/downloads/StagAlgo-Setup.exe'
        : '/downloads/StagAlgo-Installer.dmg';
      
      // Create a temporary download link
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = platform === 'windows' ? 'StagAlgo-Setup.exe' : 'StagAlgo-Installer.dmg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadComplete(true);
      setCurrentStep(3);
      
      toast({
        title: "Download Started",
        description: `StagAlgo installer for ${platform === 'windows' ? 'Windows' : 'macOS'} is downloading.`
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error starting the download. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <img 
            src="/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png" 
            alt="StagAlgo" 
            className="w-16 h-16 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold">Install StagAlgo Desktop</h1>
        <p className="text-muted-foreground">
          Get the full StagAlgo experience with our native desktop application
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
              currentStep >= index
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-muted text-muted-foreground'
            }`}>
              {step.completed ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            
            {index < steps.length - 1 && (
              <div className={`w-20 h-0.5 mx-4 transition-colors ${
                currentStep > index ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {currentStep === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              Welcome to StagAlgo
            </CardTitle>
            <CardDescription>
              Professional algorithmic trading platform designed for modern traders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Shield className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Secure</h3>
                <p className="text-sm text-muted-foreground">
                  Enterprise-grade security for your trading data
                </p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <Zap className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Fast</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time market data and lightning-fast execution
                </p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-muted/30">
                <User className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-1">Intuitive</h3>
                <p className="text-sm text-muted-foreground">
                  User-friendly interface for traders of all levels
                </p>
              </div>
            </div>

            <div className="bg-muted/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What's Included:</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  AI-powered market analysis and trading signals
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  Advanced charting and technical analysis tools
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  Automated trading strategies and risk management
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  Real-time portfolio tracking and analytics
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={nextStep} className="gap-2">
                Get Started
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Legal Agreements
            </CardTitle>
            <CardDescription>
              Please review and accept our terms to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                />
                <div className="space-y-1">
                  <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                    I agree to the Terms of Service
                  </label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to our terms and conditions for using StagAlgo.
                    <Button variant="link" className="p-0 h-auto text-xs ml-1">
                      Read Terms of Service
                    </Button>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="privacy"
                  checked={acceptedPrivacy}
                  onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                />
                <div className="space-y-1">
                  <label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                    I agree to the Privacy Policy
                  </label>
                  <p className="text-xs text-muted-foreground">
                    We respect your privacy and will handle your data according to our privacy policy.
                    <Button variant="link" className="p-0 h-auto text-xs ml-1">
                      Read Privacy Policy
                    </Button>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="eula"
                  checked={acceptedEULA}
                  onCheckedChange={(checked) => setAcceptedEULA(checked === true)}
                />
                <div className="space-y-1">
                  <label htmlFor="eula" className="text-sm font-medium cursor-pointer">
                    I agree to the End User License Agreement (EULA)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This agreement governs your use of the StagAlgo desktop software.
                    <Button variant="link" className="p-0 h-auto text-xs ml-1">
                      Read EULA
                    </Button>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 p-4 rounded-lg border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-warning" />
                <h4 className="font-semibold text-warning">Trading Risk Disclosure</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Trading involves substantial risk of loss and is not suitable for all investors. 
                Past performance is not indicative of future results. Please ensure you understand 
                the risks before trading with real money.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              <Button 
                onClick={nextStep}
                disabled={!acceptedTerms || !acceptedPrivacy || !acceptedEULA}
              >
                Continue to Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-6 h-6 text-primary" />
              Download StagAlgo
            </CardTitle>
            <CardDescription>
              Choose your platform and download the desktop application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Windows Download */}
              <div className="p-6 rounded-lg border border-muted hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Monitor className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Windows</h3>
                    <p className="text-sm text-muted-foreground">Windows 10/11 (64-bit)</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">System Requirements:</p>
                    <ul className="text-muted-foreground space-y-1 mt-1">
                      <li>• Windows 10 or later</li>
                      <li>• 4GB RAM minimum</li>
                      <li>• 500MB free disk space</li>
                      <li>• Internet connection</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={() => handleDownload('windows')}
                    disabled={isDownloading}
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Preparing Download...' : 'Download for Windows'}
                  </Button>
                  
                  <Badge variant="outline" className="text-xs">
                    Version 1.0.0 • 45.2 MB
                  </Badge>
                </div>
              </div>

              {/* macOS Download */}
              <div className="p-6 rounded-lg border border-muted hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Apple className="w-8 h-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">macOS</h3>
                    <p className="text-sm text-muted-foreground">macOS 11.0 or later</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">System Requirements:</p>
                    <ul className="text-muted-foreground space-y-1 mt-1">
                      <li>• macOS 11.0 (Big Sur) or later</li>
                      <li>• 4GB RAM minimum</li>
                      <li>• 500MB free disk space</li>
                      <li>• Internet connection</li>
                    </ul>
                  </div>
                  
                  <Button 
                    onClick={() => handleDownload('mac')}
                    disabled={isDownloading}
                    className="w-full gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloading ? 'Preparing Download...' : 'Download for macOS'}
                  </Button>
                  
                  <Badge variant="outline" className="text-xs">
                    Version 1.0.0 • 52.1 MB
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-muted/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Installation Instructions:</h4>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Download the installer for your operating system</li>
                <li>Run the installer and follow the setup wizard</li>
                <li>Launch StagAlgo from your desktop or applications folder</li>
                <li>Sign in with your account credentials</li>
                <li>Complete the initial setup and start trading!</li>
              </ol>
            </div>

            {downloadComplete && (
              <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  <h4 className="font-semibold text-accent">Download Complete!</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your download should start automatically. If not, check your downloads folder. 
                  Run the installer to complete the setup process.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
              {downloadComplete && (
                <Button onClick={() => window.close()}>
                  Finish
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}