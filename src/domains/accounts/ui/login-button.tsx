import React, { FC } from 'react';
import { useAuth } from '../application/auth-context';
import { LogIn, LogOut } from 'lucide-react';
import { ICON_SIZE_XS, TitleClickToLogout, LabelLoggingIn, LabelLoginWithGitHub } from '../../../../shared/config';
import { isGitHubAuthAvailable } from '../infrastructure/auth-service';

export const LoginButton: FC = () => {
  const { state, login, logout } = useAuth();
  const { isAuthenticated, user, isLoading } = state;

  if (isAuthenticated && user) {
    return (
      <button className="btn btn-xs btn-secondary" onClick={logout} title={TitleClickToLogout}>
        <img src={user.avatarUrl} alt={`${user.name}'s avatar`} className="user-avatar" />
        <span className="user-name">{user.name}</span>
        <LogOut size={ICON_SIZE_XS} />
      </button>
    );
  }

  return (
    <button
      className="btn btn-xs btn-secondary"
      onClick={login}
      disabled={isLoading || !isGitHubAuthAvailable}
      title={!isGitHubAuthAvailable ? 'GitHub login is not configured' : ''}
    >
      <LogIn size={ICON_SIZE_XS} />
      <span>{isLoading ? LabelLoggingIn : LabelLoginWithGitHub}</span>
    </button>
  );
};
