import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User, Organization, LoginCredentials } from '@/types/auth';
import { createLogger } from '@/services/logging';
import { eventBus } from '@/services/eventBus';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

const logger = createLogger('AuthStore');

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  hasPermission: (action: string) => boolean;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isLoading: true,
      isAuthenticated: false,

      initializeAuth: async () => {
        console.log('🚀 Starting auth initialization');
        try {
          // Check for THE SINGLE demo user in persisted state first
          const currentState = get();
          if (currentState.user?.email === 'demo@example.com' && 
              currentState.user?.id === '00000000-0000-0000-0000-000000000000') {
            set({
              user: currentState.user,
              isAuthenticated: true,
              isLoading: false
            });
            
            // Initialize demo mode
            const { initializeDemoMode } = await import('@/utils/demoMode');
            initializeDemoMode();
            return;
          }

          // Listen for auth changes - set up FIRST to avoid missed events
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state change event:', event, { hasSession: !!session, userId: session?.user?.id });

            if (event === 'SIGNED_IN' && session?.user) {
              // Minimal synchronous state update
              const minimalUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email || '',
                role: 'Member',
                organizationId: '00000000-0000-0000-0000-000000000001',
                avatar: undefined,
                isActive: true,
                createdAt: new Date(session.user.created_at),
                lastLogin: new Date()
              };

              set({ user: minimalUser, isAuthenticated: true, isLoading: false });
              eventBus.emit('user-login' as any, { email: minimalUser.email, timestamp: new Date() });

              // Use proper async pattern instead of setTimeout
              const fetchProfile = async () => {
                try {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user!.id)
                    .maybeSingle();

                  if (profile) {
                    set((current) => ({
                      user: current.user ? { ...current.user, name: profile.display_name || current.user.name, avatar: profile.avatar_url } : current.user
                    }));
                  }
                } catch (e) {
                  console.warn('Profile fetch failed:', e);
                }
              };
              
              // Use microtask instead of setTimeout for better timing
              Promise.resolve().then(fetchProfile);

              console.log('✅ User signed in successfully:', minimalUser.email);
            } else if (event === 'SIGNED_OUT') {
              console.log('🚪 Processing SIGNED_OUT event');
              set({ user: null, organization: null, isAuthenticated: false, isLoading: false });
              eventBus.emit('user-logout' as any, { timestamp: new Date() });
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('🔄 Token refreshed');
            }
          });

          // Optionally store subscription ref if needed
          (window as any).__supabaseAuthSub = subscription;

          // THEN get initial session after listener is attached
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Only proceed if user is confirmed or is a demo user
            const isDemo = session.user.email === 'demo@example.com';
            const isConfirmed = session.user.email_confirmed_at || isDemo;
            
            if (isConfirmed) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              const user: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: profile?.display_name || session.user.email || '',
                role: 'Member',
                organizationId: '00000000-0000-0000-0000-000000000001',
                avatar: undefined,
                isActive: true,
                createdAt: new Date(session.user.created_at),
                lastLogin: new Date()
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false
              });
            } else {
              console.log('User session exists but email not confirmed');
              set({ isLoading: false, isAuthenticated: false, user: null });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          logger.error('Auth initialization failed', { error });
          set({ isLoading: false });
        }
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        
        try {
          // Handle demo account for testing
          if (credentials.email === 'demo@example.com' && credentials.password === 'demo123') {
            const demoUser: User = {
              id: '00000000-0000-0000-0000-000000000000',
              email: 'demo@example.com',
              name: 'Demo User',
              role: 'Member',
              organizationId: '00000000-0000-0000-0000-000000000001',
              avatar: undefined,
              isActive: true,
              createdAt: new Date(),
              lastLogin: new Date()
            };

            set({
              user: demoUser,
              isAuthenticated: true,
              isLoading: false
            });
            
            // Initialize demo mode
            const { initializeDemoMode } = await import('@/utils/demoMode');
            initializeDemoMode();
            
            eventBus.emit('user-login' as any, { email: demoUser.email, timestamp: new Date() });
            return { data: { user: demoUser }, error: null };
          }

          // Regular authentication for non-demo accounts
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          });

          if (error) {
            // Handle email not confirmed error
            if (error.message === 'Email not confirmed') {
              return { 
                error: { 
                  ...error, 
                  message: 'Your account exists but your email isn\'t confirmed yet. Please check your email (including spam folder) and click the confirmation link. If you can\'t find it, wait 60 seconds and try signing in again to get a new confirmation email.' 
                }, 
                data: null 
              };
            }
            
            return { error, data: null };
          }

          if (data.user) {
            // Ensure profile exists
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                display_name: data.user.email || 'User'
              }, {
                onConflict: 'id'
              });

            if (profileError) {
              console.warn('Profile creation failed:', profileError);
            }
            
            return { data, error: null };
          }
          
          return { data: null, error: new Error('Login failed') };
        } catch (error) {
          set({ isLoading: false });
          return { 
            error: error instanceof Error ? error : new Error('Login failed'), 
            data: null 
          };
        }
      },

      signUp: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          console.log('Starting signup process for:', email);
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/verify`
            }
          });

          console.log('Signup response:', { data: data ? 'received' : 'null', error: error?.message });

          if (error) {
            console.error('Signup error:', error);
            throw error;
          }

          if (data.user) {
            console.log('User created, confirmation required:', !data.session);
            logger.info('User signed up successfully', { 
              userId: data.user.id,
              email,
              needsConfirmation: !data.session
            });
            
            // Store email for verification page
            localStorage.setItem('last_signin_email', email);
            
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Signup failed:', error);
          logger.error('Sign up failed', { 
            email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          set({ isLoading: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        console.log('🚪 Logout initiated');
        const { user } = get();
        console.log('🔍 Current user during logout:', { email: user?.email, id: user?.id });
        
        try {
          // Handle special demo account logout  
          if (user?.email === 'demo@example.com') {
            console.log('🎭 Logging out demo user');
            set({
              user: null,
              organization: null,
              isAuthenticated: false,
              isLoading: false
            });
            eventBus.emit('user-logout' as any, { timestamp: new Date() });
            console.log('✅ Demo user logged out successfully');
            return;
          }

          console.log('🔐 Calling supabase.auth.signOut()');
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error('❌ Supabase signOut error:', error);
            throw error;
          }
          
          console.log('✅ Supabase signOut completed');
          
          // Force clear state if auth state change doesn't fire
          setTimeout(() => {
            const currentState = get();
            if (currentState.isAuthenticated) {
              console.log('⚠️ Forcing logout state clear');
              set({
                user: null,
                organization: null,
                isAuthenticated: false,
                isLoading: false
              });
              eventBus.emit('user-logout' as any, { timestamp: new Date() });
            }
          }, 1000);
          
          logger.info('User logged out', { userId: user?.id });
        } catch (error) {
          console.error('❌ Logout failed:', error);
          logger.error('Logout failed', { error });
          
          // Force logout even if there's an error
          set({
            user: null,
            organization: null,
            isAuthenticated: false,
            isLoading: false
          });
          eventBus.emit('user-logout' as any, { timestamp: new Date() });
        }
      },

      resetPassword: async (email: string) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
          });

          if (error) throw error;
          
          logger.info('Password reset email sent', { email });
          return true;
        } catch (error) {
          logger.error('Password reset failed', { email, error });
          return false;
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setOrganization: (organization: Organization | null) => {
        set({ organization });
      },

      hasPermission: (action: string) => {
        const { user } = get();
        if (!user) return false;

        // Simple role-based permissions
        const permissions = {
          Owner: ['*'],
          Admin: ['read', 'write', 'manage-users', 'manage-settings'],
          Member: ['read', 'write'],
          Viewer: ['read']
        };

        const userPermissions = permissions[user.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(action);
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Expose auth store to window for utility functions
if (typeof window !== 'undefined') {
  (window as any).__authStore = useAuthStore.getState();
  useAuthStore.subscribe((state) => {
    (window as any).__authStore = state;
  });
}