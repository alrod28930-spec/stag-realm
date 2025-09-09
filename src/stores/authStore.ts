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
        try {
          // Check for special test users in persisted state first
          const currentState = get();
          if (currentState.user?.email === 'demo@example.com' || 
              currentState.user?.email === 'john.trader@stagalgo.com' ||
              currentState.user?.id === '00000000-0000-0000-0000-000000000000' ||
              currentState.user?.id === '00000000-0000-0000-0000-000000000002') {
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

          // Get initial session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
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
            set({ isLoading: false });
          }

          // Listen for auth changes - set up only once with proper user handling
          supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              // Ensure profile exists and fetch it
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
                avatar: profile?.avatar_url,
                isActive: true,
                createdAt: new Date(session.user.created_at),
                lastLogin: new Date()
              };

              set({
                user,
                isAuthenticated: true,
                isLoading: false
              });
              
              eventBus.emit('user-login' as any, { email: user.email, timestamp: new Date() });
            } else if (event === 'SIGNED_OUT') {
              set({
                user: null,
                organization: null,
                isAuthenticated: false,
                isLoading: false
              });
              
              eventBus.emit('user-logout' as any, { timestamp: new Date() });
            }
          });
        } catch (error) {
          logger.error('Auth initialization failed', { error });
          set({ isLoading: false });
        }
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        
        try {
          // Handle special test accounts
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

          // Handle owner account specially
          if (credentials.email === 'john.trader@stagalgo.com' && credentials.password === 'owner123') {
            const ownerUser: User = {
              id: '00000000-0000-0000-0000-000000000002',
              email: 'john.trader@stagalgo.com',
              name: 'John Trader',
              role: 'Owner',
              organizationId: '00000000-0000-0000-0000-000000000001',
              avatar: undefined,
              isActive: true,
              createdAt: new Date(),
              lastLogin: new Date()
            };

            set({
              user: ownerUser,
              isAuthenticated: true,
              isLoading: false
            });
            
            // Initialize demo mode for owner account too
            const { initializeDemoMode } = await import('@/utils/demoMode');
            initializeDemoMode();
            
            eventBus.emit('user-login' as any, { email: ownerUser.email, timestamp: new Date() });
            return { data: { user: ownerUser }, error: null };
          }

          // Regular authentication for non-demo accounts
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          });

          if (error) {
            // Handle email not confirmed error
            if (error.message === 'Email not confirmed') {
              // Auto-resend confirmation for better UX
              await supabase.auth.resend({
                type: 'signup',
                email: credentials.email,
                options: {
                  emailRedirectTo: `${window.location.origin}/auth/verify`
                }
              });
              
              return { 
                error: { 
                  ...error, 
                  message: 'Please check your email and click the confirmation link. We\'ve sent a new one just in case.' 
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
        const { user } = get();
        
        try {
          // Handle special test account logout  
          if (user?.email === 'demo@example.com' || user?.email === 'john.trader@stagalgo.com') {
            set({
              user: null,
              organization: null,
              isAuthenticated: false,
              isLoading: false
            });
            eventBus.emit('user-logout' as any, { timestamp: new Date() });
            return;
          }

          await supabase.auth.signOut();
          
          logger.info('User logged out', { userId: user?.id });
        } catch (error) {
          logger.error('Logout failed', { error });
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