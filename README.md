Sxentrie is a web-based, RAG analysis suite for GitHub repositories. It provides developers, team leads, and project managers with a powerful tool to gain deep, actionable insights into a codebase without ever leaving the browser.

By simply providing a public GitHub URL, you can instantly browse the repository's file structure and run a comprehensive analysis that delivers a high-level project overview and a detailed technical review.

## Key Features

  * **Instant, Browser-Based Access:** No installation, no setup, no IDE required. Paste a GitHub repository URL and start exploring immediately.
  * **Interactive Code Navigation:** Browse the complete file and directory structure of any public repository through a clean and intuitive tree view.
  * **Detailed Project Overview:** Get a high-level understanding of any repository. Sxentrie's analysis explains the project's purpose, key features, and technology stack in concise, human-readable language.
  * **In-Depth Technical Review:** Go beyond surface-level stats. The technical review identifies potential bugs, security vulnerabilities, performance bottlenecks, and areas for improved maintainability, complete with code snippets and explanations.
  * **Secure User Accounts:** Log in with your GitHub account to unlock personalized features and future capabilities.

## How It Works

The process is designed to be as simple as possible:

1.  **Paste URL:** Provide a link to any public GitHub repository.
2.  **Load Repository:** Sxentrie fetches the repository's file structure, allowing you to browse its contents.
3.  **Run Analysis:** Initiate the Code analysis on the entire repository or a single file. The results are presented in a clear, two-tab view for easy digestion.

## Technology Stack

Sxentrie is built with a modern, lightweight, and performant technology stack.

  * **Frontend:** React 19 (Functional Components & Hooks) and TypeScript.
  * **AI Engine:** Google Gemini API.
  * **Architecture:** A "no-build" setup using native ES Modules and an `importmap`. The codebase follows a Domain-Driven Design (DDD) philosophy for scalability and maintainability.
  * **Backend:** Secure authentication and API interactions are handled by platform-agnostic serverless functions.

## Getting Started (Local Development)

To run this project locally, you will need to:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/your-username/sxentrie.git
    ```
2.  **Configure GitHub Client ID:**
    *   For the authentication feature to work, you must provide your GitHub OAuth App's Client ID.
    *   Open the file: `src/domains/accounts/infrastructure/auth-service.ts`.
    *   Find the constant: `const GITHUB_CLIENT_ID = 'VITE_GITHUB_CLIENT_ID_PLACEHOLDER';`
    *   Replace `'VITE_GITHUB_CLIENT_ID_PLACEHOLDER'` with your actual Client ID string.
    *   **Note:** For a production deployment, it is strongly recommended to follow the `GUIDE.md` to set up a proper build process with environment variables instead of hardcoding secrets.

3.  **Run the Application:**
    *   Serve the root `index.html` file using any simple local web server. The application has no build step and will run directly in the browser.

4.  **(Optional) Set up Backend & Production Environment**
    *   For full functionality (including analysis, documentation generation, and login persistence), you need to set up backend secrets. This project is designed for serverless deployment (e.g., on Vercel or Netlify).
    *   Please refer to `GUIDE.md` for complete instructions on setting up a production-ready environment with the necessary backend API keys and secrets.

## Contributing

We welcome contributions from the community. If you're interested in helping improve Sxentrie, please read our `CONTRIBUTING.md` file to learn about our development process, architectural guidelines, and how to submit a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.