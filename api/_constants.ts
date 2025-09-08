/**
 * @file api/_constants.ts
 * @version 0.1.0
 * @description Shared constants for the backend serverless functions.
 *
 * @summary This module centralizes magic values for backend operations, improving maintainability and consistency.
 */

// === JWT & Session ===
export const JWT_EXPIRATION_TIME = '30d';
export const JWT_MAX_AGE_SECONDS = 2592000; // 30 days
export const SESSION_COOKIE_NAME = 'session';
export const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:00 GMT';
