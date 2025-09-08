/**
 * @file api/auth/logout.ts
 * @version 0.1.0
 * @description A serverless function to clear the user's session cookie.
 *
 * @module API.Auth
 *
 * @summary This serverless function handles user logout. Its sole responsibility is to return a `Set-Cookie` header that overwrites the existing session cookie with an empty value and an expiration date in the past, effectively instructing the browser to delete it.
 *
 * @dependencies
 * - ../_constants
 *
 * @outputs
 * - Exports the serverless function handler.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import { SESSION_COOKIE_NAME, EXPIRED_COOKIE_DATE } from '../_constants';

export default async function handler() {
  // The key is to set the same cookie with an expiration date in the past.
  const cookie = `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; Path=/; SameSite=Lax; Expires=${EXPIRED_COOKIE_DATE}`;

  return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie,
      },
    });
}