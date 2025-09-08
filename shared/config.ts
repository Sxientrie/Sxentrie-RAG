/**
 * @file shared/config.ts
 * @version 0.2.0
 * @description Defines application-wide constants and configuration values.
 *
 * @module Core.Config
 *
 * @summary This file centralizes magic numbers and configuration settings used across different parts of the application, such as file size limits, UI timings, and auth parameters. This improves maintainability by providing a single source of truth for these values.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports several configuration constants.
 *
 * @changelog
 * - v0.2.0 (2025-09-11): Added constants for UI, layout, auth, and file handling to eliminate magic values.
 * - v0.1.0 (2025-09-08): File created and documented.
 */
// === API & File Processing Limits ===
export const MAX_DISPLAY_FILE_SIZE = 500000;
export const MAX_GEMINI_FILE_SIZE = 20000;
export const MAX_GEMINI_FILE_COUNT = 15;
export const MAX_FILE_CACHE_SIZE = 50;

// === UI Timings (in milliseconds) ===
export const UI_DEBOUNCE_DELAY_MS = 100;
export const UI_COPY_SUCCESS_TIMEOUT_MS = 2000;
export const AUTH_POPUP_MONITOR_INTERVAL_MS = 500;

// === Layout ===
export const MIN_PANEL_WIDTH_PX = 250;
export const DEFAULT_PANEL_FLEX = [3, 4, 3];

// === Local Storage ===
export const SESSION_STORAGE_KEY = 'sxentrie-session';

// === Authentication ===
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const GITHUB_LOGIN_POPUP_WIDTH = 600;
export const GITHUB_LOGIN_POPUP_HEIGHT = 700;
export const GITHUB_LOGIN_POPUP_NAME = 'github-login';
export const GITHUB_OAUTH_SCOPE = 'read:user user:email';
export const AUTH_SUCCESS_MESSAGE_TYPE = 'auth-success';
export const AUTH_ERROR_MESSAGE_TYPE = 'auth-error';

// === File Handling ===
export const DEFAULT_DOWNLOAD_FILENAME = 'download';
export const TRUNCATED_DISPLAY_MESSAGE = "\n\n... (file truncated for display)";
export const TRUNCATED_GEMINI_MESSAGE = "\n... (file truncated)";
export const MARKDOWN_FILE_EXTENSION = '.md';
export const REPORT_FILE_MIMETYPE = 'text/markdown;charset=utf-8';
export const GENERIC_FILE_MIMETYPE = 'text/plain;charset=utf-8';