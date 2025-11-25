import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { useNavigate } from 'react-router-dom';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, signUp, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await useAuthStore.getState().login({ email, password });
      
      if (error) {
        // Handle specific error cases
        if (error.message === 'Email not confirmed') {
          toast({
            title: "Email Not Confirmed",
            description: "Please check your email and click the confirmation link, or sign up again to resend.",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message === 'Invalid login credentials') {
          toast({
            title: "Account Not Found",
            description: "This account doesn't exist. Please sign up or use the demo account.",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }
      
      if (!data) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await signUp(email, password);
      if (success) {
        toast({
          title: "Account Created Successfully",
          description: "Please check your email (including spam folder) for a verification link. Click the link to activate your account.",
        });
        // Clear form after successful signup
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        toast({
          title: "Sign Up Failed",
          description: "Unable to create account. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      
      // Handle specific error cases
      if (errorMessage.includes('User already registered')) {
        toast({
          title: "Account Already Exists",
          description: "This email is already registered. Try signing in instead, or use the forgot password option.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('Invalid email')) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign Up Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/lovable-uploads/baf7293f-10f5-46a9-b201-e541075bca9e.png" 
              alt="StagAlgo Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            StagAlgo
          </h1>
          <p className="text-muted-foreground mt-2">
            Advanced Trading Intelligence Platform
          </p>
        </div>

        <Card className="bg-gradient-card shadow-elevated border-primary/20">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 shadow-gold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  {/* Test Account Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => {
                        setEmail('demo@example.com');
                        setPassword('demo123');
                      }}
                      disabled={isLoading}
                    >
                      Demo Account
                     </Button>
                     <Button 
                       type="button"
                       variant="outline"
                       className="w-full text-xs"
                       onClick={() => {
                         setEmail('alrod28930@gmail.com');
                         setPassword('testing123');
                       }}
                       disabled={isLoading}
                     >
                       Elite Test Account
                     </Button>
                   </div>
                  
                  <div className="text-center space-y-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-primary hover:text-primary/80 text-sm"
                    >
                      Forgot your password?
                    </Button>
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open('/download', '_blank')}
                        className="text-xs px-3 py-1 h-8"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download Desktop App
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/50"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 shadow-gold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>© 2024 StagAlgo. Advanced Trading Intelligence.</p>
        </div>
      </div>
      
      <ForgotPasswordModal 
        isOpen={showForgotPassword} 
        onClose={() => setShowForgotPassword(false)} 
      />
    </div>
  );
}