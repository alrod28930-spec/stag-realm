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
          // Get initial session
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const user: User = {
              id: session.user.id,
              email: session.user.email || '',
              name: profile?.display_name || session.user.email || '',
              role: 'Member',
              organizationId: 'default',
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

          // Listen for auth changes
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              const user: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.email || '',
                role: 'Member',
                organizationId: 'default',
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
          // Handle demo account specially
          if (credentials.email === 'demo@stagalgo.com') {
            // Create demo user if it doesn't exist
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: 'demo@stagalgo.com',
              password: 'demo123',
              options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: {
                  display_name: 'Demo User'
                }
              }
            });
            
            // If user already exists, try to sign in
            if (signUpError?.message?.includes('already registered')) {
              const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
              });
              
              if (error) {
                return { error, data: null };
              }
              
              logger.info('Demo user logged in successfully');
              return { data, error: null };
            }
            
            if (signUpError) {
              return { error: signUpError, data: null };
            }
            
            // For demo, we'll auto-confirm the email by signing them in
            const { data, error } = await supabase.auth.signInWithPassword({
              email: credentials.email,
              password: credentials.password
            });
            
            if (data.user) {
              logger.info('Demo user created and logged in');
              return { data, error: null };
            }
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
          });

          if (error) {
            logger.error('Login failed', { 
              email: credentials.email,
              error: error.message
            });
            return { error, data: null };
          }

          if (data.user) {
            // Create profile if it doesn't exist
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: data.user.id,
                display_name: data.user.email
              });

            if (profileError) {
              logger.warn('Profile creation failed', { error: profileError });
            }

            logger.info('User logged in successfully', { 
              userId: data.user.id,
              email: credentials.email 
            });
            
            return { data, error: null };
          }
          
          return { data: null, error: new Error('Login failed') };
        } catch (error) {
          logger.error('Login failed', { 
            email: credentials.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
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
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`
            }
          });

          if (error) throw error;

          if (data.user) {
            logger.info('User signed up successfully', { 
              userId: data.user.id,
              email 
            });
            
            return true;
          }
          
          return false;
        } catch (error) {
          logger.error('Sign up failed', { 
            email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        const { user } = get();
        
        try {
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