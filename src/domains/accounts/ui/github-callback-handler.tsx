import React, { FC, useEffect } from 'react';
import {
    AUTH_SUCCESS_MESSAGE_TYPE, AUTH_ERROR_MESSAGE_TYPE, ApiAuthGithubPath, HttpMethodPost,
    HttpHeaderContentType, JsonResponseMimeType, ErrorFailedToAuthenticate, ErrorUnknown, ErrorNoCodeFromGitHub
} from '../../../../shared/config';
export const GitHubCallbackHandler: FC = () => {
  useEffect(() => {
    const handleAuthentication = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (window.opener) {
        if (code) {
          try {
            const response = await fetch(ApiAuthGithubPath, {
              method: HttpMethodPost,
              headers: { [HttpHeaderContentType]: JsonResponseMimeType },
              body: JSON.stringify({ code }),
            });
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || ErrorFailedToAuthenticate);
            }
            window.opener.postMessage({ type: AUTH_SUCCESS_MESSAGE_TYPE, user: data }, window.location.origin);
          } catch (error) {
            const message = error instanceof Error ? error.message : ErrorUnknown;
            window.opener.postMessage({ type: AUTH_ERROR_MESSAGE_TYPE, error: message }, window.location.origin);
          }
        } else {
          const error = params.get('error_description') || ErrorNoCodeFromGitHub;
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
