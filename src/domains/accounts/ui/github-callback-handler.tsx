import React, { FC, useEffect } from 'react';
import { useAuth } from '../application/auth-context';

export const GitHubCallbackHandler: FC = () => {
  const { dispatch } = useAuth();

  useEffect(() => {
    const handleAuthentication = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        try {
          dispatch({ type: 'LOGIN_START' });
          
          const response = await fetch('/api/auth/github', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to authenticate.');
          }
          
          // On success, update the global state with the user data from our server
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user: data } });
          
          // Redirect to the home page
          window.location.assign('/');

        } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          dispatch({ type: 'LOGIN_ERROR', payload: { error: message } });
        }
      } else {
        const error = params.get('error_description') || "Authentication failed: No code received from GitHub.";
        dispatch({ type: 'LOGIN_ERROR', payload: { error }});
      }
    };

    handleAuthentication();
  }, [dispatch]);

  return (
    <div className="full-page-centered">
      <h2>Authenticating...</h2>
      <p>Please wait while we securely log you in.</p>
    </div>
  );
};
