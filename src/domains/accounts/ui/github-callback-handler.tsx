/**
 * @file src/domains/accounts/ui/github-callback-handler.tsx
 * @version 0.1.0
 * @description A component to handle the OAuth callback from GitHub, communicate with the parent window, and close itself.
 *
 * @module Accounts.UI
 *
 * @summary This component is rendered on the `/auth/callback` route, which is where GitHub redirects after a successful (or failed) login attempt. It extracts the authorization code from the URL, sends it to the backend API, and then uses `window.postMessage` to send the authentication result (user data or error) back to the main application window that opened it.
 *
 * @dependencies
 * - react
 * - ../../../../shared/config
 *
 * @outputs
 * - Exports the `GitHubCallbackHandler` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC, useEffect } from 'react';
import { AUTH_SUCCESS_MESSAGE_TYPE, AUTH_ERROR_MESSAGE_TYPE } from '../../../../shared/config';

export const GitHubCallbackHandler: FC = () => {
  useEffect(() => {
    const handleAuthentication = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (window.opener) {
        if (code) {
          try {
            const response = await fetch('/api/auth/github', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || 'Failed to authenticate.');
            }
            
            window.opener.postMessage({ type: AUTH_SUCCESS_MESSAGE_TYPE, user: data }, window.location.origin);

          } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            window.opener.postMessage({ type: AUTH_ERROR_MESSAGE_TYPE, error: message }, window.location.origin);
          }
        } else {
          const error = params.get('error_description') || "Authentication failed: No code received from GitHub.";
          window.opener.postMessage({ type: AUTH_ERROR_MESSAGE_TYPE, error }, window.location.origin);
        }
        window.close();
      }
    };

    handleAuthentication();
  }, []);

  return (
    <div className="full-page-centered">
      <h2>Authenticating...</h2>
      <p>Please wait while we securely log you in. This window will close automatically.</p>
    </div>
  );
};