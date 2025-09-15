# **DEVELOPMENT_GUIDELINES.md**

Welcome to the Sxentrie development team. This document is the official and comprehensive guide to the project's engineering standards, architectural patterns, and development protocols. It is designed to be a single source of truth for both human developers and AI coding agents.

Strict adherence to these guidelines is mandatory. They are essential for maintaining a secure, consistent, and highly maintainable codebase that supports effective and efficient collaboration in a hybrid human-AI development environment.

## **1.0 Project Vision & Core Principles**

This section establishes the high-level vision and foundational principles that govern all development, design, and architectural decisions.

### **1.1 Guiding Philosophy: Developer-First Ergonomics**

The primary goal of the Sxentrie project is to build an ergonomic, focused, and powerful developer tool. We are creating a professional utility, and therefore, every design choice must be deliberately made to enhance a developer's workflow, provide absolute clarity, and feel exceptionally responsive. Our decision-making process is consistently guided by a commitment to clear communication, the Single Responsibility Principle, and a developer-centric approach.

### **1.2 Core Principles**

The following principles are the practical application of our guiding philosophy and must be reflected in all contributions.

* **A Tool-First, Not AI-First, Identity:** The application is fundamentally a developer tool that leverages intelligent features; it is not an "AI product." The central focus must always remain on the tangible utility it provides to the user.  
  * **Action-Oriented Language:** To maintain this focus, we avoid using the term "AI" in all user-facing text. Instead of vague phrases like "Generate with AI," use descriptive language that specifies the action's outcome (e.g., "Generate Documentation," "Run Analysis").  
  * **Functional Iconography:** Icons must be professional, tool-oriented, and functionally relevant. Do not use icons thematically associated with artificial intelligence or magic (e.g., robots, magic wands). Instead, opt for clear, utility-focused icons (e.g., FlaskConical for analysis).  
* **Uncompromising Clarity and Focus:** The user interface must be designed to eliminate ambiguity and reduce cognitive load. This principle is technically enforced through our structured architecture (Section 3.1) and consistent styling system (Section 3.4).  
* **Interactive and Tactile Feedback:** The interface must feel alive and responsive. Every user action, without exception, must be met with immediate and unambiguous feedback. This is technically achieved through our data fetching strategy (Section 3.3), which provides streamlined loading states, and our error handling protocol (Section 3.5), which ensures graceful failure modes.

### **1.3 Design Philosophy: The Focused Analysis Environment**

Our design philosophy is centered on creating a digital workspace that functions as a professional instrument for code comprehension.

* **Aesthetic Minimalism:** We achieve a professional aesthetic through disciplined and minimalist design. A restrained color palette and the strategic use of generous negative space work together to create a calm, focused environment that minimizes eye strain and distraction.  
* **The Visual Blueprint:** The visual identity of the application is defined by the following strict rules, which are enforced by our Tailwind CSS configuration (see Section 3.4).  
  * **Color Palette & Format:** The aesthetic is built upon a disciplined monochromatic palette. All colors are defined as variables in tailwind.config.js. A single accent color, primary, is used exclusively to denote interactive states (e.g., hover, focus) and to draw attention to critical information. To ensure modern standards and perceptual uniformity, **all color values MUST be defined using the oklch() color function.**  
  * **Typography:** The primary typeface for all UI elements is 'IBM Plex Sans'. For all code rendering, 'IBM Plex Mono' must be used. These are configured in tailwind.config.js.  
  * **Structure & Spacing:** Generous negative space is a core design element, enforced by the spacing scale in tailwind.config.js. All primary containers, panels, and buttons must use structured, semi-rounded corners, defined by the radius variable. The use of pill shapes (rounded-full) is strictly forbidden for primary containers and buttons.  
* **Responsive and Mobile-First Mandate:** A seamless, fully-featured, and intuitive mobile experience is a non-negotiable requirement.  
  * **Graceful Adaptation:** The standard three-panel desktop layout must gracefully adapt and stack into a single, easily scrollable column on smaller viewports using Tailwind's responsive modifiers (e.g., md:, lg:).  
  * **Touch-First Interactions:** All interactive elements must have touch targets large enough to be easily and accurately tapped on a mobile screen.  
  * **No Horizontal Scrolling:** Under no circumstances should the application layout produce horizontal scrolling on any device size.

## **2.0 Local Environment & Setup**

This section provides the necessary steps to set up and run the Sxentrie project on your local machine.

### **2.1 Prerequisites**

Ensure your development environment has the following software installed:

* **Node.js**: Version 22.x or higher.  
* **npm**: Included with Node.js.

