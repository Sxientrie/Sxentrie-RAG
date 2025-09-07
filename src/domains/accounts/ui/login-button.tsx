import React, { FC } from 'react';
import { useAuth } from '../application/auth-context';
import { LogIn, LogOut } from 'lucide-react';

export const LoginButton: FC = () => {
  const { state, login, logout } = useAuth();
  const { isAuthenticated, user, isLoading } = state;

  if (isAuthenticated && user) {
    return (
      <button className="btn btn-xs btn-outline" onClick={logout} title="Click to Logout">
        <img src={user.avatarUrl} alt={`${user.name}'s avatar`} className="user-avatar" />
        <span className="user-name">{user.name}</span>
        <LogOut size={12} />
      </button>
    );
  }

  return (
    <button className="btn btn-xs btn-outline" onClick={login} disabled={isLoading}>
      <LogIn size={12} />
      <span>{isLoading ? 'Logging in...' : 'Login with GitHub'}</span>
    </button>
  );
};