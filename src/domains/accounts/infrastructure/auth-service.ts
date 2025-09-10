import { AUTH_CALLBACK_PATH, GITHUB_LOGIN_POPUP_HEIGHT, GITHUB_LOGIN_POPUP_NAME, GITHUB_LOGIN_POPUP_WIDTH, GITHUB_OAUTH_SCOPE } from '../../../../shared/config';
const GITHUB_CLIENT_ID = 'iv1.a2b3c4d5e6f7a8b9c0d1';
const REDIRECT_URI = window.location.origin + AUTH_CALLBACK_PATH;
const loginWithGitHub = (): Window | null => {
  if (String(GITHUB_CLIENT_ID) === 'iv1.a2b3c4d5e6f7a8b9c0d1' || !GITHUB_CLIENT_ID) {
    const errorMessage = "Configuration Error: The GitHub Client ID has not been set up. Authentication is disabled. Please see the console (F12) for details.";
    console.error("GitHub Client ID is not configured. Please replace the placeholder in `src/domains/accounts/infrastructure/auth-service.ts` or follow the `GUIDE.md` to set up a proper build process.");
    alert(errorMessage);
    return null;
  }
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${GITHUB_OAUTH_SCOPE}`;
  const width = GITHUB_LOGIN_POPUP_WIDTH;
  const height = GITHUB_LOGIN_POPUP_HEIGHT;
  const left = (window.innerWidth / 2) - (width / 2);
  const top = (window.innerHeight / 2) - (height / 2);
  return window.open(authUrl, GITHUB_LOGIN_POPUP_NAME, `width=${width},height=${height},top=${top},left=${left}`);
};
const logout = async (): Promise<void> => {
  await fetch('/api/auth/logout', { method: 'POST' });
};
export const authService = {
  loginWithGitHub,
  logout,
};
