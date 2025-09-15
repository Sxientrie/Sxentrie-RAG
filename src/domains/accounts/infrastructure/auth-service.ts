import {
    AUTH_CALLBACK_PATH, GITHUB_LOGIN_POPUP_HEIGHT, GITHUB_LOGIN_POPUP_NAME, GITHUB_LOGIN_POPUP_WIDTH, GITHUB_OAUTH_SCOPE,
    GitHubAuthUrl, ApiLogoutPath,
    GitHubLoginPopupFeaturesTemplate, HttpMethodPost
} from '../../../../shared/config';

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
export const isGitHubAuthAvailable = !!GITHUB_CLIENT_ID;

const REDIRECT_URI = window.location.origin + AUTH_CALLBACK_PATH;

const loginWithGitHub = (): Window | null => {
  if (!isGitHubAuthAvailable) {
    console.warn('GitHub login is disabled: VITE_GITHUB_CLIENT_ID is not configured.');
    return null;
  }
  const authUrl = `${GitHubAuthUrl}?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${GITHUB_OAUTH_SCOPE}`;
  const width = GITHUB_LOGIN_POPUP_WIDTH;
  const height = GITHUB_LOGIN_POPUP_HEIGHT;
  const left = (window.innerWidth / 2) - (width / 2);
  const top = (window.innerHeight / 2) - (height / 2);
  const features = GitHubLoginPopupFeaturesTemplate
    .replace('{0}', String(width))
    .replace('{1}', String(height))
    .replace('{2}', String(top))
    .replace('{3}', String(left));
  return window.open(authUrl, GITHUB_LOGIN_POPUP_NAME, features);
};
const logout = async (): Promise<void> => {
  await fetch(ApiLogoutPath, { method: HttpMethodPost });
};
export const authService = {
  loginWithGitHub,
  logout,
};
