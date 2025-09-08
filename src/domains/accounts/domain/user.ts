/**
 * @file src/domains/accounts/domain/user.ts
 * @version 0.1.0
 * @description Defines TypeScript interfaces for the user and authentication session domain model.
 *
 * @module Accounts.Domain
 *
 * @summary This file contains the core data structures for user authentication. It defines the shape of a `User` profile object and the `AuthSession`, which represents the overall authentication state of the application.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports `User` and `AuthSession` interfaces.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: User | null;
}