### **2.2 Secure Environment Configuration**

All secrets, API keys, and environment-specific variables are managed exclusively through environment variables. **Under no circumstances should any secret be hardcoded into a source file or committed to version control.**

1. Locate the .env.example file in the project's root directory.  
2. Create a copy of this file and name it .env.  
3. Populate the .env file with your actual credentials. This file is listed in .gitignore and will never be committed to the repository.

Bash

#.env.example - Copy to.env and fill in your values  
GITHUB_CLIENT_ID="your_github_client_id"  
GITHUB_CLIENT_SECRET="your_github_client_secret"  
API_KEY="your_gemini_api_key"  
JWT_SECRET="your_super_secret_jwt_string"

### **2.3 Running the Application**

Use the following npm scripts to run or build the application.

* **Development Mode:** Starts the application with hot-reloading.  
  Bash  
  npm run dev

* **Production Build:** Compiles and optimizes the application for deployment.  
  Bash  
  npm run build

## **3.0 Project Architecture & Technical Strategy**

This section defines the core architectural patterns and technology choices for the project. These are not suggestions; they are mandatory standards.

### **3.1 Official Directory Structure & Architectural Pattern**

The project officially adheres to **Vertical Slice Architecture**. This pattern organizes code by feature, promoting high cohesion and low coupling.

The top-level src directory is organized as follows:

* src/features/: Contains self-contained vertical slices of functionality. Each feature folder (e.g., repo-analysis/) contains all the code related to that feature (UI components, hooks, services, types).  
* src/shared/: Contains reusable, feature-agnostic code. This includes shared UI components (<Button>, <Panel>), API clients, configuration files, and global types.  
* src/app/: Contains application-wide setup, including routing, global state providers, and the main application entry point.

The Rule of Unidirectional Dependency:  
To maintain a clean and scalable architecture, the following dependency rules are strictly enforced:

* features can depend on shared.  
* app can depend on features and shared.  
* shared **MUST NOT** depend on features or app.  
* features **MUST NOT** depend on other features directly. Shared functionality must be extracted into the shared layer.

### **3.2 State Management Strategy**

The project follows the principle of **state colocation**: state should be managed as close as possible to the components that use it [1]. The choice of state management tool is determined by the nature and scope of the state.

| State Type | Condition | Recommended Tool | Rationale |
| :---- | :---- | :---- | :---- |
| **Local UI State** | State is used by only one component or a parent and its immediate children. | useState, useReducer | Maximum colocation, prevents unnecessary re-renders of unrelated components. |
| **Static Global Data** | Data is needed by many components but changes rarely (e.g., theme, user auth status). | React Context API | A built-in solution that avoids external dependencies for simple prop-drilling avoidance [2, 3]. |
| **Complex Global State** | State is shared across multiple, unrelated features and updates frequently (e.g., application settings). | **Zustand** | Lightweight, performant, and has minimal boilerplate. This is the project's official global client state manager [2, 4]. |
| **Server Cache State** | Data is fetched from an API and requires caching, revalidation, and synchronization. | **TanStack Query** | This is not client state and must be managed separately. See Section 3.3. |

### **3.3 Data Fetching & Caching**

**TanStack Query (React Query)** is the mandatory and exclusive library for all server state management. The direct use of useEffect with fetch or axios to retrieve data for display in the UI is strictly forbidden.

* **Rationale:** React Query provides a robust, production-ready solution for fetching, caching, and synchronizing server data. It automates complex logic for handling loading states, errors, retries, and background updates, which directly supports our core principle of an "Interactive and Tactile" interface [7, 8].  
* **Usage:**  
  * Use the useQuery hook for all data retrieval operations.  
  * Use the useMutation hook for all data modification operations (POST, PUT, DELETE). Upon a successful mutation, you must invalidate the relevant queries to ensure the UI reflects the updated state.

### **3.4 Styling Architecture**

**Tailwind CSS** is the exclusive styling solution for this project. The use of plain .css files, CSS Modules, or other CSS-in-JS libraries is forbidden to ensure consistency.

* **Single Source of Truth:** The tailwind.config.js file is the single source of truth for all design tokens, including colors, fonts, spacing, and border radii. All styling MUST be implemented using Tailwind utility classes that reference these configured tokens.  
* **Component-First Approach:** For complex or reusable sets of styles, create a new React component with the utility classes applied. Do not create custom CSS classes with @apply. This enforces a component-based methodology and keeps all styling logic within the JSX.

### **3.5 Error Handling & Logging Protocol**

A robust error handling strategy is critical for application stability and user trust.

