import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User, Organization, LoginCredentials } from '@/types/auth';
import { createLogger } from '@/services/logging';
import { eventBus } from '@/services/eventBus';

const logger = createLogger('AuthStore');

// Mock data for development
const mockUser: User = {
  id: '1',
  email: 'demo@stagalgo.com',
  name: 'John Trader',
  role: 'Owner',
  organizationId: 'org-1',
  avatar: undefined,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  lastLogin: new Date()
};

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'StagAlgo Demo',
  slug: 'stagalgo-demo',
  plan: 'Professional',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  memberCount: 5
};

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  hasPermission: (action: string) => boolean;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        
        try {
          // Mock authentication - replace with real Supabase auth
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (credentials.email === 'demo@stagalgo.com' && credentials.password === 'password') {
            set({
              user: mockUser,
              organization: mockOrganization,
              isAuthenticated: true,
              isLoading: false
            });
            
            logger.info('User logged in successfully', { 
              userId: mockUser.id,
              email: credentials.email 
            });
            
            eventBus.emit(EVENTS.USER_LOGIN, mockUser);
            return true;
          } else {
            throw new Error('Invalid credentials');
          }
        } catch (error) {
          logger.error('Login failed', { 
            email: credentials.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        const { user } = get();
        
        set({
          user: null,
          organization: null,
          isAuthenticated: false,
          isLoading: false
        });
        
        logger.info('User logged out', { userId: user?.id });
        eventBus.emit(EVENTS.USER_LOGOUT, user);
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