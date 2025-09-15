import React, { createContext, useReducer, useContext, ReactNode, FC, useCallback, useEffect, useRef } from 'react';
import { AuthSession, User } from '../domain/user';
import { authService } from '../infrastructure/auth-service';
import { AppLoader } from '../../../shared/ui/app-loader';
import {
    AUTH_POPUP_MONITOR_INTERVAL_MS, AUTH_SUCCESS_MESSAGE_TYPE, AUTH_ERROR_MESSAGE_TYPE, ApiUserPath,
    ErrorPopupBlocked, ErrorAuthPopupFailed, ErrorLoginCancelled, ErrorUseAuthOutsideProvider
} from '../../../../shared/config';
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User } }
  | { type: 'LOGIN_ERROR'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_CHECK_COMPLETE' };
interface AuthState extends AuthSession {
  isLoading: boolean;
  isSessionLoading: boolean;
  error: string | null;
}
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  isSessionLoading: true,
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
      return { ...initialState, isSessionLoading: false };
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
  const isLoadingRef = useRef(state.isLoading);
  useEffect(() => {
    isLoadingRef.current = state.isLoading;
  }, [state.isLoading]);
  useEffect(() => {
    const checkSession = async () => {
        try {
            const response = await fetch(ApiUserPath);
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
    // checkSession();
  }, []);
  const login = useCallback(() => {
    dispatch({ type: 'LOGIN_START' });
    const popup = authService.loginWithGitHub();
    if (!popup) {
      dispatch({ type: 'LOGIN_ERROR', payload: { error: ErrorPopupBlocked } });
      return;
    }
    let timer: number;
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const { type, user, error } = event.data;
      if (type === AUTH_SUCCESS_MESSAGE_TYPE && user) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
      } else if (type === AUTH_ERROR_MESSAGE_TYPE) {
        dispatch({ type: 'LOGIN_ERROR', payload: { error: error || ErrorAuthPopupFailed } });
      }
      clearInterval(timer);
      window.removeEventListener('message', handleAuthMessage);
    };
    window.addEventListener('message', handleAuthMessage);
    timer = window.setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', handleAuthMessage);
        if (isLoadingRef.current) {
          dispatch({ type: 'LOGIN_ERROR', payload: { error: ErrorLoginCancelled }});
        }
      }
    }, AUTH_POPUP_MONITOR_INTERVAL_MS);
  }, [dispatch]);
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
    } finally {
      dispatch({ type: 'LOGOUT' });
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
    throw new Error(ErrorUseAuthOutsideProvider);
  }
  return context;
};
