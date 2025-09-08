/**
 * @file shared/errors/api-key-error.ts
 * @version 0.1.0
 * @description A custom error class for handling missing API key errors.
 *
 * @module Core.Errors
 *
 * @summary This file defines a custom `ApiKeyError` class that extends the native `Error` class. This allows for specific handling of missing API key errors, enabling the UI to react differently, for instance by opening the settings panel automatically.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports the `ApiKeyError` class.
 *
 * @changelog
 * - v0.1.0 (2025-09-12): File created and documented.
 */
export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}