* **Client-Side:**  
  * **Rendering Errors:** All page-level components and major feature containers **MUST** be wrapped in an <ErrorBoundary> component. This prevents a rendering error in one part of the UI from crashing the entire application and allows for a graceful fallback UI to be displayed [18, 19].  
  * **Asynchronous Errors:** All asynchronous operations (e.g., API calls within mutations) and event handlers that can fail **MUST** be wrapped in try/catch blocks.  
* **Server-Side (Serverless Functions):**  
  * All serverless functions **MUST** return a standardized JSON error response on failure. The format is: { "success": false, "error": { "code": "ERROR_CODE", "message": "A descriptive error message." } }.  
* **Logging:**  
  * All errors caught by an ErrorBoundary or a try/catch block **MUST** be reported to a designated logging service.  
  * Logs **MUST** be structured and include a context object with relevant information (e.g., { componentName: 'AnalysisPanel', userId: '...', traceId: '...' }) to facilitate effective debugging [23].

## **4.0 Development Workflow & Protocols**

### **4.1 Version Control: Conventional Commits**

To maintain a clear, explicit, and machine-readable commit history, all commit messages **MUST** adhere strictly to the **Conventional Commits** specification.

* **Format:**  
  <type>[scope]: <description>

* **Allowed <type> values:** feat, fix, docs, style, refactor, perf, test, chore.

### **4.2 Dependency Management Protocol**

The project follows a strict protocol to mitigate the risks associated with third-party dependencies.

* **Adding a New Dependency:**  
  1. **Proposal:** Open a GitHub Issue proposing the new dependency. The issue must include a clear justification for its necessity.  
  2. **Vetting:** The proposed package must be vetted against a checklist: Is it actively maintained? Does it have a healthy number of downloads? Are there critical open issues? What is its bundle size impact?  
  3. **Approval:** A human project manager **MUST** approve the issue before the package can be added to the project. This is a mandatory human checkpoint.  
* **Auditing:**  
  * The CI/CD pipeline **MUST** run npm audit --audit-level=high on every commit. The build will fail if any high or critical vulnerabilities are found [33, 35].  
  * A weekly automated task will be created to review and address any moderate-level vulnerabilities.

### **4.3 Testing Strategy**

A comprehensive testing strategy is mandatory for ensuring code quality and enabling safe refactoring.

* **File Naming and Location:**  
  * Unit and integration tests (e.g., AnalysisPanel.test.tsx) **MUST** be collocated with the source file they are testing.  
  * End-to-end tests (e.g., analysis-flow.spec.ts) **MUST** reside in the root e2e/ directory.  
* **Unit Tests (Vitest):** All individual components, hooks, and utility functions must have unit tests covering their core logic, props, and return values.  
* **Integration Tests (Vitest \+ React Testing Library):** The interaction between multiple components (e.g., a form with its inputs and submission button) must be covered by integration tests [25].  
* **End-to-End Tests (Playwright):** Every critical user flow (e.g., user authentication, loading a repository, running an analysis) **MUST** be covered by a Playwright E2E test [29].

## **5.0 Code Standards & Conventions**

### **5.1 Naming Conventions**

The following naming conventions are enforced across the entire codebase.

| Artifact Type | Convention | Example |
| :---- | :---- | :---- |
| Folders | kebab-case | repo-analysis |
| React Component Files | PascalCase.tsx | DataGrid.tsx |
| Custom Hook Files | camelCase.ts | useAuth.ts |
| All Other TS Files | kebab-case.ts | api-client.ts |
| Types & Interfaces | PascalCase | interface UserProfile |
| Variables & Functions | camelCase | const userName = 'test'; |
| Global Constants | SCREAMING_SNAKE_CASE | const API_BASE_URL = '...'; |

### **5.2 General Code-Level Standards**

* **Clarity Over Brevity:** Always prioritize writing code that is self-explanatory.  
* **Single Responsibility Principle (SRP):** Every file, component, and function should have one, and only one, reason to change.  
* **No Magic Values:** Avoid hardcoding non-obvious values. Define them as named constants in src/shared/config/index.ts.  
* **Asynchronous Code Protocol:** Always use async/await for asynchronous operations. All fallible operations must be wrapped in try/catch blocks as defined in Section 3.5.

### **5.3 File Header Mandate**

Every .ts and .tsx file (excluding test files) **MUST** begin with a JSDoc header that follows the exact structure and order outlined below.

