/**
 * @file src/domains/accounts/ui/login-button.tsx
 * @version 0.1.0
 * @description The UI component for the "Login with GitHub" button and the authenticated user display.
 *
 * @module Accounts.UI
 *
 * @summary This component conditionally renders either a "Login with GitHub" button or, if the user is authenticated, a display showing their avatar and name with a logout button. It consumes the `AuthContext` to get the current authentication state and trigger login/logout actions.
 *
 * @dependencies
 * - react
 * - ../application/auth-context
 * - lucide-react
 *
 * @outputs
 * - Exports the `LoginButton` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
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