# Sxentrie: Instant Code Comprehension

Sxentrie is a web-based tool designed to provide instant code comprehension for developers. It leverages a powerful language model to analyze GitHub repositories and deliver a clear, concise overview of the codebase, along with a detailed review of potential issues. This tool is built to help developers quickly understand the architecture, identify potential bugs, and improve the overall quality of their code.

## Technology Stack

The application is built with a modern technology stack, ensuring a robust and scalable solution.

### Front-End

*   **React 19:** A declarative, efficient, and flexible JavaScript library for building user interfaces.
*   **Vite:** A next-generation front-end tooling that provides a faster and leaner development experience.
*   **TypeScript:** A statically typed superset of JavaScript that adds type safety to the application.
*   **Lucide-React:** A library of simply designed, beautiful icons.

### Back-End

*   **Google Gemini Pro:** A powerful, multimodal large language model from Google that provides the core code analysis capabilities.
*   **Serverless Functions:** The back-end is implemented as serverless functions, providing a scalable and cost-effective solution.

### Architecture

*   **Domain-Driven Design (DDD):** The codebase follows a DDD philosophy for scalability and maintainability.
*   **"No-Build" Setup:** The application uses native ES Modules and an `importmap`, which means there is no build step required for development.

## Architecture Deep Dive

The application follows a Domain-Driven Design (DDD) approach, which helps to manage complexity and maintain a clear separation of concerns. The codebase is organized into several domains, each with its own distinct responsibilities.

### Directory Structure

The main directories in the project are:

*   **`api/`:** Contains the serverless functions that handle back-end logic, such as code analysis and user authentication.
*   **`src/`:** The main source code for the front-end application.
    *   **`domains/`:** This directory is the core of the DDD approach and is divided into the following domains:
        *   **`accounts`:** Manages user authentication and session management.
        *   **`repository-analysis`:** Handles the logic for fetching, analyzing, and displaying repository information.
        *   **`settings`:** Manages user-specific settings and preferences.
    *   **`shell/`:** Contains the main application component (`App.tsx`) that orchestrates the overall layout and state management.
    *   **`shared/`:** Includes shared components, hooks, and utility functions that are used across different domains.
*   **`public/`:** Contains static assets, such as the `manifest.json` file.

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