* **Header Structure and Order:**  
  1. @license / Copyright (if present)  
  2. @file: The full, absolute file path from the project root.  
  3. @description: A single, concise sentence explaining the file's primary responsibility.  
  4. @module: The feature module the file belongs to. Approved modules are: App, Features.<FeatureName>, Shared.API, Shared.UI, Shared.Config, Shared.Types, Shared.Errors.  
  5. @summary: A detailed paragraph explaining the file's architectural purpose and key functionalities.  
  6. @dependencies: Key architectural dependencies.  
  7. @outputs: Key exports.  
* **Example:**  
  JavaScript  
  /**  
   * @file src/features/repo-analysis/components/AnalysisPanel.tsx  
   * @description The UI panel for configuring and displaying code analysis results.  
   *  
   * @module Features.RepoAnalysis  
   *  
   * @summary This component provides the user interface for the core analysis feature. It includes  
   * controls for setting analysis configuration, a button to trigger the analysis, and views  
   * for displaying loading states, errors, and the final analysis report.  
   *  
   * @dependencies  
   * - react  
   * - zustand  
   * - @tanstack/react-query  
   * - src/shared/components/Panel.tsx  
   *  
   * @outputs  
   * - Exports the `AnalysisPanel` React component.  
   */

## **6.0 Human-AI Collaboration Protocol**

This section defines the mandatory rules of engagement for the hybrid human-AI development team.

### **6.1 Guiding Principle: AI as a Supervised Junior Developer**

The AI coding agent is to be treated as a highly capable but non-sentient tool that excels at executing well-defined tasks. It is a "junior developer" that needs supervision. The AI is not responsible for architectural decisions, product requirements, or security approvals. The human project manager is always accountable for the final work product [42, 45].

### **6.2 Decision-Making Framework**

The following table defines the boundaries of AI autonomy and specifies the mandatory human checkpoints for different categories of tasks. This framework is the core of our Human-in-the-Loop (HITL) process [38, 40].

| Task Category | AI Autonomy Level | Mandatory Human Checkpoint |
| :---- | :---- | :---- |
| **Code Implementation** |  |  |
| Implementing a new UI component based on an approved design spec and test file. | **High** | Final PR review. |
| Refactoring a function for clarity or performance without changing its public API. | **High** | Final PR review. |
| Fixing a bug with a clear reproduction path and an existing failing test. | **High** | Final PR review. |
| **Architectural Changes** |  |  |
| Adding a new third-party dependency (npm package). | **None** | **Must** be approved by a human in a GitHub issue *before* implementation begins. |
| Changing the project directory structure. | **None** | **Must** be approved by a human *before* implementation. |
| Defining a new global state slice in Zustand. | **Low** (Can propose an implementation) | The proposed state shape and actions **must** be approved by a human. |
| **Documentation & Testing** |  |  |
| Writing unit tests for an existing component. | **High** | Final PR review. |
| Writing an E2E test for an existing user flow. | **Medium** (Can draft the test) | The test plan and key selectors **must** be reviewed by a human before extensive implementation. |
| Updating JSDoc file headers after modifying a file. | **Full** | No specific checkpoint needed beyond normal PR review. |

### **6.3 Escalation Path for AI Agents**

When the AI agent encounters ambiguity, conflicting instructions, or an unexpected error that it cannot resolve, it **MUST** follow this escalation path:

1. **Self-Correction:** Re-read these guidelines and the current task description. Attempt to resolve the ambiguity up to three times.  
2. **Halt Execution:** If self-correction fails, halt immediately. **Do not** generate potentially incorrect or non-compliant code.  
3. **Formal Request for Clarification:** Post a comment on the relevant GitHub issue or Pull Request. The comment **MUST** adhere to the following format:  
   * Start with the prefix: ``.  
   * Clearly and concisely state the ambiguity or conflict identified (e.g., "The task requires modifying a dependency, but this requires pre-approval according to Section 4.2. Please advise.").  
   * Present specific, numbered questions for the human manager to answer.

### **6.4 Mandated Format for AI-Generated Contributions**

To streamline human review, all AI-generated contributions must adhere to a specific format.

* **Commit Messages:** Must strictly follow the Conventional Commits specification (Section 4.1). The body of the commit message should include a reference to the prompt used for the generation.

* ### **Pull Requests: The PR description must be auto-generated by the AI and follow this template:**    **Summary**    **A brief, one-sentence summary of the change.**    **Implementation Details**    **A bulleted list explaining *how* the changes were implemented and *why* specific technical choices were made, referencing these guidelines where applicable. This forces the AI to "explain its work," making the human review process more efficient.42**    **Reference**    **A link to the GitHub issue being addressed.**
