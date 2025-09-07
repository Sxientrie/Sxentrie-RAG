// In a real application, these would be stored in environment variables.
// Using a placeholder for now. The developer will need to replace this.
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';

// This should match the "Authorization callback URL" in your GitHub OAuth App settings.
const REDIRECT_URI = window.location.origin + '/auth/callback';

/**
 * Redirects the user to the GitHub authorization page to start the OAuth flow.
 */
const loginWithGitHub = (): void => {
  const scope = 'read:user user:email';
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}`;
  
  const width = 600, height = 700;
  const left = (window.innerWidth / 2) - (width / 2);
  const top = (window.innerHeight / 2) - (height / 2);
  window.open(authUrl, 'github-login', `width=${width},height=${height},top=${top},left=${left}`);
};

/**
 * In the future, this would call our backend to invalidate the session cookie.
 */
const logout = async (): Promise<void> => {
  // For now, this will be handled client-side in the AuthContext.
  return Promise.resolve();
};

export const authService = {
  loginWithGitHub,
  logout,
};
