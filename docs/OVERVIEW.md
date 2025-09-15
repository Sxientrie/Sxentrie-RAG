# Sxentrie: In-Depth Tool Overview

## 1. Introduction & Vision

**Sxentrie** is a sophisticated, web-based code comprehension tool designed to provide developers with instant insights into unfamiliar or complex GitHub repositories. It operates as a specialized Retrieval-Augmented Generation (RAG) system, leveraging advanced language models to perform deep static analysis and generate human-readable documentation.

The core vision of Sxentrie is rooted in **Developer-First Ergonomics**. It is engineered not as a replacement for developer expertise, but as a powerful cognitive assistant that accelerates understanding, improves code quality, and streamlines common software development workflows such as code reviews, onboarding, and architectural exploration.

### Core Problem Solved

The tool directly addresses the significant time and cognitive load required for developers to understand a new codebase. By automating the initial analysis and summarization, Sxentrie allows engineers to focus on higher-level logic, architecture, and problem-solving rather than manual code archaeology.

### Target Audience

*   **Software Developers:** Quickly getting up to speed on a new project or feature branch.
*   **Team Leads & Architects:** Assessing the overall structure, quality, and technology stack of a repository.
*   **Security Reviewers:** Identifying potential vulnerabilities and insecure coding patterns at a high level.
*   **Open Source Contributors:** Lowering the barrier to entry for understanding and contributing to new projects.

---

## 2. Core Features & User Workflow

The user experience is designed as a linear, intuitive workflow that guides the user from repository selection to actionable insights.

### Step 1: Load Repository

The user's journey begins by providing a URL to a public GitHub repository. The application fetches the repository's metadata and recursively builds a complete file tree of its default branch.

### Step 2: Explore & Select Scope

Once loaded, the user is presented with a familiar two-panel interface:
*   **File Tree:** A searchable, hierarchical view of all files and directories, allowing for easy navigation.
*   **File Viewer:** A feature-rich code viewer with syntax highlighting for various languages. It supports both text-based files and image previews.

The user defines the **scope** of the subsequent operation by choosing to target either the **Entire Repository** or a **Selected File**.

### Step 3: Configure & Execute Task

The Analysis Panel is the central control hub. Here, the user can configure and initiate two primary tasks:

**A) Run Analysis:**
This is the core feature of Sxentrie. The user can configure:
*   **Mode:**
    *   **Fast Scan:** Analyzes the first 15 files to provide a quick, high-level overview. Uses the `gemini-2.5-flash` model for speed.
    *   **Deep Scan:** Analyzes all supported files in the repository for a comprehensive review. Uses the more powerful `gemini-2.5-pro` model.
*   **Custom Directives:** An open text field allows the user to provide specific instructions to the analysis engine, such as "Focus on security vulnerabilities in Go files" or "Check for adherence to SOLID principles."

**B) Generate Documentation:**
This task generates technical documentation in Markdown format. The output intelligently adapts to the selected scope:
*   **Repository Scope:** Generates a full `README.md` file, including a project summary, inferred technology stack, and setup/run instructions.
*   **File Scope:** Generates a detailed document explaining the file's purpose, its key functions/classes, and its role within the larger application architecture.

### Step 4: Review Actionable Results

The results of an analysis are presented in a multi-tabbed view, separating high-level understanding from granular detail:

*   **Project Overview Tab:** Displays a concise, multi-paragraph summary of the project's purpose, primary features, and technology stack.
*   **Technical Review Tab:** Presents a list of specific findings. Each finding is an interactive component that includes:
    *   **Severity:** (Critical, High, Medium, Low)
    *   **Title:** A concise description of the issue.
    *   **File Path:** A clickable link that instantly navigates the user to the relevant file and **highlights the exact lines of code** in the File Viewer.
    *   **Detailed Explanation:** A step-by-step explanation of the issue, often including corrected code snippets.
    *   **Dismissible:** Users can dismiss findings to hide them from the current view.
*   **Downloadable Report:** The entire analysis can be downloaded as a comprehensive Markdown report.

---

## 3. Architectural Design & Technical Implementation

Sxentrie is built on a modern, scalable JAMstack architecture, combining a powerful client-side application with serverless functions for secure, on-demand backend processing.

### High-Level Architecture

1.  **React SPA Frontend:** A dynamic single-page application built with React 19 and TypeScript provides the entire user interface.
2.  **Serverless Backend:** A set of serverless functions (located in the `/api` directory) act as a secure proxy between the user's browser and the Google Gemini API.
3.  **Third-Party APIs:**
    *   **GitHub API:** Used to fetch repository information and file trees.
    *   **Google Gemini API:** The core intelligence layer used for all analysis and generation tasks.

This decoupled architecture ensures that sensitive credentials (like the platform's Gemini API key) are never exposed to the client.

### Frontend Architecture

*   **Technology:** React 19, TypeScript, Vite, with a "no-build" development setup leveraging ES Module `importmap`.
*   **Domain-Driven Design (DDD):** The application's source code is organized into domains (`/src/domains`), promoting a clear separation of concerns:
    *   `repository-analysis`: Manages all state and logic related to fetching, displaying, and analyzing code.
    *   `accounts`: Handles user authentication via GitHub OAuth.
    *   `settings`: Manages user-configurable settings, such as providing a personal Gemini API key.
*   **State Management:** The application follows the principle of **state colocation**, primarily using React's built-in `useReducer` and `Context` APIs (`RepositoryProvider`, `SettingsProvider`). This keeps domain-specific state encapsulated within its relevant feature, avoiding the need for a monolithic global state store.

### Backend Architecture (Serverless Functions)

The serverless functions are the engine of the application.

*   **`api/analyze.ts`:**
    *   Receives the list of target files and user configuration from the frontend.
    *   Fetches the content of each file from GitHub.
    *   Constructs a highly-specific, complex prompt for the Gemini model. This prompt instructs the model to act as an expert code reviewer and to return its findings in a **strict JSON format**, enforced by the API's `responseSchema` feature.
    *   Initiates a streaming connection to the Gemini API and pipes the response back to the client. This allows for real-time progress updates (e.g., "Fetching file X...", "Analyzing Y...") by parsing the "thought stream" from the model before the final result is ready.

*   **`api/document.ts`:**
    *   Follows a similar process but uses a different prompt engineered specifically for technical writing and Markdown generation.

### User-Provided API Key

The application allows users to provide their own Google Gemini API key. This key is stored securely in the browser's `localStorage`. When a user makes a request, the key is sent with the payload to the serverless function, which then uses the user's key to initialize the Gemini client instead of the platform's default key. This empowers users to leverage their own API quotas for heavy usage.

---

## 4. UI/UX Design Philosophy

The user interface is meticulously crafted based on the principles outlined in the `DESIGN-PHILOSOPHY.md` document.

*   **Minimalism & Focus:** The UI is intentionally sparse with a dark, monochromatic color palette to reduce visual noise and eye strain, allowing developers to focus on the code. A single primary color (`--primary`) is used semantically to draw attention to interactive elements and important information.
*   **Clarity & Consistency:** The design adheres to a strict 8-point grid system for spacing and layout. A consistent border radius and component anatomy create a predictable and intuitive user experience.
*   **Tactile Feedback:** Every action provides immediate feedback. Loading a repository shows a spinner, long-running analyses display a stream of progress messages, and interactive elements have clear hover and focus states. This makes the application feel responsive and alive.
*   **Responsive Design:** The three-panel desktop layout gracefully collapses into a single, scrollable column on mobile devices, ensuring full functionality across all screen sizes without horizontal scrolling.
