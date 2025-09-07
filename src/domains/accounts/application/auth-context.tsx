import React, { createContext, useReducer, useContext, ReactNode, FC, useCallback, useEffect } from 'react';
import { AuthSession, User } from '../domain/user';
import { authService } from '../infrastructure/auth-service';
import { AppLoader } from '../../../shared/ui/app-loader';

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User } }
  | { type: 'LOGIN_ERROR'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_CHECK_COMPLETE' };

interface AuthState extends AuthSession {
  isLoading: boolean;
  isSessionLoading: boolean; // New state to track initial load
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  isSessionLoading: true, // Start in a loading state
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { ...state, isLoading: false, isSessionLoading: false, isAuthenticated: true, user: action.payload.user };
    case 'LOGIN_ERROR':
      return { ...state, isLoading: false, isSessionLoading: false, error: action.payload.error };
    case 'LOGOUT':
      return { ...initialState, isSessionLoading: false }; // Ensure loading is false on logout
    case 'SESSION_CHECK_COMPLETE':
        return { ...state, isSessionLoading: false };
    default:
      return state;
  }
};

interface AuthContextType {
  state: AuthState;
  login: () => void;
  logout: () => Promise<void>;
  dispatch: React.Dispatch<AuthAction>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{children: ReactNode}> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  useEffect(() => {
    const checkSession = async () => {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const user = await response.json();
                dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
            } else {
                dispatch({ type: 'SESSION_CHECK_COMPLETE' });
            }
        } catch (error) {
            dispatch({ type: 'SESSION_CHECK_COMPLETE' });
        }
    };
    checkSession();
  }, []);

  const login = useCallback(() => {
    authService.loginWithGitHub(); // This will open the popup

    const handleAuthMessage = (event: MessageEvent) => {
      // IMPORTANT: Check the origin of the message for security
      if (event.origin !== window.location.origin) {
        return;
      }

      const { type, user, error } = event.data;

      if (type === 'auth-success' && user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
      } else if (type === 'auth-error') {
        dispatch({ type: 'LOGIN_ERROR', payload: { error: error || 'Authentication failed in popup.' } });
      }
      
      // Clean up the event listener once we have a result
      window.removeEventListener('message', handleAuthMessage);
    };

    window.addEventListener('message', handleAuthMessage);
  }, [dispatch]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      // Failed to clear session on server, but we will still log out on the client.
    } finally {
      // Always clear client-side state regardless of server outcome
      dispatch({ type: 'LOGOUT' });
      // Redirect to home to ensure a clean state
      window.location.assign('/');
    }
  }, []);

  if (state.isSessionLoading) {
    return <AppLoader />;
  }

  return (
    <AuthContext.Provider value={{ state, login, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
