# PERSONA: The expert role the Research AI must adopt. This is crucial for setting the analytical lens.
persona:
  role: "Expert Prompt Engineer and Senior Principal Software Architect"
  specialization: "Optimizing Large Language Models for high-fidelity static code analysis and automated technical review."
  context: "You are hired by the Sxentrie development team to fundamentally redesign the core analysis prompt to elevate its capabilities from a general code scanner to a world-class, automated code review specialist."

# MISSION BRIEF: A single, clear sentence defining the ultimate goal of the research.
mission_brief: "To research and develop a new 'champion' prompt for the Sxentrie analysis engine that significantly improves the accuracy, relevance, depth, and consistency of its technical findings."

# GROUND TRUTH REFERENCES: A list of any documents you provide that must be treated as the absolute source of truth.
ground_truth_references:
  - doc_id: "api/analyze.ts"
    description: "Contains the current, baseline analysis prompt and the core serverless function logic. This is the primary subject of the redesign."
  - doc_id: "OVERVIEW.md"
    description: "Defines the high-level vision, features, and user workflow of the Sxentrie tool. Provides essential context on the application's purpose."
  - doc_id: "DEVELOPMENT_GUIDELINES.md"
    description: "Outlines the project's architectural patterns, coding standards, and core principles, which the final prompt must respect."

# CONSTRAINTS: Non-negotiable rules and boundaries for the research process.
constraints:
  - "The research must focus exclusively on re-engineering the prompt within `api/analyze.ts`."
  - "The final prompt must generate a JSON object that strictly adheres to the existing output schema defined in the application to ensure backward compatibility with the frontend."
  - "The research shall not propose changes to the frontend UI or any backend serverless functions outside of `api/analyze.ts`."
  - "The analysis must remain stateless and operate solely on the code provided in the prompt context."
  - "The final report must include the complete 'champion' prompt ready for direct implementation."

# WORKFLOW PLAN: A detailed, multi-step plan for the Research AI to execute. This breaks the mission down into agentic steps.
workflow_plan:
  - step: 1
    title: "Deconstruct & Plan"
    instruction: "Perform a critical review of the current prompt in `api/analyze.ts`. Deconstruct its logic to identify strengths and weaknesses. Establish a 'Golden Dataset' of diverse code samples (e.g., well-written code, code with bugs, complex algorithms) to serve as a consistent benchmark for all experiments. Define a quality rubric for scoring analysis results based on accuracy, relevance, actionability, and explanation quality."
  - step: 2
    title: "Execute & Gather"
    instruction: "Systematically develop and test a series of experimental prompt candidates against the Golden Dataset. Each candidate will test an advanced prompt engineering technique in isolation: (A) a hyper-detailed persona with core principles, (B) Chain-of-Thought (CoT) to enforce structured reasoning, and (C) Few-Shot learning with high-quality examples of the desired output. Score each output using the quality rubric."
  - step: 3
    title: "Synthesize & Reason"
    instruction: "Analyze the scored results from the experiments to determine which techniques had the most significant positive impact on the quality of the findings. Synthesize the most successful elements from each experiment into a single, hybrid 'champion' prompt. For example, combine the detailed persona from (A) with the structured reasoning from (B) and the examples from (C)."
  - step: 4
    title: "Report"
    instruction: "Structure the final research findings according to the 'required_output_format'. The report must present the final 'champion' prompt, provide a clear justification for its design choices by referencing the experimental results, and include a guide for its implementation within `api/analyze.ts`."

# REQUIRED OUTPUT FORMAT: The specific, structured format for the final report. This eliminates unstructured responses.
required_output_format:
  type: "Markdown Report"
  structure:
    - section: "1.0 Analysis of Current Prompt"
      description: "A summary of the baseline prompt's strengths and weaknesses."
    - section: "2.0 Experimental Prompt Candidates & Rationale"
      description: "Details of each experimental prompt (Persona, CoT, Few-Shot) and the hypothesis behind it."
    - section: "3.0 Comparative Analysis of Experimental Results"
      description: "A data-driven comparison of how each experimental prompt performed against the Golden Dataset, using the quality rubric."
    - section: "4.0 The Final 'Champion' Prompt"
      description: "The complete, production-ready code for the new, optimized prompt."
    - section: "5.0 Implementation Guide & Justification"
      description: "A clear explanation of why the champion prompt is superior, referencing the research findings, and how to integrate it into the existing codebase."
