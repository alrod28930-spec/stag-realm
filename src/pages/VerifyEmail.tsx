import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { supabase as recorderSupabase } from '@/integrations/supabase/client';

type VerifyType = 'magiclink' | 'signup' | 'recovery' | 'email_change';
type VerifyState = 'verifying' | 'success' | 'error';

interface VerifyResult {
  ok: boolean;
  kind?: 'code' | 'otp';
  type?: VerifyType;
  error?: string;
}

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [state, setState] = useState<VerifyState>('verifying');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Get last signed in email from localStorage
  useEffect(() => {
    const lastEmail = localStorage.getItem('last_signin_email');
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  const logRecorderEvent = async (eventType: string, payload: any) => {
    try {
      // Get current workspace ID from user settings or default
      const { data: { user } } = await supabase.auth.getUser();
      const workspaceId = 'default'; // You might want to get this from user settings
      
      await recorderSupabase.rpc('recorder_log', {
        p_workspace: workspaceId,
        p_event_type: eventType,
        p_severity: 1,
        p_entity_type: 'auth',
        p_entity_id: user?.id || 'anonymous',
        p_summary: `Email verification: ${eventType}`,
        p_payload: payload
      });
    } catch (error) {
      console.error('Failed to log recorder event:', error);
    }
  };

  const verifyFromUrl = async (): Promise<VerifyResult> => {
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as VerifyType;

    try {
      if (code) {
        // PKCE / OAuth-style verification
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        
        await logRecorderEvent('auth.email.verified', {
          kind: 'code',
          method: 'exchangeCodeForSession'
        });
        
        return { ok: true, kind: 'code' };
      } else if (token_hash && type) {
        // OTP-style verification (magic link, signup confirm, recovery, email change)
        const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) throw error;
        
        await logRecorderEvent('auth.email.verified', {
          kind: 'otp',
          type,
          method: 'verifyOtp'
        });
        
        return { ok: true, kind: 'otp', type };
      } else {
        throw new Error('Missing verification parameters');
      }
    } catch (err) {
      const error = err as Error;
      const sanitizedParams = {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type: type || 'unknown'
      };
      
      await logRecorderEvent('auth.email.verify_failed', {
        reason: error.message,
        query: sanitizedParams
      });
      
      return { ok: false, error: error.message };
    }
  };

  const getNextPath = (kind?: 'code' | 'otp', type?: VerifyType): string => {
    if (type === 'recovery') {
      return import.meta.env.VITE_REDIRECT_AFTER_RESET || '/reset/complete';
    }
    return import.meta.env.VITE_REDIRECT_AFTER_VERIFY || '/dashboard';
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to resend verification.",
        variant: "destructive"
      });
      return;
    }

    setIsResending(true);
    
    try {
      // Try to resend verification - this works for both existing and new users
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`
        }
      });

      if (error) throw error;

      await logRecorderEvent('auth.email.resend_requested', {
        emailMasked: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      });

      toast({
        title: "Verification email sent",
        description: `If an account exists for ${email}, we've sent a new verification link.`
      });
      
      // Store email for future use
      localStorage.setItem('last_signin_email', email);
      
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Failed to send email",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToSignIn = () => {
    navigate('/');
  };

  const openMailApp = () => {
    window.location.href = `mailto:${email}`;
  };

  // Perform verification on mount
  useEffect(() => {
    const performVerification = async () => {
      const result = await verifyFromUrl();
      setResult(result);
      
      if (result.ok) {
        setState('success');
        // Clear sensitive params from URL
        window.history.replaceState({}, '', '/auth/verify?ok=1');
      } else {
        setState('error');
        // Clear sensitive params from URL
        window.history.replaceState({}, '', '/auth/verify?error=1');
      }
    };

    performVerification();
  }, [searchParams]);

  // Handle countdown and redirect on success
  useEffect(() => {
    if (state === 'success' && result?.ok) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            const nextPath = getNextPath(result.kind, result.type);
            window.location.assign(nextPath);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [state, result]);

  const getErrorMessage = (error?: string) => {
    if (!error) return "The link may be expired or already used. You can request a new one below.";
    
    if (error.toLowerCase().includes('token') && (error.toLowerCase().includes('expired') || error.toLowerCase().includes('used'))) {
      return "This link looks expired or already used. Request a fresh link below.";
    }
    
    if (error.toLowerCase().includes('network') || error.toLowerCase().includes('connection')) {
      return "We couldn't reach the server. Please check your connection and try again.";
    }
    
    return "The link may be expired or already used. You can request a new one below.";
  };

  const renderContent = () => {
    switch (state) {
      case 'verifying':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <CardTitle className="text-xl">Verifying your email</CardTitle>
              <CardDescription>
                We're confirming your link and securing your session…
              </CardDescription>
            </CardHeader>
          </>
        );

      case 'success':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Email verified</CardTitle>
              <CardDescription>
                You're all set. Redirecting you to your dashboard in {countdown} seconds…
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => window.location.assign(getNextPath(result?.kind, result?.type))}
                className="w-full"
              >
                Continue to Dashboard
              </Button>
            </CardContent>
          </>
        );

      case 'error':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">We couldn't verify that link</CardTitle>
              <CardDescription>
                {getErrorMessage(result?.error)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="flex-1"
                >
                  {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resend verification email
                </Button>
                
                {email && (
                  <Button 
                    variant="outline" 
                    onClick={openMailApp}
                    className="flex-1 sm:flex-none"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Open mail app
                  </Button>
                )}
              </div>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/50 px-4">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-lg">
          {renderContent()}
          
          {state !== 'verifying' && (
            <CardContent className="pt-0">
              <Button 
                variant="ghost" 
                onClick={handleBackToSignIn}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;