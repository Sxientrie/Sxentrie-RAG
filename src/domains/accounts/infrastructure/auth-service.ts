const GITHUB_CLIENT_ID = process.env.VITE_GITHUB_CLIENT_ID;
const REDIRECT_URI = window.location.origin + '/auth/callback';

const loginWithGitHub = (): Window | null => {
  if (!GITHUB_CLIENT_ID) {
    console.error("VITE_GITHUB_CLIENT_ID is not set. Authentication cannot proceed. Please see GUIDE.md.");
    return null;
  }
  const scope = 'read:user user:email';
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}`;

  const width = 600, height = 700;
  const left = (window.innerWidth / 2) - (width / 2);
  const top = (window.innerHeight / 2) - (height / 2);
  return window.open(authUrl, 'github-login', `width=${width},height=${height},top=${top},left=${left}`);
};

const logout = async (): Promise<void> => {
  return Promise.resolve();
};

export const authService = {
  loginWithGitHub,
  logout,
};
