/**
 * @file index.tsx
 * @version 0.1.0
 * @description The main entry point for the React application.
 *
 * @module Core.Bootstrap
 *
 * @summary This file is the root of the application. It uses `react-dom/client` to find the 'root' HTML element and render the main `App` component into it, effectively starting the entire React application lifecycle.
 *
 * @dependencies
 * - react
 * - react-dom/client
 * - ./src/shell/app
 *
 * @outputs
 * - Renders the `App` component to the DOM.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */
import React from "react";
import { createRoot } from "react-dom/client";
// The application entry point, loading the main App component from the shell.
import { App } from "./src/shell/app";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
