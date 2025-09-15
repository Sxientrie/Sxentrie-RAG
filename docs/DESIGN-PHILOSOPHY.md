# Design Philosophy

This document outlines the core design principles, spatial system, color palette, and component anatomy of this application. It serves as a guide for maintaining a consistent and coherent user experience. The philosophy is grounded in minimalism, clarity, and developer-centric functionality.

---

## 1. Core Philosophy

The application's design is guided by a few key principles:

- **Minimalism & Focus:** The UI is intentionally sparse, prioritizing content and functionality over decoration. The dark theme reduces visual noise and helps users focus on the task at hand.
- **Clarity & Consistency:** The design relies on a strict system of spacing, color, and typography to create a predictable and easy-to-understand interface. Components are used consistently throughout the application.
- **Developer-Centric:** The design is built for a technical audience. It values information density and keyboard accessibility. The visual language is precise and unambiguous.

---

## 2. Spatial System

The layout and sizing of components are governed by a systematic approach to space, ensuring visual harmony and rhythm.

### 8-Point Grid System

The foundation of the spatial system is an 8-point grid. All spacing, padding, and margins are defined in increments of 8px. This creates a consistent and scalable visual structure. Where finer control is needed, 4px increments are used.

- **Base Unit:** 1 unit = 8px
- **Standard Padding:** 16px (`p-4`)
- **Standard Gutter:** 8px (`gap-2` in flex layouts)

### Sizing Scale

A consistent sizing scale is used for UI elements, particularly for heights and widths where necessary.

| Class | Size   | Pixels | Notes                   |
| :---- | :----- | :----- | :---------------------- |
| `h-12`  | `3rem` | 48px   | Used for primary headers. |

### Border Radius

A single, application-wide border radius (`rounded-app`) is used to maintain a consistent corner shape for all components.

- **Default Radius:** `0.5rem` (8px)

### Borders

Borders are 1px solid lines, primarily used to define the boundaries of components like Panels, Inputs, and Buttons. The default border color is `var(--border)`.

---

## 3. Color System

The color system is defined using the `oklch` color model, which provides a modern, wide-gamut, and perceptually uniform color space. This prevents unexpected shifts in hue or brightness when manipulating colors. The palette is semantic, meaning colors are named for their role in the UI, not their specific shade.

| Role                 | CSS Variable         | Value             | Description                                          |
| :------------------- | :------------------- | :---------------- | :--------------------------------------------------- |
| **Primary Action**   | `--primary`          | `oklch(45% 0.08 150)` | The main interactive color for buttons and highlights. |
| **Foreground**       | `--foreground`       | `oklch(95% 0 0)`    | The primary color for body text.                     |
| **Muted Foreground** | `--muted-foreground` | `oklch(80% 0 0)`    | For secondary text, placeholders, and disabled states. |
| **Background**       | `--background`       | `oklch(15% 0 0)`    | The darkest color, used for the main app background. |
| **Surface**          | `--surface`          | `oklch(20% 0 0)`    | The background color for components like Panels.     |
| **Border**           | `--border`           | `oklch(30% 0 0)`    | The color for component borders and dividers.        |
| **Feedback: Error**  | `--error`            | `oklch(0.55 0.2 25)` | For error messages and destructive actions.          |
| **Feedback: Info**   | `--info`             | `oklch(0.8 0.1 90)`  | For informational messages and callouts.             |
| **Feedback: Help**   | `--help`             | `oklch(0.7 0.15 50)` | For help text and contextual hints.                  |

---

## 4. Component Anatomy

This section describes the structure and states of the primary, reusable UI components.

### Buttons

Buttons are the primary interactive elements. They have a consistent height, padding, and border-radius.

- **Base Style:** 8px corner radius, 400 font-weight, 14px font-size.
- **Variants:**
    - **Primary (`.btn-primary`):**
        - **Default:** Solid `var(--primary)` background with dark text.
        - **Hover:** Opacity is slightly reduced to 90%.
        - **Disabled:** Opacity is reduced to 50%, and the cursor changes to `not-allowed`.
    - **Secondary (`.btn-secondary`):**
        - **Default:** Transparent background with a `var(--border)` border and `var(--muted-foreground)` text.
        - **Hover:** Background becomes `var(--border)` and text becomes `var(--foreground)`.
        - **Pressed:** A semi-transparent primary color is used for the background and border, with the text color matching the primary color.
    - **Ghost (`.btn-ghost`):**
        - **Default:** Transparent background, no border, and `var(--muted-foreground)` text.
        - **Hover:** Background becomes `var(--border)` and text becomes `var(--foreground)`.
- **Focus State:** All buttons have a consistent focus outline: a 1px solid ring using the `var(--primary)` color.

### Panels

Panels are the main containers for content sections and UI elements.

- **Structure:** A panel is a flex container with an optional header, a main content area, and an optional footer.
- **Styling:**
    - **Background:** `var(--surface)`
    - **Border:** 1px solid `var(--border)`
    - **Radius:** 8px (`rounded-app`)
- **Spacing:**
    - **Header:** 48px tall with 16px horizontal padding.
    - **Content:** 16px padding by default.
    - **Footer:** 8px vertical and 16px horizontal padding.
    - All sections are separated by a 1px `var(--border)` line.

### Form Inputs

Inputs are used for text entry and are designed for clarity and ease of use.

- **Default State:** A `var(--surface)` background with a `var(--border)` border. Text color is `var(--foreground)` and placeholder text uses `var(--muted-foreground)`.
- **Focus State:** When focused, the input displays a 1px ring using a semi-transparent `var(--primary)` color, removing the default browser outline.
- **Structure:** Inputs are often combined with buttons, where they share a border and have their adjacent corners squared off for a unified appearance.
