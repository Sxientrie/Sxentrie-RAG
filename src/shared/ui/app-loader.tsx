/**
 * @file src/shared/ui/app-loader.tsx
 * @version 0.1.0
 * @description A full-page loading indicator component shown during initial application startup.
 *
 * @module Core.UI
 *
 * @summary This is a simple presentational component that displays a centered loading spinner and a message. It is used by the `AuthProvider` to provide visual feedback to the user while the initial session check is in progress, preventing the main UI from being shown prematurely.
 *
 * @dependencies
 * - react
 *
 * @outputs
 * - Exports the `AppLoader` React component.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React, { FC } from 'react';

export const AppLoader: FC = () => {
  return (
    <div className="full-page-centered">
      <div className="loading-spinner"></div>
      <h2>Initializing Sxentrie...</h2>
    </div>
  );
};