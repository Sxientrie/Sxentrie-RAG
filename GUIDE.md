# Production Deployment Guide for Sxentrie

This guide outlines the necessary steps to transition this application from its current rapid-prototyping environment to a robust, production-grade setup.

## 1. Local Development & Build Setup

The first step is to create a standard local development environment using Node.js and a modern build tool like Vite.

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS version recommended)
- A package manager like `npm` (comes with Node.js) or `yarn`.

### Steps:
1.  **Initialize a Vite Project:**
    Open your terminal and run the following command to create a new project with React and TypeScript support.

    ```bash
    npm create vite@latest sxentrie-app -- --template react-ts
    ```

2.  **Copy Project Files:**
    Move all the existing files and folders (`index.html`, `index.tsx`, `src/`, `api/`, etc.) into the newly created `sxentrie-app` directory, overwriting the template files where necessary.

3.  **Install Dependencies:**
    Navigate into your new project directory (`cd sxentrie-app`). The current application uses an `importmap` to load libraries from a CDN. In a production setup, you must manage these locally.

    Remove the `<script type="importmap">...</script>` block from your `index.html`.

    Then, install the necessary libraries using `npm`:

    ```bash
    npm install react react-dom @google/genai lucide-react react-markdown remark-gfm react-syntax-highlighter jose
    ```
    You will also need to install the types for `react-syntax-highlighter`:
    ```bash
    npm install -D @types/react-syntax-highlighter
    ```

## 2. Code & Asset Refactoring

### Move CSS
The large `<style>` block in `index.html` is not scalable.

1.  Create a new file: `src/index.css`.
2.  Cut all the CSS code from inside the `<style>...</style>` tags in `index.html` and paste it into `src/index.css`.
3.  Remove the now-empty `<style>` block from `index.html`.
4.  Import the CSS file at the top of your main entry point, `index.tsx`:
    ```tsx
    // index.tsx
    import React from "react";
    import { createRoot } from "react-dom/client";
    import { App } from "./src/shell/app";
    import './src/index.css'; // Add this line

    const container = document.getElementById("root");
    const root = createRoot(container!);
    root.render(<App />);
    ```

## 3. Environment Variables & Secrets

Never commit API keys or secrets directly into your code.

1.  **Create a `.env.local` file** in the root of your project. This file will hold all your secrets.

2.  **Add it to `.gitignore`:** Open the `.gitignore` file (Vite creates one for you) and ensure the following line is present to prevent it from being committed to Git.
    ```
    .env.local
    ```

3.  **Populate `.env.local`:** Add your secrets to this file. Vite exposes variables prefixed with `VITE_` to the frontend client-side code. Variables without the prefix are only available on the backend (in your serverless functions).

    ```.env.local
    # Available on the client (for GitHub Login button)
    VITE_GITHUB_CLIENT_ID="gho_your_client_id_from_github"

    # For backend serverless functions ONLY
    API_KEY="your_gemini_api_key"
    GITHUB_CLIENT_ID="gho_your_client_id_from_github"
    GITHUB_CLIENT_SECRET="your_github_client_secret"
    JWT_SECRET="generate_a_strong_random_string_for_jwt_signing"
    ```

    **Note:** The `GITHUB_CLIENT_ID` is needed in both places. The `VITE_` prefixed one is for the frontend redirect, and the one without is for the backend API call.

4.  **Update Authentication Service:** The file `src/domains/accounts/infrastructure/auth-service.ts` has a hardcoded placeholder for the GitHub Client ID. You need to update it to use the environment variable. I have already made this change for you. It now reads from `import.meta.env.VITE_GITHUB_CLIENT_ID`.

## 4. Backend API & Deployment

This application is designed to be deployed on a modern hosting platform that supports serverless functions out of the box, such as **Vercel** or **Netlify**.

### Steps:
1.  **Create a GitHub Repository:**
    Push your local `sxentrie-app` project to a new repository on GitHub.

2.  **Sign up for Vercel/Netlify:**
    Create an account on your preferred platform.

3.  **Import Your Project:**
    -   Connect your GitHub account to the hosting provider.
    -   Select and import the repository you just created.
    -   The platform will automatically detect that it's a Vite project. The default build settings should work correctly.

4.  **Configure Environment Variables:**
    -   In your project's dashboard on Vercel/Netlify, find the "Environment Variables" section.
    -   Add all the variables from your `.env.local` file (`API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET`). **Do not** add the `VITE_` prefix here for the client-side variable; the build process handles that automatically. Just add `GITHUB_CLIENT_ID`.

5.  **Deploy:**
    Trigger a deployment. The platform will now automatically build and deploy your application every time you push a change to your main branch. It will also deploy the files in the `api/` directory as serverless functions.

Your application is now production-grade and live on the web!
