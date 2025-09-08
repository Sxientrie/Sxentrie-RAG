/**
 * @file shared/errors/api-error.ts
 * @version 0.1.0
 * @description A custom error class for handling API-specific errors.
 *
 * @module Core.Errors
 *
 * @summary This file defines a custom `ApiError` class that extends the native `Error` class. This allows for more specific error handling in `try/catch` blocks, making it possible to distinguish between network/API errors and other types of runtime errors.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports the `ApiError` class.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}