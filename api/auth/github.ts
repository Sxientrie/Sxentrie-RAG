/**
 * @file api/auth/github.ts
 * @version 0.1.0
 * @description A serverless function to handle the GitHub OAuth callback, exchange the code for a token, and create a session.
 *
 * @module API.Auth
 *
 * @summary This serverless function acts as the backend for the GitHub OAuth flow. It receives the temporary code from the client, securely exchanges it with GitHub for an access token, uses that token to fetch the user's profile, and finally creates a secure, HttpOnly JWT session cookie before returning the user profile to the client.
 *
 * @dependencies
 * - jose
 * - ../_constants
 *
 * @outputs
 * - Exports the serverless function handler.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import { SignJWT } from 'jose';
import { JWT_EXPIRATION_TIME, JWT_MAX_AGE_SECONDS, SESSION_COOKIE_NAME } from '../_constants';
import { HTTP_STATUS_OK, HTTP_STATUS_BAD_REQUEST, HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../shared/config';

// This interface is a simple stand-in for a full serverless platform's Request object.
interface ServerlessRequest {
  json: () => Promise<{ code: string }>;
}

// Type definition for GitHub's token exchange response
interface GitHubTokenResponse {
  access_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

// Type definition for GitHub's user profile response
interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export default async function handler(request: ServerlessRequest) {
  const { code } = await request.json();

  if (!code) {
    return new Response(JSON.stringify({ error: 'No code provided.' }), { status: HTTP_STATUS_BAD_REQUEST });
  }

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return new Response(JSON.stringify({ error: 'JWT_SECRET environment variable is not set.' }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }

  try {
    // Step 1: Exchange the code for an access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData: GitHubTokenResponse = await tokenResponse.json();
    if (tokenData.error) {
      throw new Error(tokenData.error_description);
    }
    const accessToken = tokenData.access_token;

    // Step 2: Use the access token to get the user's profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userData: GitHubUserResponse = await userResponse.json();

    const userProfile = {
      id: userData.id.toString(),
      name: userData.name || userData.login,
      email: userData.email,
      avatarUrl: userData.avatar_url,
    };

    // Step 3: Create a secure JWT
    const secret = new TextEncoder().encode(JWT_SECRET);
    const jwt = await new SignJWT(userProfile)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRATION_TIME)
      .sign(secret);

    const cookie = `${SESSION_COOKIE_NAME}=${jwt}; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=${JWT_MAX_AGE_SECONDS}`;

    // Step 4: Return the user profile and set the JWT cookie
    return new Response(JSON.stringify(userProfile), {
      status: HTTP_STATUS_OK,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed.';
    return new Response(JSON.stringify({ error: message }), { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
}