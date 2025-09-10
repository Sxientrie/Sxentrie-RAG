import {
    AUTH_CALLBACK_PATH, GITHUB_LOGIN_POPUP_HEIGHT, GITHUB_LOGIN_POPUP_NAME, GITHUB_LOGIN_POPUP_WIDTH, GITHUB_OAUTH_SCOPE,
    GitHubClientIdPlaceholder, ErrorGitHubClientIdNotSet, DevErrorGitHubClientIdNotSet, GitHubAuthUrl, ApiLogoutPath
} from '../../../../shared/config';
const GITHUB_CLIENT_ID = GitHubClientIdPlaceholder;
const REDIRECT_URI = window.location.origin + AUTH_CALLBACK_PATH;
const loginWithGitHub = (): Window | null => {
  if (String(GITHUB_CLIENT_ID) === GitHubClientIdPlaceholder || !GITHUB_CLIENT_ID) {
    console.error(DevErrorGitHubClientIdNotSet);
    alert(ErrorGitHubClientIdNotSet);
    return null;
  }
  const authUrl = `${GitHubAuthUrl}?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${GITHUB_OAUTH_SCOPE}`;
  const width = GITHUB_LOGIN_POPUP_WIDTH;
  const height = GITHUB_LOGIN_POPUP_HEIGHT;
  const left = (window.innerWidth / 2) - (width / 2);
  const top = (window.innerHeight / 2) - (height / 2);
  return window.open(authUrl, GITHUB_LOGIN_POPUP_NAME, `width=${width},height=${height},top=${top},left=${left}`);
};
const logout = async (): Promise<void> => {
  await fetch(ApiLogoutPath, { method: 'POST' });
};
export const authService = {
  loginWithGitHub,
  logout,
};
