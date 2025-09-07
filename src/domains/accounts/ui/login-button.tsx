import React, { FC } from 'react';
import { useAuth } from '../application/auth-context';
import { LogIn, LogOut } from 'lucide-react';

export const LoginButton: FC = () => {
  const { state, login, logout } = useAuth();
  const { isAuthenticated, user, isLoading } = state;

  if (isAuthenticated && user) {
    return (
      <div className="user-info" onClick={logout} tabIndex={0} role="button" title="Click to Logout">
        <img src={user.avatarUrl} alt={`${user.name}'s avatar`} className="user-avatar" />
        <span className="user-name">{user.name}</span>
        <LogOut size={14} />
      </div>
    );
  }

  return (
    <button className="login-btn" onClick={login} disabled={isLoading}>
      <LogIn size={14} />
      <span>{isLoading ? 'Logging in...' : 'Login with GitHub'}</span>
    </button>
  );
};
